const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATE_PATTERN = /^[A-Z]{2}$/;

export function isUuid(value) {
  return typeof value === "string" && UUID_PATTERN.test(value.trim());
}

export function normalizeSearch(value, maxLength = 120) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function normalizeState(value) {
  const state = String(value || "").trim().toUpperCase();
  return STATE_PATTERN.test(state) ? state : "";
}

export function clampInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

export function normalizeRequestId(value) {
  const requestId = String(value || "").trim();
  return isUuid(requestId) ? requestId : null;
}

export function safePublicUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
