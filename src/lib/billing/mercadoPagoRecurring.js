import { centsToBRL, subscriptionFrequencyFor } from "@/lib/billing/catalog";

const SAFE_CODE = /^[A-Za-z0-9_.-]{1,100}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Mercado Pago frequently ships the real rejection reason as a prefix of the
// error message (e.g. "CC_VAL_433 Credit card validation has failed") instead
// of populating cause[].code. This matches only that leading machine code so we
// never serialize the human-readable remainder, which can carry sensitive data.
const MESSAGE_CODE = /^\s*([A-Z]{2,4}(?:_[A-Z0-9]+){1,4})\b/;

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

export function sanitizePayerIdentification(identification) {
  if (!identification) return null;
  const type = String(identification.type || "").trim().toUpperCase();
  const number = String(identification.number || "").replace(/\D/g, "").slice(0, 20);
  if (!type || !number) return null;
  return { type: type.slice(0, 10), number };
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

// Extracts only the leading machine code from a provider message. Returns null
// when the message does not start with a recognizable code, so the free-form
// text is never propagated to logs or diagnostics.
function messageCode(message) {
  const match = MESSAGE_CODE.exec(String(message || ""));
  return match ? safeCode(match[1]) : null;
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
    // When cause[].code is empty, the real reason lives at the start of the
    // message (e.g. CC_VAL_433). Surface it so logs record the actual cause.
    messageCode: messageCode(data?.message) || messageCode(error?.message),
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
  const isCardValidation =
    diagnostics.code === "CC_VAL_433" ||
    diagnostics.messageCode === "CC_VAL_433" ||
    diagnostics.causeCodes.includes("CC_VAL_433") ||
    String(error?.message || "").includes("CC_VAL_433") ||
    String(error?.providerData?.message || "").includes("CC_VAL_433");
  const message = isCardValidation
    ? "O Mercado Pago não conseguiu validar o cartão para a assinatura. Nenhuma nova cobrança deve ser tentada até verificar o estado desta tentativa."
    : "Não foi possível confirmar a criação da assinatura. Consulte o estado da tentativa antes de tentar novamente.";
  const safe = recurringCheckoutError(message, Number(error?.status) || 502);
  safe.providerStatus = diagnostics.providerStatus;
  safe.providerRequestId = diagnostics.requestId;
  safe.providerCode = diagnostics.code;
  safe.providerMessageCode = diagnostics.messageCode;
  safe.providerDiagnostics = diagnostics;
  return safe;
}
