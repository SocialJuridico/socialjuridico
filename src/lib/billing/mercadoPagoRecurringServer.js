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

export async function assertNoUnresolvedRecurringAttempt(lawyerId) {
  const { data, error } = await supabaseAdmin
    .from("transacoes")
    .select("id, stripe_session_id")
    .eq("advogado_id", lawyerId)
    .eq("tipo", "PRO_SUBSCRIPTION")
    .in("status", UNRESOLVED)
    .limit(1);
  if (error) throw new Error("Não foi possível verificar as tentativas anteriores.");
  if (data?.length) {
    const blocked = recurringCheckoutError(
      "Existe uma assinatura ainda em confirmação. Verifique a tentativa anterior antes de iniciar outra cobrança.",
      409,
    );
    blocked.checkoutReference = data[0].stripe_session_id;
    throw blocked;
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
