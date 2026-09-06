import { centsToBRL, subscriptionFrequencyFor } from "@/lib/billing/catalog";

const SAFE_CODE = /^[A-Za-z0-9_.-]{1,100}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeRecurringEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function recurringCheckoutError(message, status = 422) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function validateRecurringPaymentData(paymentData, payerEmail) {
  const email = normalizeRecurringEmail(payerEmail);
  const submittedEmail = normalizeRecurringEmail(paymentData?.payer?.email);
  const token = typeof paymentData?.token === "string" ? paymentData.token.trim() : "";
  if (!EMAIL.test(email)) {
    throw recurringCheckoutError("E-mail de cobrança inválido. Atualize seu cadastro antes de continuar.");
  }
  if (submittedEmail && submittedEmail !== email) {
    throw recurringCheckoutError("O e-mail do pagamento não corresponde ao cadastro. Reabra o checkout para atualizar os dados.");
  }
  if (!token) {
    throw recurringCheckoutError("Não foi possível gerar um token de cartão válido. Reabra o checkout.");
  }
  const methodType = String(paymentData?.payment_type_id || "").toLowerCase();
  if (methodType && methodType !== "credit_card") {
    throw recurringCheckoutError("Assinaturas recorrentes exigem cartão de crédito.");
  }
  return { email, token };
}

export function buildRecurringSubscriptionPayload({ product, reference, payerEmail, cardToken, siteUrl }) {
  const frequency = subscriptionFrequencyFor(product?.billingCycle);
  const cents = Number(product?.priceInCents);
  if (!frequency || !Number.isSafeInteger(cents) || cents < 50) {
    throw recurringCheckoutError("Valor ou ciclo da assinatura inválido.");
  }
  return {
    reason: String(product.description || "Social Jurídico").slice(0, 150),
    external_reference: reference,
    payer_email: payerEmail,
    card_token_id: cardToken,
    auto_recurring: {
      ...frequency,
      transaction_amount: centsToBRL(cents),
      currency_id: "BRL",
    },
    back_url: `${siteUrl}/dashboard/advogado`,
    status: "authorized",
  };
}

function safeCode(value) {
  const code = String(value || "");
  return SAFE_CODE.test(code) ? code : null;
}

// Explicit allowlist: provider errors can contain card, identity or request data.
// Never serialize a complete provider error, cause, token or payer object.
export function sanitizeRecurringProviderError(error) {
  const data = error?.providerData;
  const causes = Array.isArray(data?.cause) ? data.cause : [];
  return {
    providerStatus: Number(error?.providerStatus) || null,
    requestId: safeCode(error?.providerRequestId),
    code: safeCode(data?.code) || safeCode(data?.error),
    causeCodes: causes.map((cause) => safeCode(cause?.code)).filter(Boolean).slice(0, 10),
  };
}

export function recurringCheckoutDiagnostics({ product, paymentData, payerEmail }) {
  return {
    plan: ["START", "PRO"].includes(product?.planType) ? product.planType : null,
    billingCycle: ["MONTHLY", "ANNUAL"].includes(product?.billingCycle) ? product.billingCycle : null,
    amountCents: Number(product?.priceInCents) || 0,
    renewalAmountCents: Number(product?.renewalPriceInCents) || null,
    tokenPresent: typeof paymentData?.token === "string" && paymentData.token.trim().length > 0,
    payerEmailPresent: Boolean(payerEmail),
    payerEmailMatches: normalizeRecurringEmail(paymentData?.payer?.email) === normalizeRecurringEmail(payerEmail),
    identificationPresent: Boolean(paymentData?.payer?.identification?.type && paymentData?.payer?.identification?.number),
    paymentMethodId: safeCode(paymentData?.payment_method_id),
    paymentType: safeCode(paymentData?.payment_type_id),
  };
}

export function recurringProviderFailure(error) {
  const diagnostics = sanitizeRecurringProviderError(error);
  const message = diagnostics.code === "CC_VAL_433" || String(error?.message || "").includes("CC_VAL_433")
    ? "O Mercado Pago não conseguiu validar o cartão para a assinatura. Nenhuma nova cobrança deve ser tentada até verificar o estado desta tentativa."
    : "Não foi possível confirmar a criação da assinatura. Consulte o estado da tentativa antes de tentar novamente.";
  const safe = recurringCheckoutError(message, Number(error?.status) || 502);
  safe.providerStatus = diagnostics.providerStatus;
  safe.providerRequestId = diagnostics.requestId;
  safe.providerCode = diagnostics.code;
  safe.providerDiagnostics = diagnostics;
  return safe;
}
