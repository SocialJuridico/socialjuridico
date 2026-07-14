import {
  boasVindasPlanoTemplate,
  jurisCreditadoTemplate,
} from "@/lib/emailTemplates";
import { resend } from "@/lib/resend";
import { supabaseAdmin } from "@/lib/supabase";
import { decodeOrderReference } from "@/lib/infinitepay/orderReference";
import { consumeCouponUsage } from "@/lib/coupons/couponServer";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// O webhook da InfinitePay dispara quando o pagamento é aprovado. Ele DEVE
// sempre responder rápido: 200 quando reconhecido/registrado/duplicado, e 400/500
// apenas em falha transitória (para a InfinitePay reenviar). Nunca derruba a
// resposta por venda não-mapeada — nesses casos registra e responde 200.

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function normalizeAmountInCents(value) {
  const raw = String(value ?? "").trim();
  const numeric = Number(raw.replace(",", "."));

  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return raw.includes(".") || raw.includes(",")
    ? Math.round(numeric * 100)
    : Math.round(numeric);
}

function resolveReference(payload) {
  return String(
    payload?.order_nsu ||
      payload?.transaction_nsu ||
      payload?.nsu ||
      payload?.invoice_slug ||
      payload?.id ||
      "",
  ).trim();
}

function resolveEmail(payload) {
  return String(
    payload?.customer?.email ||
      payload?.customer_email ||
      payload?.metadata?.email ||
      "",
  )
    .trim()
    .toLowerCase();
}

// Reconhecimento por VALOR — usado só como fallback para vendas legadas ou de
// links estáticos da loja (sem produto embutido no order_nsu).
function resolveProductByAmount(amountInCents) {
  const plans = {
    1099: { planType: "START", billingCycle: "MONTHLY", jurisAmount: 7, promo: true, expirationDays: 30 },
    3999: { planType: "PRO", billingCycle: "MONTHLY", jurisAmount: 20, promo: true, expirationDays: 30 },
    4099: { planType: "START", billingCycle: "MONTHLY", jurisAmount: 7, promo: false, expirationDays: 30 },
    15000: { planType: "PRO", billingCycle: "MONTHLY", jurisAmount: 20, promo: false, expirationDays: 30 },
    43188: { planType: "START", billingCycle: "ANNUAL", jurisAmount: 7, promo: false, expirationDays: 365 },
    144000: { planType: "PRO", billingCycle: "ANNUAL", jurisAmount: 20, promo: false, expirationDays: 365 },
    4990: { planType: "START", billingCycle: "AVULSO", jurisAmount: 7, promo: false, expirationDays: 30 },
    21000: { planType: "PRO", billingCycle: "AVULSO", jurisAmount: 20, promo: false, expirationDays: 30 },
    // Valores com desconto OAB/RS (10% START / 15% PRO).
    3689: { planType: "START", billingCycle: "MONTHLY", jurisAmount: 7, promo: false, expirationDays: 30 },
    38869: { planType: "START", billingCycle: "ANNUAL", jurisAmount: 7, promo: false, expirationDays: 365 },
    4491: { planType: "START", billingCycle: "AVULSO", jurisAmount: 7, promo: false, expirationDays: 30 },
    12750: { planType: "PRO", billingCycle: "MONTHLY", jurisAmount: 20, promo: false, expirationDays: 30 },
    122400: { planType: "PRO", billingCycle: "ANNUAL", jurisAmount: 20, promo: false, expirationDays: 365 },
    17850: { planType: "PRO", billingCycle: "AVULSO", jurisAmount: 20, promo: false, expirationDays: 30 },
  };

  if (plans[amountInCents]) {
    return { type: "PRO_SUBSCRIPTION", ...plans[amountInCents] };
  }

  const jurisPackages = { 990: 10, 1690: 20, 3990: 50 };
  if (jurisPackages[amountInCents]) {
    return {
      type: "JURIS_PURCHASE",
      planType: null,
      billingCycle: null,
      jurisAmount: jurisPackages[amountInCents],
      promo: false,
      expirationDays: 0,
    };
  }

  return null;
}

