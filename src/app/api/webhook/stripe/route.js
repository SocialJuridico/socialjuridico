import {
  boasVindasPlanoTemplate,
  jurisCreditadoTemplate,
  novaVendaAdminTemplate,
} from "@/lib/emailTemplates";
import { resend } from "@/lib/resend";
import { stripe } from "@/lib/stripe";
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

function normalizeType(value) {
  const type = String(value || "JURIS_PURCHASE").toUpperCase();
  return VALID_TYPES.has(type) ? type : "JURIS_PURCHASE";
}

function normalizeCouponId(value) {
  const couponId = String(value || "").trim();
  return couponId && couponId !== "null" ? couponId : null;
}

function resolveJurisFromEnvironment(priceId) {
  const priceMap = {
    [process.env.PRICE_JURIS_10 || process.env.NEXT_PUBLIC_PRICE_JURIS_10]: 10,
    [process.env.PRICE_JURIS_20 || process.env.NEXT_PUBLIC_PRICE_JURIS_20]: 20,
    [process.env.PRICE_JURIS_50 || process.env.NEXT_PUBLIC_PRICE_JURIS_50]: 50,
  };

  return Number(priceMap[priceId] || 0);
}

async function resolveJurisAmount(priceId, metadata) {
  const explicit = Number(metadata?.jurisAmount || metadata?.juris_amount || 0);

  if (Number.isFinite(explicit) && explicit > 0) {
    return Math.trunc(explicit);
  }

  const fromEnvironment = resolveJurisFromEnvironment(priceId);
  if (fromEnvironment > 0) return fromEnvironment;

  if (!priceId) return 0;

  try {
    const price = await stripe.prices.retrieve(priceId, {
      expand: ["product"],
    });
    const searchable = [
      price.nickname,
      price.lookup_key,
      typeof price.product === "object" ? price.product?.name : "",
    ]
      .join(" ")
      .toLowerCase();

    for (const amount of [50, 20, 10]) {
      if (searchable.includes(String(amount))) return amount;
    }
  } catch (error) {
    console.error("[StripeWebhook] Falha ao resolver Price ID:", error);
  }

  return 0;
}

async function resolveUserId(metadata, email) {
  const metadataUserId = String(metadata?.userId || "").trim();

  if (metadataUserId) return metadataUserId;

  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return null;

  const { data, error } = await supabaseAdmin
    .from("advogados")
    .select("id")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (error) {
    throw new Error("Falha ao identificar o comprador.");
  }

  return data?.id || null;
}

async function getExistingTransaction(reference) {
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
  userId,
  type,
  amount,
  currency,
  jurisAmount,
  couponId,
  createdAt,
}) {
  const existing = await getExistingTransaction(reference);

  if (existing?.status === "succeeded" || existing?.status === "processing") {
    return { duplicate: true, transactionId: existing.id };
  }

  if (existing) {
    const { error } = await supabaseAdmin
      .from("transacoes")
      .update({
        advogado_id: userId,
        tipo: type,
        valor: amount,
        moeda: currency,
        status: "processing",
        juris_amount: jurisAmount,
        cupom_id: couponId,
      })
      .eq("id", existing.id);

    if (error) {
      throw new Error("Falha ao reabrir o processamento financeiro.");
    }

    return { duplicate: false, transactionId: existing.id };
  }

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
        stripe_session_id: reference,
        cupom_id: couponId,
        created_at: createdAt,
      },
    ])
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { duplicate: true, transactionId: null };
    }
    throw new Error("Falha ao reservar o lançamento financeiro.");
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
    console.error("[StripeWebhook] Falha ao atualizar transação:", error);
  }
}

async function incrementBalance(userId, amount) {
  const rpcResult = await supabaseAdmin.rpc("increment_lawyer_balance", {
    p_lawyer_id: userId,
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
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error("Perfil do advogado não localizado.");
  }

  const newBalance = Number(profile.balance || 0) + amount;
  const { error: updateError } = await supabaseAdmin
    .from("advogados")
    .update({ balance: newBalance })
    .eq("id", userId);

  if (updateError) {
    throw new Error("Falha ao atualizar o saldo do advogado.");
  }

  return newBalance;
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
  const newBalance = await incrementBalance(userId, jurisBonus);
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
    })
    .eq("id", userId);

  if (error) {
    throw new Error("Falha ao ativar o plano contratado.");
  }

  return { planType, jurisAmount: jurisBonus, newBalance };
}

