import { createMercadoPagoSubscription } from "@/lib/mercadopago/client";
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
];

export async function assertNoUnresolvedRecurringAttempt(lawyerId) {
  const { data, error } = await supabaseAdmin
    .from("transacoes")
    .select("id")
    .eq("advogado_id", lawyerId)
    .in("status", UNRESOLVED)
    .limit(1);
  if (error) throw new Error("Não foi possível verificar as tentativas anteriores.");
  if (data?.length) {
    throw recurringCheckoutError(
      "Existe uma assinatura ainda em confirmação. Verifique a tentativa anterior antes de iniciar outra cobrança.",
      409,
    );
  }
}

async function setAttemptStatus(transactionId, status) {
  const { error } = await supabaseAdmin
    .from("transacoes")
    .update({ status })
    .eq("id", transactionId);
  if (error) throw new Error("Não foi possível atualizar o estado financeiro da assinatura.");
}

export async function createRecurringCheckout({
  userId,
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

  // Only allowlisted metadata is emitted. Card tokens and identification values
  // are never persisted or logged by this checkout.
  console.info("[Checkout/MercadoPago/Recurring] Request", {
    reference,
    ...recurringCheckoutDiagnostics({ product, paymentData, payerEmail: email }),
  });

  let subscription = null;
  try {
    // The reference is stable for this provider submission. It is not a new
    // payment attempt on retry; uncertain requests must be reconciled first.
    subscription = await createMercadoPagoSubscription(payload, reference);
  } catch (error) {
    const status = error?.providerStatus >= 400 && error?.providerStatus < 500
      ? "subscription_rejected"
      : "subscription_reconciliation_required";
    try {
      await setAttemptStatus(transactionId, status);
    } catch {
      // Keep the original provider failure, but never delete its reference.
      console.error("[Checkout/MercadoPago/Recurring] Não foi possível atualizar o estado financeiro.", { reference });
    }
    error.preserveTransaction = true;
    throw error;
  }

  if (!subscription?.id) {
    const error = recurringCheckoutError("A assinatura precisa ser reconciliada antes de uma nova tentativa.", 502);
    error.preserveTransaction = true;
    throw error;
  }

  try {
    await setAttemptStatus(transactionId, "subscription_pending_payment");
  } catch (error) {
    error.preserveTransaction = true;
    throw error;
  }

  // Creating a subscription is not proof that its first charge was approved.
  // The existing webhook/status fulfillment remains responsible for activation.
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