// Normaliza o produto embutido no order_nsu para o formato usado em applyProduct.
function productFromReference(decodedProduct) {
  if (!decodedProduct || !decodedProduct.t) return null;
  return {
    type: decodedProduct.t === "JURIS" ? "JURIS_PURCHASE" : "PRO_SUBSCRIPTION",
    planType: decodedProduct.planType || null,
    billingCycle: decodedProduct.billingCycle || null,
    jurisAmount: Number(decodedProduct.jurisAmount || 0),
    promo: Boolean(decodedProduct.promo),
    expirationDays: Number(decodedProduct.expirationDays || 0),
  };
}

async function findLawyer({ userId, email }) {
  let query = supabaseAdmin
    .from("advogados")
    .select("id, name, email, balance, promo_start_used, promo_pro_used");

  if (userId) {
    query = query.eq("id", userId);
  } else if (email) {
    query = query.ilike("email", email);
  } else {
    return null;
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw new Error("Falha ao identificar o comprador da InfinitePay.");
  }
  return data || null;
}

async function findTransaction(reference) {
  const { data, error } = await supabaseAdmin
    .from("transacoes")
    .select("id, status, cupom_id, advogado_id")
    .eq("stripe_session_id", reference)
    .maybeSingle();

  if (error) {
    throw new Error("Falha ao consultar idempotência financeira.");
  }
  return data || null;
}

async function upsertTransaction({
  existing,
  reference,
  lawyerId,
  product,
  amountInCents,
  status,
}) {
  const payload = {
    advogado_id: lawyerId,
    tipo: product?.type || "UNKNOWN_PURCHASE",
    valor: amountInCents / 100,
    moeda: "BRL",
    status,
    juris_amount: product?.jurisAmount || 0,
    stripe_session_id: reference,
  };

  if (existing) {
    const { error } = await supabaseAdmin
      .from("transacoes")
      .update({ status })
      .eq("id", existing.id);
    if (error) throw new Error("Falha ao atualizar a transação InfinitePay.");
    return existing.id;
  }

  const { data, error } = await supabaseAdmin
    .from("transacoes")
    .insert([{ ...payload, created_at: new Date().toISOString() }])
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return null;
    throw new Error("Falha ao registrar o lançamento InfinitePay.");
  }
  return data.id;
}

async function incrementBalance(lawyerId, amount) {
  const rpcResult = await supabaseAdmin.rpc("increment_lawyer_balance", {
    p_lawyer_id: lawyerId,
    p_amount: amount,
  });

  if (!rpcResult.error) {
    return Number(rpcResult.data || 0);
  }

  const missingFunction =
    rpcResult.error.code === "PGRST202" ||
    String(rpcResult.error.message || "")
      .toLowerCase()
      .includes("increment_lawyer_balance");

  if (!missingFunction) {
    throw new Error("Falha ao atualizar o saldo do advogado.");
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("advogados")
    .select("balance")
    .eq("id", lawyerId)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error("Perfil do advogado não localizado.");
  }

  const newBalance = Number(profile.balance || 0) + amount;
  const { error } = await supabaseAdmin
    .from("advogados")
    .update({ balance: newBalance })
    .eq("id", lawyerId);

  if (error) throw new Error("Falha ao atualizar o saldo do advogado.");
  return newBalance;
}

async function applyProduct(lawyer, product) {
  if (product.type === "JURIS_PURCHASE") {
    const newBalance = await incrementBalance(lawyer.id, product.jurisAmount);
    return { newBalance };
  }

  const newBalance = Number(lawyer.balance || 0) + product.jurisAmount;
  const updateData = {
    plan_type: product.planType,
    plan_billing_cycle: product.billingCycle,
    is_premium: true,
    premium_expires_at: new Date(
      Date.now() + product.expirationDays * 24 * 60 * 60 * 1000,
    ).toISOString(),
    balance: newBalance,
    // Pagamento confirmado reativa a assinatura (limpa cancelamento anterior).
    subscription_status: "ACTIVE",
  };

  if (product.promo) {
    updateData[
      product.planType === "PRO" ? "promo_pro_used" : "promo_start_used"
    ] = true;
  }

  const { error } = await supabaseAdmin
    .from("advogados")
    .update(updateData)
    .eq("id", lawyer.id);

  if (error) throw new Error("Falha ao ativar o plano contratado.");
  return { newBalance };
}

