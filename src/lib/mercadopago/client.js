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

export async function mercadoPagoRequest(path, {
  method = "GET",
  body,
  idempotencyKey,
} = {}) {
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
    console.error("[MercadoPago] API error", {
      path,
      method,
      status: response.status,
      cause: data?.cause,
      message: data?.message,
      error: data?.error,
    });

    const error = new Error(
      data?.message || data?.error || "Falha ao comunicar com o Mercado Pago.",
    );
    error.status = response.status >= 400 && response.status < 500 ? 422 : 502;
    error.providerStatus = response.status;
    error.providerData = data;
    throw error;
  }

  return data;
}

export function getMercadoPagoPayment(paymentId) {
  return mercadoPagoRequest(`/v1/payments/${encodeURIComponent(String(paymentId))}`);
}

export function getMercadoPagoSubscription(subscriptionId) {
  return mercadoPagoRequest(`/preapproval/${encodeURIComponent(String(subscriptionId))}`);
}

export function createMercadoPagoPayment(body, idempotencyKey) {
  return mercadoPagoRequest("/v1/payments", {
    method: "POST",
    body,
    idempotencyKey,
  });
}

export function createMercadoPagoSubscription(body) {
  return mercadoPagoRequest("/preapproval", {
    method: "POST",
    body,
  });
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

  const manifest = `id:${String(dataId)};request-id:${String(xRequestId)};ts:${String(ts)};`;
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
