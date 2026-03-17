export function normalizeUF(value) {
  return String(value || "")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase()
    .slice(0, 2);
}

export function normalizeOABNumber(value) {
  return String(value || "").replace(/\D/g, "");
}

export function normalizeOAB(value, uf) {
  const normalizedUf = normalizeUF(uf);
  const normalizedNumber = normalizeOABNumber(value);

  if (!normalizedUf || !normalizedNumber) return "";
  return `${normalizedUf} ${normalizedNumber}`;
}

export function formatStoredOAB(value, uf) {
  if (!value) return "";

  const raw = String(value).trim();
  const formattedFromValue = raw.match(/^([A-Za-z]{2})\s*(\d+)$/);
  if (formattedFromValue) {
    return `${formattedFromValue[1].toUpperCase()} ${formattedFromValue[2]}`;
  }

  return normalizeOAB(raw, uf);
}