async function sendConfirmationEmail(lawyer, product, newBalance) {
  if (!process.env.RESEND_API_KEY || !lawyer.email) return;

  try {
    if (product.type === "JURIS_PURCHASE") {
      await resend.emails.send({
        from: "Social Jurídico <contato@socialjuridico.com.br>",
        to: [lawyer.email],
        subject: "Seus Juris foram creditados",
        html: jurisCreditadoTemplate({
          lawyerName: lawyer.name || "Advogado",
          amount: product.jurisAmount,
          balance: newBalance,
        }),
      });
      return;
    }

    await resend.emails.send({
      from: "Social Jurídico <contato@socialjuridico.com.br>",
      to: [lawyer.email],
      subject: `Bem-vindo ao Plano ${product.planType}`,
      html: boasVindasPlanoTemplate({
        lawyerName: lawyer.name || "Advogado",
        planType: product.planType,
        jurisBonus: product.jurisAmount,
      }),
    });
  } catch (error) {
    console.error("[InfinitePay] Falha não fatal no e-mail:", error);
  }
}

export async function POST(request) {
  let transactionId = null;

  try {
    if (!supabaseAdmin) {
      // Sem banco não há como registrar; 500 força reenvio da InfinitePay.
      return json(
        { success: false, message: "Serviço financeiro indisponível." },
        500,
      );
    }

    const payload = await request.json().catch(() => null);
    const reference = resolveReference(payload);
    const amountInCents = normalizeAmountInCents(
      payload?.amount ?? payload?.paid_amount,
    );

    if (!reference) {
      // Nada a rastrear — responde 200 para não gerar reenvios infinitos.
      console.warn("[InfinitePay] Webhook sem referência:", { amountInCents });
      return json({ success: true, message: "Evento ignorado (sem referência)." });
    }

    const { userId, product: decodedProduct } = decodeOrderReference(reference);
    const email = resolveEmail(payload);

    const lawyer = await findLawyer({ userId, email });
    const existing = await findTransaction(reference);

    // Idempotência: já processado.
    if (existing?.status === "succeeded") {
      return json({
        success: true,
        message: "Evento já processado anteriormente.",
        duplicate: true,
      });
    }

    const product =
      productFromReference(decodedProduct) ||
      resolveProductByAmount(amountInCents);

    // Venda não-atribuível (link estático da loja / valor desconhecido). Registra
    // para revisão manual quando possível e SEMPRE responde 200.
    if (!lawyer || !product) {
      if (lawyer) {
        transactionId = await upsertTransaction({
          existing,
          reference,
          lawyerId: lawyer.id,
          product,
          amountInCents,
          status: "pending_manual_review",
        });
      }
      console.warn("[InfinitePay] Venda para revisão manual:", {
        referenceSuffix: reference.slice(-6),
        amountInCents,
        hasLawyer: Boolean(lawyer),
        hasProduct: Boolean(product),
      });
      return json({
        success: true,
        message: "Pagamento registrado para revisão manual.",
        reviewRequired: true,
      });
    }

    // Marca em processamento (mantém a transação pendente criada no checkout).
    transactionId = await upsertTransaction({
      existing,
      reference,
      lawyerId: lawyer.id,
      product,
      amountInCents,
      status: "processing",
    });

    const { newBalance } = await applyProduct(lawyer, product);
    await upsertTransaction({
      existing: transactionId ? { id: transactionId } : existing,
      reference,
      lawyerId: lawyer.id,
      product,
      amountInCents,
      status: "succeeded",
    });

    // Consome o cupom reservado (se houver) — não fatal.
    const couponId = existing?.cupom_id || null;
    if (couponId) {
      try {
        await consumeCouponUsage(supabaseAdmin, {
          couponId,
          userId: lawyer.id,
          checkoutReference: reference,
        });
      } catch (couponError) {
        console.error("[InfinitePay] Falha ao consumir cupom:", couponError);
      }
    }

    await sendConfirmationEmail(lawyer, product, newBalance);

    return json({
      success: true,
      message:
        product.type === "JURIS_PURCHASE"
          ? `${product.jurisAmount} Juris creditados.`
          : `Plano ${product.planType} ativado.`,
      provider: "INFINITEPAY",
    });
  } catch (error) {
    if (transactionId) {
      await supabaseAdmin
        .from("transacoes")
        .update({ status: "error_updating_balance" })
        .eq("id", transactionId)
        .then(() => {})
        .catch(() => {});
    }

    // Falha transitória — 400 faz a InfinitePay reenviar o webhook.
    console.error("[InfinitePay][Webhook] Erro:", error);
    return json(
      {
        success: false,
        message: "Falha temporária no processamento do pagamento.",
      },
      400,
    );
  }
}
