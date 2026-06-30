import {
  boasVindasPlanoTemplate,
  jurisCreditadoTemplate,
} from "@/lib/emailTemplates";
import { resend } from "@/lib/resend";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ""),
  );
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
      payload?.id ||
      "",
  ).trim();
}

function resolveIdentity(payload, reference) {
  const email = String(
    payload?.customer?.email ||
      payload?.customer_email ||
      payload?.metadata?.email ||
      "",
  )
    .trim()
    .toLowerCase();

  const userMatch = reference.match(
    /^sj_([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})_/i,
  );

  if (userMatch && isValidUuid(userMatch[1])) {
    return { userId: userMatch[1], email };
  }

  if (!email && reference.startsWith("sj_")) {
    const parts = reference.split("_");
    const legacyEmail = parts.slice(1, -1).join("_").trim().toLowerCase();
    return { userId: null, email: legacyEmail };
  }

  return { userId: null, email };
}

function resolveProduct(amountInCents) {
  // START - 1º mês promocional (R$ 40,99 - R$ 30,00 = R$ 10,99)
  if (amountInCents === 1099) {
    return {
      type: "PRO_SUBSCRIPTION",
      planType: "START",
      billingCycle: "MONTHLY",
      jurisAmount: 7,
      promo: true,
      expirationDays: 30,
    };
  }

  // PRO - 1º mês promocional (R$ 150,00 - R$ 110,01 = R$ 39,99)
  if (amountInCents === 3999) {
    return {
      type: "PRO_SUBSCRIPTION",
      planType: "PRO",
      billingCycle: "MONTHLY",
      jurisAmount: 20,
      promo: true,
      expirationDays: 30,
    };
  }

  // START - mensal recorrente (R$ 40,99)
  if (amountInCents === 4099) {
    return {
      type: "PRO_SUBSCRIPTION",
      planType: "START",
      billingCycle: "MONTHLY",
      jurisAmount: 7,
      promo: false,
      expirationDays: 30,
    };
  }

  // PRO - mensal recorrente, 2º mês em diante (R$ 150,00)
  if (amountInCents === 15000) {
    return {
      type: "PRO_SUBSCRIPTION",
      planType: "PRO",
      billingCycle: "MONTHLY",
      jurisAmount: 20,
      promo: false,
      expirationDays: 30,
    };
  }

  // START - anual (R$ 431,88)
  if (amountInCents === 43188) {
    return {
      type: "PRO_SUBSCRIPTION",
      planType: "START",
      billingCycle: "ANNUAL",
      jurisAmount: 7,
      promo: false,
      expirationDays: 365,
    };
  }

  // PRO - anual, cobrado de uma vez (R$ 1.440,00)
  if (amountInCents === 144000) {
    return {
      type: "PRO_SUBSCRIPTION",
      planType: "PRO",
      billingCycle: "ANNUAL",
      jurisAmount: 20,
      promo: false,
      expirationDays: 365,
    };
  }

  // START - avulso, pagamento único 30 dias (R$ 49,90)
  if (amountInCents === 4990) {
    return {
      type: "PRO_SUBSCRIPTION",
      planType: "START",
      billingCycle: "AVULSO",
      jurisAmount: 7,
      promo: false,
      expirationDays: 30,
    };
  }

  // PRO - avulso, pagamento único 30 dias (R$ 210,00)
  if (amountInCents === 21000) {
    return {
      type: "PRO_SUBSCRIPTION",
      planType: "PRO",
      billingCycle: "AVULSO",
      jurisAmount: 20,
      promo: false,
      expirationDays: 30,
    };
  }

  const jurisPackages = {
    990: 10,
    1690: 20,
    3990: 50,
  };

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

async function findLawyer(identity) {
  let query = supabaseAdmin
    .from("advogados")
    .select(
      "id, name, email, balance, promo_start_used, promo_pro_used",
    );

  if (identity.userId) {
    query = query.eq("id", identity.userId);
  } else if (identity.email) {
    query = query.ilike("email", identity.email);
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
    .select("id, status")
    .eq("stripe_session_id", reference)
    .maybeSingle();

  if (error) {
    throw new Error("Falha ao consultar idempotência financeira.");
  }

  return data || null;
}

async function reserveTransaction({
  reference,
  lawyerId,
  product,
  amountInCents,
}) {
  const existing = await findTransaction(reference);

  if (existing?.status === "succeeded" || existing?.status === "processing") {
    return { duplicate: true, transactionId: existing.id };
  }

  const payload = {
    advogado_id: lawyerId,
    tipo: product?.type || "UNKNOWN_PURCHASE",
    valor: amountInCents / 100,
    moeda: "BRL",
    status: product ? "processing" : "pending_manual_review",
    juris_amount: product?.jurisAmount || 0,
    stripe_session_id: reference,
    created_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabaseAdmin
      .from("transacoes")
      .update(payload)
      .eq("id", existing.id);

    if (error) {
      throw new Error("Falha ao reabrir o processamento InfinitePay.");
    }

    return { duplicate: false, transactionId: existing.id };
  }

  const { data, error } = await supabaseAdmin
    .from("transacoes")
    .insert([payload])
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { duplicate: true, transactionId: null };
    }
    throw new Error("Falha ao reservar o lançamento InfinitePay.");
  }

  return { duplicate: false, transactionId: data.id };
}

