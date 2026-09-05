import crypto from "node:crypto";

const API_BASE = "https://api.mercadopago.com";

function accessToken() {
  const token = String(process.env.MERCADOPAGO_ACCESS_TOKEN || "").trim();
  if (!token) {
    const error = new Error("Mercado Pago não configurado no servidor.");
    error.status = 503;
    throw error;
  }
  return token;
}

function parseResponseBody(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function firstProviderPayment(data) {
  const payments = data?.data?.transactions?.payments;
  return Array.isArray(payments) ? payments[0] || null : null;
}

function providerMessage(data) {
  const firstError = Array.isArray(data?.errors) ? data.errors[0] : null;
  const firstPayment = firstProviderPayment(data);

  if (firstPayment?.status_detail === "processing_error") {
    return "Não foi possível processar o pagamento no Mercado Pago. Tente novamente em alguns instantes.";
  }

  return (
    firstError?.message ||
    firstError?.code ||
    data?.message ||
    data?.error ||
    "Falha ao comunicar com o Mercado Pago."
  );
}

function providerDiagnostics(data) {
  const payments = data?.data?.transactions?.payments;
  const safePayments = Array.isArray(payments)
    ? payments.map((payment) => ({
        id: payment?.id || null,
        amount: payment?.amount || null,
        reference_id: payment?.reference_id || payment?.reference?.id || null,
        status: payment?.status || null,
        status_detail: payment?.status_detail || null,
        payment_method: payment?.payment_method
          ? {
              id: payment.payment_method.id || null,
              type: payment.payment_method.type || null,
            }
          : null,
      }))
    : null;

  return {
    cause: data?.cause,
    errors: data?.errors,
    message: data?.message,
    error: data?.error,
    order: data?.data
      ? {
          id: data.data.id || null,
          type: data.data.type || null,
          external_reference: data.data.external_reference || null,
          status: data.data.status || null,
          status_detail: data.data.status_detail || null,
          total_amount: data.data.total_amount || null,
          total_paid_amount: data.data.total_paid_amount || null,
          transactions: safePayments ? { payments: safePayments } : null,
        }
      : null,
  };
}

function isPixOrder(body) {
  const payments = body?.transactions?.payments;
  if (!Array.isArray(payments) || payments.length === 0) return false;

  return payments.every(
    (payment) =>
      String(payment?.payment_method?.id || "").trim().toLowerCase() === "pix",
  );
}

function minimalPixOrderPayload(body) {
  const payments = Array.isArray(body?.transactions?.payments)
    ? body.transactions.payments
    : [];

  return {
    type: body?.type || "online",
    processing_mode: body?.processing_mode || "automatic",
    external_reference: String(body?.external_reference || "").trim(),
    total_amount: String(body?.total_amount || "").trim(),
    payer: {
      email: String(body?.payer?.email || "").trim().toLowerCase(),
    },
    transactions: {
      payments: payments.map((payment) => ({
        amount: String(payment?.amount || body?.total_amount || "").trim(),
        payment_method: {
          id: "pix",
          type: "bank_transfer",
        },
      })),
    },
  };
}

export async function mercadoPagoRequest(
  path,
  { method = "GET", body, idempotencyKey } = {},
) {
  const headers = {
    Authorization: `Bearer ${accessToken()}`,
    "Content-Type": "application/json",
  };

  if (idempotencyKey) headers["X-Idempotency-Key"] = idempotencyKey;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  const text = await response.text();
  const data = parseResponseBody(text);

  if (!response.ok) {
    const requestId =
      response.headers.get("x-request-id") ||
      response.headers.get("x-requestid") ||
      null;

    console.error(
      "[MercadoPago] API error",
      JSON.stringify(
        {
          path,
          method,
          status: response.status,
          requestId,
          ...providerDiagnostics(data),
        },
        null,
        2,
      ),
    );

    const error = new Error(providerMessage(data));
    error.status = response.status >= 400 && response.status < 500 ? 422 : 502;
    error.providerStatus = response.status;
    error.providerRequestId = requestId;
    error.providerData = data;
    throw error;
  }

  return data;
}

// Checkout Transparente via Orders API (aplicação principal do Social Jurídico).
export function createMercadoPagoOrder(body, idempotencyKey) {
  // O Pix usa deliberadamente o payload mínimo validado em produção.
  // Dados enriquecidos de payer/items/additional_info continuam disponíveis
  // para cartão, mas não são enviados no Pix porque estavam provocando
  // processing_error antes mesmo da geração do QR Code.
  const payload = isPixOrder(body) ? minimalPixOrderPayload(body) : body;

  return mercadoPagoRequest("/v1/orders", {
    method: "POST",
    body: payload,
    idempotencyKey,
  });
}

export function getMercadoPagoOrder(orderId) {
  return mercadoPagoRequest(`/v1/orders/${encodeURIComponent(String(orderId))}`);
}

// Payments API permanece apenas para eventos/cobranças gerados pela API de
// Assinaturas. Compras avulsas novas não passam mais por /v1/payments.
export function getMercadoPagoPayment(paymentId) {
  return mercadoPagoRequest(`/v1/payments/${encodeURIComponent(String(paymentId))}`);
}

export function searchMercadoPagoPaymentsByReference(reference) {
  const query = new URLSearchParams({
    external_reference: String(reference),
    sort: "date_created",
    criteria: "desc",
    limit: "20",
  });
  return mercadoPagoRequest(`/v1/payments/search?${query.toString()}`);
}

export function getMercadoPagoSubscription(subscriptionId) {
  return mercadoPagoRequest(`/preapproval/${encodeURIComponent(String(subscriptionId))}`);
}

export function searchMercadoPagoSubscriptionsByEmail(payerEmail) {
  const query = new URLSearchParams({
    payer_email: String(payerEmail || "").trim().toLowerCase(),
    sort: "date_created",
    criteria: "desc",
    limit: "20",
  });
  return mercadoPagoRequest(`/preapproval/search?${query.toString()}`);
}

export function createMercadoPagoSubscription(body) {
  return mercadoPagoRequest("/preapproval", {
    method: "POST",
    body,
  });
}

export function updateMercadoPagoSubscription(subscriptionId, body) {
  return mercadoPagoRequest(
    `/preapproval/${encodeURIComponent(String(subscriptionId))}`,
    { method: "PUT", body },
  );
}

// A API de Assinaturas possui uma camada própria de faturas
// (/authorized_payments). Ela é a fonte mais direta para descobrir se a primeira
// cobrança já foi gerada, aprovada ou recusada.
export function getMercadoPagoAuthorizedPayment(authorizedPaymentId) {
  return mercadoPagoRequest(
    `/authorized_payments/${encodeURIComponent(String(authorizedPaymentId))}`,
  );
}

export function searchMercadoPagoAuthorizedPaymentsBySubscription(subscriptionId) {
  const query = new URLSearchParams({
    preapproval_id: String(subscriptionId),
  });
  return mercadoPagoRequest(`/authorized_payments/search?${query.toString()}`);
}

export function validateMercadoPagoWebhookSignature({
  xSignature,
  xRequestId,
  dataId,
}) {
  const secret = String(process.env.MERCADOPAGO_WEBHOOK_SECRET || "").trim();
  if (!secret) return false;

  const parts = Object.fromEntries(
    String(xSignature || "")
      .split(",")
      .map((part) => part.trim().split("="))
      .filter(([key, value]) => key && value),
  );

  const ts = parts.ts;
  const received = parts.v1;
  if (!ts || !received || !xRequestId || !dataId) return false;

  // O Mercado Pago exige que data.id alfanumérico seja normalizado para
  // minúsculas antes de montar o manifesto HMAC. IDs numéricos não são
  // afetados pelo toLowerCase(). Orders usam IDs como ORDTST.../ORD01....
  const normalizedDataId = String(dataId).trim().toLowerCase();
  const manifest = `id:${normalizedDataId};request-id:${String(xRequestId)};ts:${String(ts)};`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(received, "hex"),
    );
  } catch {
    return false;
  }
}