async function applyAddon(userId, metadata) {
  const addonMap = {
    EXTRA_DOCS: { field: "extra_storage_mb", amount: 1024 },
    EXTRA_IA: { field: "extra_redator_ia", amount: 10 },
    EXTRA_TRIAGEM: { field: "extra_triagem", amount: 5 },
  };
  const addon = addonMap[String(metadata?.addOnType || "").toUpperCase()];

  if (!addon) {
    throw new Error("Expansão contratada não reconhecida.");
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

  return { jurisAmount: 0 };
}

async function applyProduct({ userId, type, jurisAmount, metadata }) {
  if (type === "PRO_SUBSCRIPTION") {
    return applyPlan(userId, metadata);
  }

  if (type === "ADDON_PURCHASE") {
    return applyAddon(userId, metadata);
  }

  if (!Number.isFinite(jurisAmount) || jurisAmount <= 0) {
    throw new Error("Quantidade de Juris não comprovada pelo pagamento.");
  }

  const newBalance = await incrementBalance(userId, jurisAmount);
  return { jurisAmount, newBalance };
}

async function registerCouponUsage(couponId, userId, reference) {
  if (!couponId) return;

  const { error } = await supabaseAdmin.from("cupom_usos").insert([
    {
      cupom_id: couponId,
      advogado_id: userId,
      checkout_session_id: reference,
      pago_em: new Date().toISOString(),
    },
  ]);

  if (error && error.code !== "23505") {
    console.error("[StripeWebhook] Falha ao registrar cupom:", error);
  }
}

async function notifySale({
  userId,
  email,
  type,
  amount,
  jurisAmount,
  planType,
  newBalance,
}) {
  try {
    const [{ data: lawyer }, { data: admins }] = await Promise.all([
      supabaseAdmin
        .from("advogados")
        .select("name, email")
        .eq("id", userId)
        .maybeSingle(),
      supabaseAdmin
        .from("admins")
        .select("name, email")
        .not("email", "is", null),
    ]);

    const lawyerName = lawyer?.name || "Advogado";
    const lawyerEmail = lawyer?.email || email || "";

    if (lawyerEmail) {
      if (type === "JURIS_PURCHASE") {
        await resend.emails.send({
          from: "Social Jurídico <contato@socialjuridico.com.br>",
          to: [lawyerEmail],
          subject: "Seus Juris foram creditados",
          html: jurisCreditadoTemplate({
            lawyerName,
            amount: jurisAmount,
            balance: newBalance,
          }),
        });
      }

      if (type === "PRO_SUBSCRIPTION") {
        await resend.emails.send({
          from: "Social Jurídico <contato@socialjuridico.com.br>",
          to: [lawyerEmail],
          subject: `Bem-vindo ao Plano ${planType}`,
          html: boasVindasPlanoTemplate({
            lawyerName,
            planType,
            jurisBonus: jurisAmount,
          }),
        });
      }
    }

    const adminPayloads = (admins || [])
      .filter((admin) => admin.email)
      .map((admin) => ({
        from: "Social Jurídico <contato@socialjuridico.com.br>",
        to: [admin.email],
        subject:
          type === "PRO_SUBSCRIPTION"
            ? `Nova venda: Plano ${planType}`
            : `Nova venda: ${jurisAmount || 0} Juris`,
        html: novaVendaAdminTemplate({
          adminName: admin.name || "Administrador",
          tipoVenda: type,
          advogadoNome: lawyerName,
          advogadoEmail: lawyerEmail,
          valor: amount.toFixed(2),
          jurisAmount,
        }),
      }));

    if (adminPayloads.length) {
      await resend.batch.send(adminPayloads);
    }
  } catch (error) {
    console.error("[StripeWebhook] Falha não fatal nas notificações:", error);
  }
}

async function processPaidObject({
  reference,
  userId,
  email,
  metadata,
  amountCents,
  currency,
  created,
  priceId,
}) {
  if (!amountCents || amountCents <= 0) {
    throw new Error("Pagamento sem valor confirmado.");
  }

  const resolvedUserId = await resolveUserId(metadata, email);

  if (!resolvedUserId) {
    throw new Error("Comprador não identificado.");
  }

  const type = normalizeType(metadata?.type);
  const couponId = normalizeCouponId(metadata?.cupomId);
  const jurisAmount =
    type === "PRO_SUBSCRIPTION"
      ? String(metadata?.planType || "PRO").toUpperCase() === "START"
        ? 7
        : 20
      : type === "JURIS_PURCHASE"
        ? await resolveJurisAmount(priceId || metadata?.priceId, metadata)
        : 0;

  const reservation = await reserveTransaction({
    reference,
    userId: resolvedUserId,
    type,
    amount: Number((amountCents / 100).toFixed(2)),
    currency: String(currency || "BRL").toUpperCase(),
    jurisAmount,
    couponId,
    createdAt: new Date(Number(created || 0) * 1000).toISOString(),
  });

  if (reservation.duplicate) return;

  try {
    const applied = await applyProduct({
      userId: resolvedUserId,
      type,
      jurisAmount,
      metadata,
    });

    await updateTransactionStatus(reservation.transactionId, "succeeded");
    await registerCouponUsage(couponId, resolvedUserId, reference);
    await notifySale({
      userId: resolvedUserId,
      email,
      type,
      amount: amountCents / 100,
      jurisAmount: applied.jurisAmount || jurisAmount,
      planType: applied.planType,
      newBalance: applied.newBalance,
    });
  } catch (error) {
    await updateTransactionStatus(
      reservation.transactionId,
      "error_updating_balance",
    );
    throw error;
  }
}

async function processCheckoutSession(session) {
  if (String(session.payment_status || "").toLowerCase() !== "paid") {
    console.warn(
      "[StripeWebhook] Checkout concluído sem pagamento confirmado:",
      session.id,
    );
    return;
  }

  let priceId = session.metadata?.priceId;

  if (!priceId && normalizeType(session.metadata?.type) === "JURIS_PURCHASE") {
    try {
      const detailed = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ["line_items.data.price"],
      });
      priceId = detailed.line_items?.data?.[0]?.price?.id || null;
    } catch (error) {
      console.error("[StripeWebhook] Falha ao consultar itens do Checkout:", error);
    }
  }

  await processPaidObject({
    reference: session.id,
    userId: session.metadata?.userId,
    email: session.customer_email || session.customer_details?.email,
    metadata: session.metadata || {},
    amountCents: session.amount_total,
    currency: session.currency,
    created: session.created,
    priceId,
  });
}

