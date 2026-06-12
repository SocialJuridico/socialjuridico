import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TYPES = new Set([
  "JURIS_PURCHASE",
  "PRO_SUBSCRIPTION",
  "ADDON_PURCHASE",
]);

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function validateOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";

  try {
    if (!host || new URL(origin).host !== host) {
      return json(
        { success: false, message: "Origem da requisição não autorizada." },
        403,
      );
    }
  } catch {
    return json(
      { success: false, message: "Origem da requisição inválida." },
      403,
    );
  }

  return null;
}

function normalizePaymentType(value) {
  const type = String(value || "JURIS_PURCHASE").toUpperCase();
  return VALID_TYPES.has(type) ? type : null;
}

function resolveJurisAmount(priceId, metadata) {
  const explicit = Number(metadata?.jurisAmount || metadata?.juris_amount || 0);

  if (Number.isFinite(explicit) && explicit > 0) {
    return Math.trunc(explicit);
  }

  const priceMap = {
    [process.env.PRICE_JURIS_10 || process.env.NEXT_PUBLIC_PRICE_JURIS_10]: 10,
    [process.env.PRICE_JURIS_20 || process.env.NEXT_PUBLIC_PRICE_JURIS_20]: 20,
    [process.env.PRICE_JURIS_50 || process.env.NEXT_PUBLIC_PRICE_JURIS_50]: 50,
  };

  return Number(priceMap[priceId] || 0);
}

async function findExistingTransaction(paymentIntentId) {
  const { data, error } = await supabaseAdmin
    .from("transacoes")
    .select("id, status")
    .eq("stripe_session_id", paymentIntentId)
    .maybeSingle();

  if (error) {
    throw new Error("Falha ao verificar a idempotência da transação.");
  }

  return data || null;
}

async function reserveTransaction({
  userId,
  type,
  amount,
  currency,
  jurisAmount,
  paymentIntentId,
  couponId,
}) {
  const { data, error } = await supabaseAdmin
    .from("transacoes")
    .insert([
      {
        advogado_id: userId,
        tipo: type,
        valor: amount,
        moeda: currency,
        status: "processing",
        juris_amount: jurisAmount,
        stripe_session_id: paymentIntentId,
        cupom_id: couponId,
        created_at: new Date().toISOString(),
      },
    ])
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { duplicate: true, id: null };
    }
    throw new Error("Não foi possível reservar o lançamento financeiro.");
  }

  return { duplicate: false, id: data.id };
}

async function updateTransactionStatus(transactionId, status) {
  const { error } = await supabaseAdmin
    .from("transacoes")
    .update({ status })
    .eq("id", transactionId);

  if (error) {
    console.error(
      "[ConfirmPayment] Falha ao atualizar status financeiro:",
      error,
    );
  }
}

async function registerCouponUsage(couponId, userId, paymentIntentId) {
  if (!couponId) return;

  const { error } = await supabaseAdmin.from("cupom_usos").insert([
    {
      cupom_id: couponId,
      advogado_id: userId,
      checkout_session_id: paymentIntentId,
      pago_em: new Date().toISOString(),
    },
  ]);

  if (error && error.code !== "23505") {
    console.error("[ConfirmPayment] Falha ao registrar cupom:", error);
  }
}

async function applyPlan(userId, metadata) {
  const planType =
    String(metadata?.planType || "PRO").toUpperCase() === "START"
      ? "START"
      : "PRO";
  const billingCycle =
    String(metadata?.billingCycle || "MONTHLY").toUpperCase() === "ANNUAL"
      ? "ANNUAL"
      : "MONTHLY";
  const jurisBonus = planType === "PRO" ? 20 : 7;

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("advogados")
    .select("balance")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error("Perfil do advogado não localizado.");
  }

  const expirationDays = billingCycle === "ANNUAL" ? 366 : 31;
  const { error } = await supabaseAdmin
    .from("advogados")
    .update({
      is_premium: true,
      plan_type: planType,
      plan_billing_cycle: billingCycle,
      premium_expires_at: new Date(
        Date.now() + expirationDays * 24 * 60 * 60 * 1000,
      ).toISOString(),
      uso_redator_ia: 0,
      uso_triagem: 0,
      uso_agenda: 0,
      balance: Number(profile.balance || 0) + jurisBonus,
    })
    .eq("id", userId);

  if (error) {
    throw new Error("Falha ao ativar o plano contratado.");
  }

  return {
    jurisAmount: jurisBonus,
    response: {
      isPro: planType === "PRO",
      planType,
      billingCycle,
      message: `Plano ${planType} ativado com sucesso.`,
    },
  };
}

async function applyAddon(userId, metadata) {
  const addonMap = {
    EXTRA_DOCS: {
      field: "extra_storage_mb",
      amount: 1024,
      label: "1GB de armazenamento",
    },
    EXTRA_IA: {
      field: "extra_redator_ia",
      amount: 10,
      label: "10 gerações de IA",
    },
    EXTRA_TRIAGEM: {
      field: "extra_triagem",
      amount: 5,
      label: "5 diagnósticos de triagem",
    },
  };

  const addon = addonMap[String(metadata?.addOnType || "").toUpperCase()];

  if (!addon) {
    throw new Error("Expansão de produto não reconhecida.");
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("advogados")
    .select(addon.field)
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error("Perfil do advogado não localizado.");
  }

  const { error } = await supabaseAdmin
    .from("advogados")
    .update({
      [addon.field]: Number(profile[addon.field] || 0) + addon.amount,
    })
    .eq("id", userId);

  if (error) {
    throw new Error("Falha ao ativar a expansão contratada.");
  }

  return {
    jurisAmount: 0,
    response: {
      message: `Expansão de ${addon.label} ativada com sucesso.`,
    },
  };
}

