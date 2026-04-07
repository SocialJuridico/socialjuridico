import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

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

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object;
      await handleCheckoutCompleted(session);
      break;

    case "customer.subscription.deleted":
      const subscription = event.data.object;
      await handleSubscriptionDeleted(subscription);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session) {
  const userId = session.metadata.userId;
  const type = session.metadata.type;
  const cupomId = session.metadata.cupomId;

  // Registrar uso do cupom se existir
  if (cupomId) {
    console.log(`🎟️ Registrando uso do cupom ${cupomId} para o usuário ${userId}`);
    await supabaseAdmin
      .from('cupom_usos')
      .insert([{
        cupom_id: cupomId,
        advogado_id: userId,
        checkout_session_id: session.id
      }]);
  }

  if (type === "JURIS_PURCHASE") {
    // Definir quantidade de Juris baseada no Price ID
    let jurisAmount = 0;
    const priceId =
      session.line_items?.data[0]?.price?.id || session.metadata.priceId;

    // Mapeamento (deve bater com o .env)
    if (priceId === process.env.NEXT_PUBLIC_PRICE_JURIS_10) jurisAmount = 10;
    else if (priceId === process.env.NEXT_PUBLIC_PRICE_JURIS_20)
      jurisAmount = 20;
    else if (priceId === process.env.NEXT_PUBLIC_PRICE_JURIS_50)
      jurisAmount = 50;

    if (jurisAmount > 0) {
      console.log(
        `💰 Adicionando ${jurisAmount} Juris para o usuário ${userId}`,
      );

      // Buscar saldo atual
      const { data: profile, error: fetchError } = await supabaseAdmin
        .from("advogados")
        .select("balance")
        .eq("id", userId)
        .single();

      if (fetchError) {
        console.error(`❌ Erro ao buscar saldo do perfil ${userId}:`, fetchError);
      }

      const currentBalance = profile?.balance || 0;
      const newBalance = currentBalance + jurisAmount;

      console.log(`📈 Atualizando saldo de ${currentBalance} para ${newBalance} (id: ${userId})`);

      const { error: updateError } = await supabaseAdmin
        .from("advogados")
        .update({ balance: newBalance })
        .eq("id", userId);

      if (updateError) {
        console.error(`❌ Erro FATAL ao atualizar saldo do perfil ${userId}:`, updateError);
        // Não jogamos erro para não dar Loop no Stripe se for algo intermitente, 
        // mas o log acima vai nos ajudar no terminal.
      } else {
        console.log(`✅ Saldo atualizado com sucesso para o usuário ${userId}`);
      }

      // Registrar log de transação Real
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
        console.error(`❌ Erro ao registrar transação no BD para ${userId}:`, transError);
      }
    }
  } else if (type === "PRO_SUBSCRIPTION") {
    // ⚠️ SEGURANÇA: Não logar user IDs

    // Buscar saldo atual para somar os 20 Juris de bônus
    const { data: advProfile } = await supabaseAdmin
      .from("advogados")
      .select("balance")
      .eq("id", userId)
      .single();

    const newBalance = (advProfile?.balance || 0) + 20;

    await supabaseAdmin
      .from("advogados")
      .update({
        is_premium: true,
        premium_until: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        balance: newBalance,
      })
      .eq("id", userId);

    // Registrar log de transação Real para PRO
    await supabaseAdmin.from('transacoes').insert([{
      advogado_id: userId,
      tipo: 'PRO_SUBSCRIPTION',
      valor: (session.amount_total || 0) / 100,
      moeda: session.currency || 'BRL',
      status: 'succeeded',
      juris_amount: 20, // Bônus do plano
      stripe_session_id: session.id,
      cupom_id: cupomId || null,
      created_at: new Date().toISOString()
    }]);

    console.log(
      `✅ PRO ativado. +20 Juris (novo saldo: ${newBalance}) para ${userId}`,
    );
  }
}

async function handleSubscriptionDeleted(subscription) {
  // Se a assinatura for cancelada no Stripe, removemos o premium aqui
  const customer = await stripe.customers.retrieve(subscription.customer);
  const email = customer.email;

  if (email) {
    await supabaseAdmin
      .from("advogados")
      .update({ is_premium: false })
      .eq("email", email);
  }
}