async function updateTransactionStatus(transactionId, status) {
  if (!transactionId) return;

  const { error } = await supabaseAdmin
    .from("transacoes")
    .update({ status })
    .eq("id", transactionId);

  if (error) {
    console.error("[InfinitePay] Falha ao atualizar transação:", error);
  }
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

  if (error) {
    throw new Error("Falha ao atualizar o saldo do advogado.");
  }

  return newBalance;
}

async function applyProduct(lawyer, product) {
  if (product.type === "JURIS_PURCHASE") {
    const newBalance = await incrementBalance(
      lawyer.id,
      product.jurisAmount,
    );

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

  if (error) {
    throw new Error("Falha ao ativar o plano contratado.");
  }

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
      return json(
        { success: false, message: "Serviço financeiro indisponível." },
        503,
      );
    }

    const payload = await request.json().catch(() => null);
    const reference = resolveReference(payload);
    const amountInCents = normalizeAmountInCents(payload?.amount);

    if (!reference || amountInCents <= 0) {
      return json(
        {
          success: false,
          message: "Payload financeiro incompleto.",
        },
        400,
      );
    }

    const identity = resolveIdentity(payload, reference);
    const lawyer = await findLawyer(identity);

    if (!lawyer) {
      console.error("[InfinitePay] Comprador não localizado:", {
        referenceSuffix: reference.slice(-6),
      });
      return json(
        { success: false, message: "Comprador não localizado." },
        404,
      );
    }

    const product = resolveProduct(amountInCents);
    const reservation = await reserveTransaction({
      reference,
      lawyerId: lawyer.id,
      product,
      amountInCents,
    });

    if (reservation.duplicate) {
      return json({
        success: true,
        message: "Evento já processado anteriormente.",
        duplicate: true,
      });
    }

    transactionId = reservation.transactionId;

    if (!product) {
      console.warn("[InfinitePay] Valor enviado para revisão manual:", {
        referenceSuffix: reference.slice(-6),
        amountInCents,
      });

      return json({
        success: true,
        message: "Pagamento registrado para revisão manual.",
        reviewRequired: true,
      });
    }

    const { newBalance } = await applyProduct(lawyer, product);
    await updateTransactionStatus(transactionId, "succeeded");
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
      await updateTransactionStatus(transactionId, "error_updating_balance");
    }

    console.error("[InfinitePay][Webhook] Erro:", error);
    return json(
      {
        success: false,
        message: "Falha temporária no processamento do pagamento.",
      },
      500,
    );
  }
}
