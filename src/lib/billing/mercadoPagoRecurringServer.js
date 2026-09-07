import {
  createMercadoPagoSubscription,
  searchMercadoPagoPaymentsByReference,
  searchMercadoPagoSubscriptionsByEmail,
} from "@/lib/mercadopago/client";
import { supabaseAdmin } from "@/lib/supabase";
import {
  buildRecurringSubscriptionPayload,
  recurringCheckoutDiagnostics,
  recurringCheckoutError,
  validateRecurringPaymentData,
} from "@/lib/billing/mercadoPagoRecurring";

const UNRESOLVED = [
  "subscription_pending",
  "subscription_pending_payment",
  "subscription_activating",
  "subscription_reconciliation_required",
  "subscription_authorized",
];

async function autoReconcileUnresolvedAttempt(lawyerId, tx, payerEmail) {
  const reference = tx.stripe_session_id;
  if (!reference) return false;

  try {
    let matchingSubs = [];
    if (payerEmail) {
      const subscriptions = await searchMercadoPagoSubscriptionsByEmail(payerEmail);
      matchingSubs = (Array.isArray(subscriptions?.results) ? subscriptions.results : [])
        .filter((sub) => String(sub?.external_reference || "") === reference);
    }

    const searchPayments = await searchMercadoPagoPaymentsByReference(reference);
    const matchingPayments = Array.isArray(searchPayments?.results) ? searchPayments.results : [];

    // Se nem assinatura nem pagamento existem no Mercado Pago, a tentativa anterior
    // falhou na requisicao inicial e nao gerou cobranca real.
    if (matchingSubs.length === 0 && matchingPayments.length === 0) {
      await supabaseAdmin
        .from("transacoes")
        .update({ status: "subscription_rejected" })
        .eq("id", tx.id)
        .eq("advogado_id", lawyerId);
      return true;
    }

    if (matchingSubs.length > 0) {
      const subStatus = String(matchingSubs[0]?.status || "").toLowerCase();
      if (["cancelled", "canceled", "rejected"].includes(subStatus)) {
        await supabaseAdmin
          .from("transacoes")
          .update({ status: "subscription_rejected" })
          .eq("id", tx.id)
          .eq("advogado_id", lawyerId);
        return true;
      }
    }

    if (matchingPayments.length > 0) {
      const payStatus = String(matchingPayments[0]?.status || "").toLowerCase();
      if (["rejected", "cancelled", "canceled"].includes(payStatus)) {
        await supabaseAdmin
          .from("transacoes")
          .update({ status: "subscription_rejected" })
          .eq("id", tx.id)
          .eq("advogado_id", lawyerId);
        return true;
      }
    }
  } catch (reconcileError) {
    console.warn("[MercadoPago/Recurring] Auto-reconciliação de tentativa falhou:", reconcileError);
    try {
      await supabaseAdmin
        .from("transacoes")
        .update({ status: "subscription_rejected" })
        .eq("id", tx.id)
        .eq("advogado_id", lawyerId);
      return true;
    } catch {
      // Ignora falha secundaria de update no banco
    }
  }

  return false;
}

export async function assertNoUnresolvedRecurringAttempt(lawyerId, payerEmail = null) {
  const { data, error } = await supabaseAdmin
    .from("transacoes")
    .select("id, stripe_session_id, status")
    .eq("advogado_id", lawyerId)
    .eq("tipo", "PRO_SUBSCRIPTION")
    .in("status", UNRESOLVED);
  if (error) throw new Error("Não foi possível verificar as tentativas anteriores.");
  if (!data?.length) return;

  for (const tx of data) {
    const unblocked = await autoReconcileUnresolvedAttempt(lawyerId, tx, payerEmail);
    if (!unblocked) {
      const blocked = recurringCheckoutError(
        "Existe uma assinatura ainda em confirmação. Verifique a tentativa anterior antes de iniciar outra cobrança.",
        409,
      );
      blocked.checkoutReference = tx.stripe_session_id;
      throw blocked;
    }
  }
}

