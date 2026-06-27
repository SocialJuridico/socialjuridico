// Prazo (em dias) que um advogado com OAB ainda não verificada pode usar a
// plataforma antes do acesso ser restrito. Reduzido de 7 para 3.
export const OAB_GRACE_PERIOD_DAYS = 3;

// Considera a OAB verificada quando a verificação automática retornou VERIFIED
// ou quando o selo manual (verified) foi concedido por um administrador. Demais
// estados (PENDING, ERROR, null) contam como NÃO verificado.
export function isOabVerified(profile) {
  if (!profile) return false;
  return profile.oab_verification_status === "VERIFIED" || profile.verified === true;
}

// Dias restantes (0..OAB_GRACE_PERIOD_DAYS) antes do acesso ser restrito para
// um advogado com OAB ainda não verificada. Sem oab_warning_started_at, assume
// o prazo cheio (o contador ainda não começou).
export function oabDaysRemaining(profile) {
  const started = profile?.oab_warning_started_at;
  if (!started) return OAB_GRACE_PERIOD_DAYS;

  const startedMs = new Date(started).getTime();
  if (Number.isNaN(startedMs)) return OAB_GRACE_PERIOD_DAYS;

  const elapsedDays = (Date.now() - startedMs) / 86_400_000;
  const left = Math.ceil(OAB_GRACE_PERIOD_DAYS - elapsedDays);
  return Math.max(0, left);
}

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