async function processPaymentIntent(intent) {
  const checkoutSessions = await stripe.checkout.sessions.list({
    payment_intent: intent.id,
    limit: 1,
  });

  if (checkoutSessions.data.length) {
    return;
  }

  await processPaidObject({
    reference: intent.id,
    userId: intent.metadata?.userId,
    email: intent.receipt_email,
    metadata: intent.metadata || {},
    amountCents: intent.amount_received || intent.amount,
    currency: intent.currency,
    created: intent.created,
    priceId: intent.metadata?.priceId,
  });
}

async function deactivateSubscription(subscription) {
  try {
    let userId = subscription.metadata?.userId || null;

    if (!userId && subscription.customer) {
      const customer = await stripe.customers.retrieve(subscription.customer);
      const email = !customer.deleted ? customer.email : null;

      if (email) {
        const { data } = await supabaseAdmin
          .from("advogados")
          .select("id")
          .ilike("email", email)
          .maybeSingle();
        userId = data?.id || null;
      }
    }

    if (!userId) return;

    const { error } = await supabaseAdmin
      .from("advogados")
      .update({
        is_premium: false,
        plan_type: "FREE",
        premium_expires_at: null,
      })
      .eq("id", userId);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("[StripeWebhook] Falha ao desativar assinatura:", error);
  }
}

export async function POST(request) {
  if (!process.env.STRIPE_WEBHOOK_SECRET || !process.env.STRIPE_SECRET_KEY) {
    return json({ received: false, message: "Webhook não configurado." }, 503);
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    console.error("[StripeWebhook] Assinatura inválida:", error);
    return json({ received: false, message: "Assinatura inválida." }, 400);
  }

  try {
    if (event.type === "checkout.session.completed") {
      await processCheckoutSession(event.data.object);
    } else if (event.type === "payment_intent.succeeded") {
      await processPaymentIntent(event.data.object);
    } else if (event.type === "setup_intent.succeeded") {
      console.info(
        "[StripeWebhook] SetupIntent recebido e ignorado como pagamento:",
        event.id,
      );
    } else if (event.type === "customer.subscription.deleted") {
      await deactivateSubscription(event.data.object);
    }

    return json({ received: true });
  } catch (error) {
    console.error(
      `[StripeWebhook] Falha ao processar ${event.type} (${event.id}):`,
      error,
    );

    return json(
      {
        received: false,
        message: "Falha temporária no processamento do evento.",
      },
      500,
    );
  }
}
