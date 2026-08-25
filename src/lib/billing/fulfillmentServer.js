import {
  boasVindasPlanoTemplate,
  jurisCreditadoTemplate,
} from "@/lib/emailTemplates";
import { resend } from "@/lib/resend";
import { supabaseAdmin } from "@/lib/supabase";
import { decodeBillingReference } from "@/lib/billing/reference";
import { consumeCouponUsage } from "@/lib/coupons/couponServer";

function cents(value) {
  return Math.round(Number(value || 0) * 100);
}

async function getReferenceTransaction(reference) {
  const { data, error } = await supabaseAdmin
    .from("transacoes")
    .select("id, advogado_id, tipo, valor, status, juris_amount, cupom_id, stripe_session_id")
    .eq("stripe_session_id", reference)
    .maybeSingle();

  if (error) throw new Error("Falha ao localizar a referência financeira.");
  return data || null;
}

async function getProviderTransaction(providerReference) {
  const { data, error } = await supabaseAdmin
    .from("transacoes")
    .select("id, status, advogado_id")
    .eq("stripe_session_id", providerReference)
    .maybeSingle();

  if (error) throw new Error("Falha ao verificar idempotência financeira.");
  return data || null;
}

async function loadLawyer(lawyerId) {
  const { data, error } = await supabaseAdmin
    .from("advogados")
    .select(
      "id, name, email, balance, saldo_creditos_ia_extensao, plan_type, plan_billing_cycle, is_premium, premium_expires_at, promo_start_used, promo_pro_used, stripe_subscription_id, subscription_status",
    )
    .eq("id", lawyerId)
    .maybeSingle();

  if (error || !data) throw new Error("Advogado da transação não localizado.");
  return data;
}

async function incrementBalance(lawyerId, amount) {
  const rpcResult = await supabaseAdmin.rpc("increment_lawyer_balance", {
    p_lawyer_id: lawyerId,
    p_amount: amount,
  });

  if (!rpcResult.error) return Number(rpcResult.data || 0);

  const { data, error: readError } = await supabaseAdmin
    .from("advogados")
    .select("balance")
    .eq("id", lawyerId)
    .maybeSingle();

  if (readError || !data) throw new Error("Falha ao consultar saldo de Juris.");

  const newBalance = Number(data.balance || 0) + Number(amount || 0);
  const { error } = await supabaseAdmin
    .from("advogados")
    .update({ balance: newBalance })
    .eq("id", lawyerId);

  if (error) throw new Error("Falha ao creditar Juris.");
  return newBalance;
}

async function incrementAiCredits(lawyerId, amount) {
  const { data, error: readError } = await supabaseAdmin
    .from("advogados")
    .select("saldo_creditos_ia_extensao")
    .eq("id", lawyerId)
    .maybeSingle();

  if (readError || !data) {
    throw new Error("Falha ao consultar saldo de créditos de IA.");
  }

  const newBalance =
    Number(data.saldo_creditos_ia_extensao || 0) + Number(amount || 0);
  const { error } = await supabaseAdmin
    .from("advogados")
    .update({ saldo_creditos_ia_extensao: newBalance })
    .eq("id", lawyerId);

  if (error) throw new Error("Falha ao creditar consultas de IA.");
  return newBalance;
}

function calculateNextExpiration(currentExpiration, days, samePlan) {
  const now = Date.now();
  const current = currentExpiration ? new Date(currentExpiration).getTime() : 0;
  const base = samePlan && Number.isFinite(current) && current > now ? current : now;
  return new Date(base + Number(days || 0) * 86_400_000).toISOString();
}

async function applyProduct(lawyer, product, { subscriptionId = null } = {}) {
  if (product.type === "JURIS_PURCHASE") {
    const newBalance = await incrementBalance(lawyer.id, product.jurisAmount);
    return { newBalance };
  }

  if (product.type === "AI_CREDITS_PURCHASE") {
    const newBalance = await incrementAiCredits(
      lawyer.id,
      product.aiCreditsAmount,
    );
    return { newBalance };
  }

  const samePlan = String(lawyer.plan_type || "").toUpperCase() === product.planType;
  const newBalance = Number(lawyer.balance || 0) + Number(product.jurisAmount || 0);
  const update = {
    plan_type: product.planType,
    plan_billing_cycle: product.billingCycle,
    is_premium: true,
    premium_expires_at: calculateNextExpiration(
      lawyer.premium_expires_at,
      product.expirationDays,
      samePlan,
    ),
    balance: newBalance,
    subscription_status: "ACTIVE",
  };

  // Campos de banco com nome legado são mantidos nesta fase para preservar os
  // usuários existentes. Novos IDs ficam prefixados com mp_.
  if (subscriptionId) update.stripe_subscription_id = `mp_${subscriptionId}`;

  if (product.promo) {
    update[product.planType === "PRO" ? "promo_pro_used" : "promo_start_used"] = true;
  }

  const { error } = await supabaseAdmin
    .from("advogados")
    .update(update)
    .eq("id", lawyer.id);

  if (error) throw new Error("Falha ao ativar ou renovar o plano contratado.");
  return { newBalance };
}

