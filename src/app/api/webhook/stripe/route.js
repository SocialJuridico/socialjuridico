import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { resend } from "@/lib/resend";
import { novaVendaAdminTemplate } from "@/lib/emailTemplates";

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// ═══════════════════════════════════════════════════════════════
// MAPEAMENTO ROBUSTO DE PRICE IDs → QUANTIDADE DE JURIS
// Usa múltiplas estratégias para garantir que o crédito seja aplicado.
// ═══════════════════════════════════════════════════════════════

/**
 * Resolve a quantidade de Juris a partir do Price ID.
 * Tenta env vars (server-side primeiro, depois NEXT_PUBLIC), e
 * se nenhuma bater, usa a API do Stripe para buscar o nome do preço.
 */
async function resolveJurisAmount(priceId, amountTotalCents) {
  // ── Estratégia 1: Comparar com variáveis de ambiente ──
  // Prioriza variáveis server-only (PRICE_JURIS_*) e cai nas NEXT_PUBLIC como fallback
  const priceMap = {
    10: process.env.PRICE_JURIS_10 || process.env.NEXT_PUBLIC_PRICE_JURIS_10,
    20: process.env.PRICE_JURIS_20 || process.env.NEXT_PUBLIC_PRICE_JURIS_20,
    50: process.env.PRICE_JURIS_50 || process.env.NEXT_PUBLIC_PRICE_JURIS_50,
  };

  for (const [amount, envPriceId] of Object.entries(priceMap)) {
    if (envPriceId && priceId === envPriceId) {
      console.log(`✅ [resolveJuris] Matched via env var: ${amount} Juris (priceId: ${priceId})`);
      return parseInt(amount);
    }
  }

  console.warn(`⚠️ [resolveJuris] PriceId "${priceId}" não bateu com nenhuma env var. Tentando Stripe API...`);

  // ── Estratégia 2: Buscar informações do preço na API do Stripe ──
  try {
    const stripePrice = await stripe.prices.retrieve(priceId, {
      expand: ['product'],
    });
    
    const productName = stripePrice.product?.name?.toLowerCase() || '';
    const priceNickname = (stripePrice.nickname || '').toLowerCase();
    const lookupKey = (stripePrice.lookup_key || '').toLowerCase();
    
    console.log(`🔎 [resolveJuris] Stripe Price info: product="${stripePrice.product?.name}", nickname="${stripePrice.nickname}", amount=${stripePrice.unit_amount}`);

    // Tentar extrair do nome do produto ou nickname
    for (const field of [productName, priceNickname, lookupKey]) {
      if (field.includes('50')) return 50;
      if (field.includes('20')) return 20;
      if (field.includes('10')) return 10;
    }
  } catch (stripeErr) {
    console.error(`❌ [resolveJuris] Erro ao buscar preço no Stripe:`, stripeErr.message);
  }

  // ── Estratégia 3 (último recurso): Inferir pelo valor pago ──
  // Usa o amount_total em centavos para tentar deduzir o pacote
  // Preços reais: 10 Juris = R$9.90, 20 Juris = R$16.90, 50 Juris = R$39.90
  if (amountTotalCents > 0) {
    const amountBRL = amountTotalCents / 100;
    console.warn(`⚠️ [resolveJuris] Tentando inferir Juris pelo valor pago: R$${amountBRL.toFixed(2)}`);
    
    if (amountBRL <= 13.00) return 10;    // R$9.90 → 10 Juris
    if (amountBRL <= 28.00) return 20;    // R$16.90 → 20 Juris
    if (amountBRL <= 60.00) return 50;    // R$39.90 → 50 Juris
    // Acima de R$60 pode ser PRO ou pacote personalizado
    console.warn(`⚠️ [resolveJuris] Valor R$${amountBRL.toFixed(2)} não se encaixa nos pacotes conhecidos`);
  }

  return 0;
}

