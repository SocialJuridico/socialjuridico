async function readJson(response) {
  return response.json().catch(() => null);
}

async function digitalCardRequest(path, options = {}) {
  const response = await fetch(path, {
    cache: "no-store",
    credentials: "same-origin",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await readJson(response);
  if (!response.ok || !payload?.success) {
    const error = new Error(payload?.message || "Não foi possível concluir a operação.");
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

function createRequestId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-0000-4000-8000-${Math.random().toString(16).slice(2, 14)}`;
}

export function getDigitalCard() {
  return digitalCardRequest("/api/advogado/cartaodigital");
}

export function saveDigitalCard(card) {
  const requestId = createRequestId();
  return digitalCardRequest("/api/advogado/cartaodigital", {
    method: "PUT",
    headers: { "X-Idempotency-Key": requestId },
    body: JSON.stringify({ ...card, requestId }),
  });
}

export function registerDigitalCardPdfDownload() {
  const requestId = createRequestId();
  return digitalCardRequest("/api/advogado/cartaodigital", {
    method: "POST",
    headers: { "X-Idempotency-Key": requestId },
    body: JSON.stringify({ action: "PDF_DOWNLOAD", requestId }),
  });
}

export async function getDigitalCardQrDataUrl(publicUrl) {
  const response = await fetch(
    `/api/advogado/cartaodigital/qr?value=${encodeURIComponent(publicUrl)}`,
    { cache: "no-store", credentials: "same-origin" },
  );
  if (!response.ok) throw new Error("QR Code indisponível.");
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Não foi possível ler o QR Code."));
    reader.readAsDataURL(blob);
  });
}