async function sendConfirmationEmail(lawyer, product, newBalance) {
  if (!process.env.RESEND_API_KEY || !lawyer.email) return;

  try {
    if (product.type === "AI_CREDITS_PURCHASE") return;

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
      subject: `Plano ${product.planType} confirmado`,
      html: boasVindasPlanoTemplate({
        lawyerName: lawyer.name || "Advogado",
        planType: product.planType,
        jurisBonus: product.jurisAmount,
      }),
    });
  } catch (error) {
    console.error("[Billing] Falha não fatal no e-mail de confirmação:", error);
  }
}

async function consumeCoupon(referenceTransaction, lawyerId, reference) {
  if (!referenceTransaction?.cupom_id) return;

  try {
    await consumeCouponUsage(supabaseAdmin, {
      couponId: referenceTransaction.cupom_id,
      userId: lawyerId,
      checkoutReference: reference,
    });
  } catch (error) {
    console.error("[Billing] Falha não fatal ao consumir cupom:", error);
  }
}

async function claimOneTimeTransaction(transaction) {
  if (transaction.status === "succeeded") {
    return { claimed: false, duplicate: true };
  }

  if (["processing", "error_updating_balance"].includes(transaction.status)) {
    return { claimed: false, duplicate: false };
  }

  const { data, error } = await supabaseAdmin
    .from("transacoes")
    .update({ status: "processing" })
    .eq("id", transaction.id)
    .eq("status", transaction.status)
    .select("id")
    .maybeSingle();

  if (error) throw new Error("Falha ao reservar processamento da transação.");
  if (data) return { claimed: true, duplicate: false };

  const latest = await getReferenceTransaction(transaction.stripe_session_id);
  return {
    claimed: false,
    duplicate: latest?.status === "succeeded",
  };
}