async function setAttemptStatus(transactionId, status, expectedStatuses = UNRESOLVED) {
  const { error } = await supabaseAdmin
    .from("transacoes")
    .update({ status })
    .eq("id", transactionId)
    .in("status", expectedStatuses);
  if (error) throw new Error("Não foi possível atualizar o estado financeiro da assinatura.");
}

export async function findRecurringAttempt({ userId, reference, payerEmail }) {
  const { data: transaction, error } = await supabaseAdmin
    .from("transacoes")
    .select("id, status, stripe_session_id")
    .eq("advogado_id", userId)
    .eq("stripe_session_id", reference)
    .maybeSingle();
  if (error) throw new Error("Não foi possível consultar a tentativa financeira.");
  if (!transaction) throw recurringCheckoutError("Tentativa não localizada.", 404);

  const subscriptions = await searchMercadoPagoSubscriptionsByEmail(payerEmail);
  const matching = (Array.isArray(subscriptions?.results) ? subscriptions.results : [])
    .filter((subscription) => String(subscription?.external_reference || "") === reference);
  if (matching.length > 1) {
    throw recurringCheckoutError("Mais de uma assinatura encontrada. É necessária reconciliação antes de outra cobrança.", 409);
  }
  if (matching[0]?.id) {
    return { reference, subscriptionId: matching[0].id, paymentId: null, status: transaction.status, retryable: false };
  }

  const search = await searchMercadoPagoPaymentsByReference(reference);
  const payments = Array.isArray(search?.results) ? search.results : [];
  return {
    reference,
    subscriptionId: null,
    paymentId: payments[0]?.id || null,
    status: transaction.status,
    retryable: false,
  };
}

export async function createRecurringCheckout({
  product,
  reference,
  transactionId,
  paymentData,
  payerEmail,
  siteUrl,
}) {
  const { email, token } = validateRecurringPaymentData(paymentData, payerEmail);
  const payload = buildRecurringSubscriptionPayload({
    product,
    reference,
    payerEmail: email,
    cardToken: token,
    siteUrl,
  });

  console.info("[Checkout/MercadoPago/Recurring] Request", {
    reference,
    ...recurringCheckoutDiagnostics({ product, paymentData, payerEmail: email }),
  });

  let subscription = null;
  try {
    subscription = await createMercadoPagoSubscription(payload, reference);
  } catch (error) {
    // An HTTP error does not prove that no charge was created. Never delete
    // the reference, reuse the token, or make a second POST automatically.
    try {
      await setAttemptStatus(transactionId, "subscription_reconciliation_required");
    } catch {
      console.error("[Checkout/MercadoPago/Recurring] Não foi possível atualizar o estado financeiro.", { reference });
    }
    error.preserveTransaction = true;
    error.checkoutReference = reference;
    throw error;
  }

  if (!subscription?.id) {
    const error = recurringCheckoutError("A assinatura precisa ser reconciliada antes de uma nova tentativa.", 502);
    error.preserveTransaction = true;
    error.checkoutReference = reference;
    throw error;
  }

  try {
    await setAttemptStatus(transactionId, "subscription_pending_payment");
  } catch (error) {
    error.preserveTransaction = true;
    error.checkoutReference = reference;
    throw error;
  }

  return {
    success: true,
    provider: "MERCADOPAGO",
    kind: "subscription",
    reference,
    subscriptionId: subscription.id,
    status: "activating",
    providerStatus: subscription.status || "pending",
    amount: product.priceInCents,
    renewalAmount: product.renewalPriceInCents,
    discountSource: product.discountSource,
    recurring: true,
    approved: false,
    accessProvisioned: false,
    activationMessage: "Assinatura criada. Aguardando a confirmação da primeira cobrança para ativar o plano e creditar os Juris.",
  };
}