export async function POST(request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    console.error(`❌ Webhook Error: ${err.message}`);
    return NextResponse.json(
      { message: `Webhook Error: ${err.message}` },
      { status: 400 },
    );
  }

  console.log(`📩 [Webhook] Evento recebido: ${event.type} (id: ${event.id})`);

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object;
      await handleCheckoutCompleted(session);
      break;

    case "payment_intent.succeeded":
      const paymentIntent = event.data.object;
      await handlePaymentIntentSucceeded(paymentIntent);
      break;

    case "customer.subscription.deleted":
      const subscription = event.data.object;
      await handleSubscriptionDeleted(subscription);
      break;

    default:
      console.log(`ℹ️ [Webhook] Evento não tratado: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session) {
  const userId = session.metadata?.userId;
  const type = session.metadata?.type;
  const cupomId = session.metadata?.cupomId;

  console.log(`🛒 [handleCheckout] Sessão ${session.id} | tipo: ${type} | userId: ${userId} | amount: ${session.amount_total} | metadata:`, JSON.stringify(session.metadata));

  if (!userId) {
    console.error(`❌ [handleCheckout] ERRO CRÍTICO: userId ausente nos metadata da sessão ${session.id}. Email: ${session.customer_email || session.customer_details?.email}`);
    // Tentar recuperar pelo email
    const email = session.customer_email || session.customer_details?.email;
    if (email) {
      const { data: adv } = await supabaseAdmin
        .from("advogados")
        .select("id")
        .eq("email", email)
        .single();
      if (adv) {
        console.log(`🔧 [handleCheckout] Recuperado userId ${adv.id} via email ${email}`);
        // Continuar processando com o ID encontrado
        await processCheckout(session, adv.id, type || 'JURIS_PURCHASE', cupomId);
        return;
      }
    }
    console.error(`❌ [handleCheckout] Impossível identificar o advogado. Sessão ${session.id} será ignorada.`);
    return;
  }

  await processCheckout(session, userId, type, cupomId);
}

async function processCheckout(session, userId, type, cupomId) {
  // Registrar uso do cupom se existir
  if (cupomId && cupomId !== 'null') {
    console.log(`🎟️ Registrando uso do cupom ${cupomId} para o usuário ${userId}`);
    const { error: cupomError } = await supabaseAdmin
      .from('cupom_usos')
      .insert([{
        cupom_id: cupomId,
        advogado_id: userId,
        checkout_session_id: session.id
      }]);
    if (cupomError) {
      console.error(`⚠️ Erro ao registrar cupom (não-fatal):`, cupomError.message);
    }
  }

  if (type === "JURIS_PURCHASE") {
    await handleJurisPurchase(session, userId, cupomId);
  } else if (type === "PRO_SUBSCRIPTION") {
    await handleProSubscription(session, userId, cupomId);
  } else {
    console.warn(`⚠️ [processCheckout] Tipo desconhecido: "${type}". Tentando tratar como JURIS_PURCHASE.`);
    await handleJurisPurchase(session, userId, cupomId);
  }
}

async function handleJurisPurchase(session, userId, cupomId) {
  // ── Obter o Price ID da sessão ──
  // O metadata.priceId é a fonte mais confiável
  let priceId = session.metadata?.priceId;

  // Se não tiver no metadata, buscar via API do Stripe
  if (!priceId) {
    console.warn(`⚠️ [JURIS] priceId ausente nos metadata. Buscando via Stripe API...`);
    try {
      const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['line_items.data.price'],
      });
      priceId = fullSession.line_items?.data?.[0]?.price?.id;
      console.log(`🔎 [JURIS] PriceId recuperado via API: ${priceId}`);
    } catch (err) {
      console.error(`❌ [JURIS] Falha ao buscar line_items via Stripe API:`, err.message);
    }
  }

  // ── Resolver quantidade de Juris ──
  const jurisAmount = await resolveJurisAmount(priceId, session.amount_total || 0);

  if (jurisAmount <= 0) {
    console.error(`❌❌❌ [JURIS] FALHA CRÍTICA: jurisAmount = 0!`);
    console.error(`    PriceId: ${priceId}`);
    console.error(`    Amount total (centavos): ${session.amount_total}`);
    console.error(`    Session ID: ${session.id}`);
    console.error(`    User ID: ${userId}`);
    console.error(`    ENV PRICE_JURIS_10: ${process.env.PRICE_JURIS_10 || process.env.NEXT_PUBLIC_PRICE_JURIS_10 || 'NÃO DEFINIDO'}`);
    console.error(`    ENV PRICE_JURIS_20: ${process.env.PRICE_JURIS_20 || process.env.NEXT_PUBLIC_PRICE_JURIS_20 || 'NÃO DEFINIDO'}`);
    console.error(`    ENV PRICE_JURIS_50: ${process.env.PRICE_JURIS_50 || process.env.NEXT_PUBLIC_PRICE_JURIS_50 || 'NÃO DEFINIDO'}`);
    
    // MESMO ASSIM, registrar a transação como pendente para análise manual
    await supabaseAdmin.from('transacoes').insert([{
      advogado_id: userId,
      tipo: 'JURIS_PURCHASE',
      valor: (session.amount_total || 0) / 100,
      moeda: session.currency || 'BRL',
      status: 'pending_manual_review',
      juris_amount: 0,
      stripe_session_id: session.id,
      cupom_id: cupomId || null,
      created_at: new Date().toISOString()
    }]);
    return;
  }

  console.log(`💰 Adicionando ${jurisAmount} Juris para o usuário ${userId}`);

  // Buscar saldo atual
  const { data: profile, error: fetchError } = await supabaseAdmin
    .from("advogados")
    .select("balance")
    .eq("id", userId)
    .single();

  if (fetchError) {
    console.error(`❌ Erro ao buscar saldo do perfil ${userId}:`, fetchError);
    // Tentar com balance = 0 se o perfil não foi encontrado
  }

  const currentBalance = profile?.balance || 0;
  const newBalance = currentBalance + jurisAmount;

  console.log(`📈 Atualizando saldo de ${currentBalance} para ${newBalance} (userId: ${userId})`);

  const { error: updateError } = await supabaseAdmin
    .from("advogados")
    .update({ balance: newBalance })
    .eq("id", userId);

  if (updateError) {
    console.error(`❌ ERRO FATAL ao atualizar saldo do perfil ${userId}:`, updateError);
    // Registrar transação com status de erro para rastreamento
    await supabaseAdmin.from('transacoes').insert([{
      advogado_id: userId,
      tipo: 'JURIS_PURCHASE',
      valor: (session.amount_total || 0) / 100,
      moeda: session.currency || 'BRL',
      status: 'error_updating_balance',
      juris_amount: jurisAmount,
      stripe_session_id: session.id,
      cupom_id: cupomId || null,
      created_at: new Date().toISOString()
    }]);
  } else {
    console.log(`✅ Saldo atualizado com sucesso: ${currentBalance} → ${newBalance} (userId: ${userId})`);

    // Registrar log de transação com sucesso
    const { error: transError } = await supabaseAdmin.from('transacoes').insert([{
      advogado_id: userId,
      tipo: 'JURIS_PURCHASE',
      valor: (session.amount_total || 0) / 100,
      moeda: session.currency || 'BRL',
      status: 'succeeded',
      juris_amount: jurisAmount,
      stripe_session_id: session.id,
      cupom_id: cupomId || null,
      created_at: new Date().toISOString()
    }]);

    if (transError) {
      console.error(`⚠️ Erro ao registrar transação (crédito já foi aplicado):`, transError.message);
    }

    // 📧 NOTIFICAR ADMINS DA VENDA
    const advEmail = session.customer_email || session.customer_details?.email || '';
    await notifyAdminsOfSale({
      tipoVenda: 'JURIS_PURCHASE',
      advogadoId: userId,
      advogadoEmail: advEmail,
      valor: ((session.amount_total || 0) / 100).toFixed(2),
      jurisAmount,
    });
  }
}

async function handleProSubscription(session, userId, cupomId) {
  // Buscar saldo atual para somar os 20 Juris de bônus
  const { data: advProfile, error: fetchError } = await supabaseAdmin
    .from("advogados")
    .select("balance")
    .eq("id", userId)
    .single();

  if (fetchError) {
    console.error(`❌ [PRO] Erro ao buscar perfil ${userId}:`, fetchError);
  }

  const currentBalance = advProfile?.balance || 0;
  const newBalance = currentBalance + 20;

  const { error: updateError } = await supabaseAdmin
    .from("advogados")
    .update({
      is_premium: true,
      premium_until: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      balance: newBalance,
    })
    .eq("id", userId);

  if (updateError) {
    console.error(`❌ [PRO] ERRO FATAL ao ativar PRO para ${userId}:`, updateError);
  } else {
    console.log(`✅ PRO ativado. +20 Juris (${currentBalance} → ${newBalance}) para ${userId}`);
  }

  // Registrar log de transação Real para PRO
  const { error: transError } = await supabaseAdmin.from('transacoes').insert([{
    advogado_id: userId,
    tipo: 'PRO_SUBSCRIPTION',
    valor: (session.amount_total || 0) / 100,
    moeda: session.currency || 'BRL',
    status: updateError ? 'error_updating_balance' : 'succeeded',
    juris_amount: 20,
    stripe_session_id: session.id,
    cupom_id: cupomId || null,
    created_at: new Date().toISOString()
  }]);

  if (transError) {
    console.error(`⚠️ [PRO] Erro ao registrar transação:`, transError.message);
  }

  // 📧 NOTIFICAR ADMINS DA VENDA PRO
  if (!updateError) {
    const advEmail = session.customer_email || session.customer_details?.email || '';
    await notifyAdminsOfSale({
      tipoVenda: 'PRO_SUBSCRIPTION',
      advogadoId: userId,
      advogadoEmail: advEmail,
      valor: ((session.amount_total || 0) / 100).toFixed(2),
      jurisAmount: 20,
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Notificar todos os admins sobre uma venda
// ═══════════════════════════════════════════════════════════════
async function notifyAdminsOfSale({ tipoVenda, advogadoId, advogadoEmail, valor, jurisAmount }) {
  try {
    // Buscar nome do advogado comprador
    const { data: advogado } = await supabaseAdmin
      .from("advogados")
      .select("name, email")
      .eq("id", advogadoId)
      .single();

    const advNome = advogado?.name || 'Advogado';
    const advMail = advogado?.email || advogadoEmail;

    // Buscar todos os admins
    const { data: admins, error: adminError } = await supabaseAdmin
      .from("admins")
      .select("name, email")
      .not("email", "is", null);

    if (adminError || !admins?.length) {
      console.warn("⚠️ [notifyAdmins] Nenhum admin encontrado para notificar");
      return;
    }

    console.log(`📧 Notificando ${admins.length} admin(s) sobre venda de ${tipoVenda}...`);

    const emailPayloads = admins.filter(a => a.email).map(admin => ({
      from: 'Social Jurídico <contato@socialjuridico.com.br>',
      to: [admin.email],
      subject: tipoVenda === 'PRO_SUBSCRIPTION'
        ? `👑 Nova venda: Plano PRO — R$ ${valor}`
        : `💰 Nova venda: ${jurisAmount} Juris — R$ ${valor}`,
      html: novaVendaAdminTemplate({
        adminName: admin.name || 'Admin',
        tipoVenda,
        advogadoNome: advNome,
        advogadoEmail: advMail,
        valor,
        jurisAmount,
      }),
    }));

    if (emailPayloads.length > 0) {
      await resend.batch.send(emailPayloads);
      console.log(`✅ Email de venda enviado para ${emailPayloads.length} admin(s)`);
    }
  } catch (err) {
    console.error("⚠️ Erro ao notificar admins de venda (não-fatal):", err.message);
  }
}

async function handleSubscriptionDeleted(subscription) {
  // Se a assinatura for cancelada no Stripe, removemos o premium aqui
  try {
    const customer = await stripe.customers.retrieve(subscription.customer);
    const email = customer.email;

    if (email) {
      const { error } = await supabaseAdmin
        .from("advogados")
        .update({ is_premium: false })
        .eq("email", email);
      
      if (error) {
        console.error(`❌ [SubDeleted] Erro ao desativar PRO para ${email}:`, error);
      } else {
        console.log(`✅ [SubDeleted] PRO desativado para ${email}`);
      }
    }
  } catch (err) {
    console.error(`❌ [SubDeleted] Erro ao processar cancelamento:`, err.message);
  }
}

/**
 * Trata pagamentos vindos do Checkout Transparente (Stripe Elements / PaymentIntent).
 * Reutiliza a mesma lógica do processCheckout para manter consistência.
 */
async function handlePaymentIntentSucceeded(paymentIntent) {
  const userId = paymentIntent.metadata?.userId;
  const type = paymentIntent.metadata?.type;
  const cupomId = paymentIntent.metadata?.cupomId;
  const priceId = paymentIntent.metadata?.priceId;

  console.log(`💳 [PaymentIntent] ${paymentIntent.id} | tipo: ${type} | userId: ${userId}`);

  if (!userId || !type) {
    console.warn(`⚠️ [PaymentIntent] Ignorando: metadata incompleto (userId: ${userId}, type: ${type})`);
    return;
  }

  // Verificar se já foi processado via checkout.session.completed (evitar crédito duplo)
  const { data: existingTx } = await supabaseAdmin
    .from("transacoes")
    .select("id")
    .eq("advogado_id", userId)
    .eq("stripe_session_id", paymentIntent.id)
    .maybeSingle();

  if (existingTx) {
    console.log(`ℹ️ [PaymentIntent] Já processado anteriormente (tx: ${existingTx.id}). Pulando.`);
    return;
  }

  // Montar objeto compatível com processCheckout
  const sessionLike = {
    id: paymentIntent.id,
    amount_total: paymentIntent.amount,
    currency: paymentIntent.currency,
    customer_email: paymentIntent.receipt_email,
    customer_details: { email: paymentIntent.receipt_email },
    metadata: paymentIntent.metadata,
  };

  await processCheckout(sessionLike, userId, type, cupomId);
}