export async function fulfillMercadoPagoPayment(payment) {
  if (!supabaseAdmin) throw new Error("Serviço financeiro indisponível.");

  const paymentId = String(payment?.id || "").trim();
  const reference = String(payment?.external_reference || "").trim();
  const status = String(payment?.status || "").toLowerCase();

  if (!paymentId || !reference) {
    return { handled: false, reason: "MISSING_REFERENCE" };
  }

  const { product } = decodeBillingReference(reference);
  if (!product) return { handled: false, reason: "UNKNOWN_REFERENCE" };

  const referenceTransaction = await getReferenceTransaction(reference);
  if (!referenceTransaction) {
    return { handled: false, reason: "REFERENCE_NOT_FOUND" };
  }

  const paidCents = cents(payment.transaction_amount);
  const expectedCents = cents(referenceTransaction.valor);
  if (paidCents !== expectedCents || String(payment.currency_id || "BRL") !== "BRL") {
    console.error("[Billing] Pagamento Mercado Pago com valor divergente", {
      paymentId,
      paidCents,
      expectedCents,
      currency: payment.currency_id,
    });
    return { handled: false, reason: "AMOUNT_MISMATCH" };
  }

  const isRecurringPayment = Boolean(product.recurring);
  const providerReference = `mp_pay_${paymentId}`;

  if (isRecurringPayment) {
    const existing = await getProviderTransaction(providerReference);
    if (existing?.status === "succeeded") {
      return { handled: true, duplicate: true, status: "approved" };
    }
  } else if (referenceTransaction.status === "succeeded") {
    return { handled: true, duplicate: true, status: "approved" };
  }

  if (status !== "approved") {
    if (!isRecurringPayment && !["processing", "succeeded"].includes(referenceTransaction.status)) {
      await supabaseAdmin
        .from("transacoes")
        .update({ status: status || "pending" })
        .eq("id", referenceTransaction.id);
    }
    return { handled: true, status };
  }

  let recurringTransactionId = null;
  if (isRecurringPayment) {
    const existing = await getProviderTransaction(providerReference);
    if (!existing) {
      const { data, error } = await supabaseAdmin
        .from("transacoes")
        .insert([
          {
            advogado_id: referenceTransaction.advogado_id,
            tipo: product.type,
            valor: Number(payment.transaction_amount || 0),
            moeda: "BRL",
            status: "processing",
            juris_amount: product.jurisAmount || 0,
            stripe_session_id: providerReference,
            cupom_id: null,
            created_at: new Date().toISOString(),
          },
        ])
        .select("id")
        .single();

      if (error) {
        if (error.code === "23505") {
          const duplicate = await getProviderTransaction(providerReference);
          if (duplicate?.status === "succeeded") {
            return { handled: true, duplicate: true, status: "approved" };
          }
          return { handled: true, status: "processing" };
        }
        throw new Error("Falha ao registrar cobrança recorrente.");
      }
      recurringTransactionId = data.id;
    } else if (existing.status === "processing") {
      return { handled: true, status: "processing" };
    } else if (existing.status === "error_updating_balance") {
      return { handled: true, status: "manual_review" };
    } else {
      recurringTransactionId = existing.id;
    }
  } else {
    const claim = await claimOneTimeTransaction(referenceTransaction);
    if (claim.duplicate) {
      return { handled: true, duplicate: true, status: "approved" };
    }
    if (!claim.claimed) {
      return { handled: true, status: "processing" };
    }
  }

  try {
    const lawyer = await loadLawyer(referenceTransaction.advogado_id);
    const subscriptionId =
      payment?.metadata?.preapproval_id ||
      payment?.metadata?.subscription_id ||
      payment?.subscription_id ||
      null;
    const { newBalance } = await applyProduct(lawyer, product, { subscriptionId });

    if (isRecurringPayment) {
      await supabaseAdmin
        .from("transacoes")
        .update({ status: "succeeded" })
        .eq("id", recurringTransactionId);
      await supabaseAdmin
        .from("transacoes")
        .update({ status: "subscription_active" })
        .eq("id", referenceTransaction.id);
    } else {
      await supabaseAdmin
        .from("transacoes")
        .update({ status: "succeeded" })
        .eq("id", referenceTransaction.id);
      await consumeCoupon(referenceTransaction, lawyer.id, reference);
    }

    await sendConfirmationEmail(lawyer, product, newBalance);

    return {
      handled: true,
      status: "approved",
      product,
      lawyerId: lawyer.id,
      newBalance,
    };
  } catch (error) {
    const targetId = isRecurringPayment ? recurringTransactionId : referenceTransaction.id;
    if (targetId) {
      await supabaseAdmin
        .from("transacoes")
        .update({ status: "error_updating_balance" })
        .eq("id", targetId);
    }
    throw error;
  }
}

export async function syncMercadoPagoSubscription(subscription) {
  if (!supabaseAdmin) throw new Error("Serviço financeiro indisponível.");

  const reference = String(subscription?.external_reference || "").trim();
  if (!reference) return { handled: false };

  const { product } = decodeBillingReference(reference);
  if (!product?.recurring) return { handled: false };

  const transaction = await getReferenceTransaction(reference);
  if (!transaction) return { handled: false };

  const normalizedStatus = String(subscription?.status || "").toLowerCase();
  const alreadyPaid = transaction.status === "subscription_active";
  const profileStatus =
    normalizedStatus === "authorized"
      ? alreadyPaid
        ? "ACTIVE"
        : "PENDING_PAYMENT"
      : normalizedStatus === "paused"
        ? "PAUSED"
        : normalizedStatus === "cancelled" || normalizedStatus === "canceled"
          ? "CANCELED"
          : normalizedStatus.toUpperCase() || "PENDING";

  const update = { subscription_status: profileStatus };
  if (subscription?.id) update.stripe_subscription_id = `mp_${subscription.id}`;

  const { error } = await supabaseAdmin
    .from("advogados")
    .update(update)
    .eq("id", transaction.advogado_id);

  if (error) throw new Error("Falha ao sincronizar status da assinatura.");

  if (!alreadyPaid || profileStatus !== "ACTIVE") {
    await supabaseAdmin
      .from("transacoes")
      .update({ status: `subscription_${profileStatus.toLowerCase()}` })
      .eq("id", transaction.id);
  }

  return { handled: true, status: profileStatus };
}