async function applyJuris(userId, jurisAmount) {
  if (!Number.isFinite(jurisAmount) || jurisAmount <= 0) {
    throw new Error("Pacote de Juris não reconhecido.");
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("advogados")
    .select("balance")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error("Perfil do advogado não localizado.");
  }

  const newBalance = Number(profile.balance || 0) + jurisAmount;
  const { error } = await supabaseAdmin
    .from("advogados")
    .update({ balance: newBalance })
    .eq("id", userId);

  if (error) {
    throw new Error("Falha ao creditar os Juris adquiridos.");
  }

  return {
    jurisAmount,
    response: {
      jurisAmount,
      newBalance,
      message: `${jurisAmount} Juris adicionados com sucesso.`,
    },
  };
}

export async function POST(request) {
  let transactionId = null;

  try {
    const originResponse = validateOrigin(request);
    if (originResponse) return originResponse;

    if (!supabaseAdmin || !process.env.STRIPE_SECRET_KEY) {
      return json(
        { success: false, message: "Serviço de pagamento indisponível." },
        503,
      );
    }

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return json({ success: false, message: "Não autorizado." }, 401);
    }

    const { data: profileOabCheck } = await supabaseAdmin
      .from("advogados")
      .select("oab_verification_status")
      .eq("id", user.id)
      .maybeSingle();

    if (profileOabCheck?.oab_verification_status === "ERROR") {
      return json(
        {
          success: false,
          message: "Acesso restrito devido a pendências na OAB.",
        },
        403,
      );
    }

    const body = await request.json().catch(() => null);
    const paymentIntentId = String(body?.paymentIntentId || "").trim();

    if (!paymentIntentId.startsWith("pi_")) {
      return json(
        {
          success: false,
          message:
            "Identificador de pagamento inválido. SetupIntent não comprova cobrança.",
        },
        400,
      );
    }

    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (intent.status !== "succeeded") {
      return json(
        {
          success: false,
          message: `Pagamento ainda não confirmado. Status: ${intent.status}.`,
        },
        409,
      );
    }

    if (intent.metadata?.userId !== user.id) {
      return json(
        {
          success: false,
          message: "A transação não pertence ao usuário autenticado.",
        },
        403,
      );
    }

    const amountReceived = Number(intent.amount_received || intent.amount || 0);

    if (amountReceived <= 0) {
      return json(
        {
          success: false,
          message: "O Stripe não confirmou um valor cobrado para esta transação.",
        },
        409,
      );
    }

    const existing = await findExistingTransaction(paymentIntentId);

    if (existing?.status === "succeeded") {
      return json({
        success: true,
        message: "Benefício já aplicado anteriormente.",
        alreadyCredited: true,
      });
    }

    if (existing?.status === "processing") {
      return json(
        {
          success: false,
          message: "Este pagamento já está sendo processado.",
        },
        409,
      );
    }

    const type = normalizePaymentType(intent.metadata?.type);

    if (!type) {
      return json(
        { success: false, message: "Tipo de produto não reconhecido." },
        400,
      );
    }

    const couponId =
      intent.metadata?.cupomId && intent.metadata.cupomId !== "null"
        ? intent.metadata.cupomId
        : null;
    const priceId = intent.metadata?.priceId;
    const plannedJurisAmount =
      type === "PRO_SUBSCRIPTION"
        ? String(intent.metadata?.planType || "PRO").toUpperCase() === "START"
          ? 7
          : 20
        : type === "JURIS_PURCHASE"
          ? resolveJurisAmount(priceId, intent.metadata)
          : 0;

    const reservation = await reserveTransaction({
      userId: user.id,
      type,
      amount: amountReceived / 100,
      currency: String(intent.currency || "BRL").toUpperCase(),
      jurisAmount: plannedJurisAmount,
      paymentIntentId,
      couponId,
    });

    if (reservation.duplicate) {
      return json({
        success: true,
        message: "Pagamento já registrado anteriormente.",
        alreadyCredited: true,
      });
    }

    transactionId = reservation.id;

    let applied;

    if (type === "PRO_SUBSCRIPTION") {
      applied = await applyPlan(user.id, intent.metadata);
    } else if (type === "ADDON_PURCHASE") {
      applied = await applyAddon(user.id, intent.metadata);
    } else {
      applied = await applyJuris(user.id, plannedJurisAmount);
    }

    await updateTransactionStatus(transactionId, "succeeded");
    await registerCouponUsage(couponId, user.id, paymentIntentId);

    return json({
      success: true,
      ...applied.response,
    });
  } catch (error) {
    if (transactionId) {
      await updateTransactionStatus(transactionId, "error_updating_balance");
    }

    console.error("[ConfirmPayment][POST] Erro:", error);
    return json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível confirmar o pagamento.",
      },
      500,
    );
  }
}
