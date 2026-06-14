import crypto from "node:crypto";

const STATE_TTL_MS = 10 * 60 * 1000;
export const GOOGLE_CALENDAR_NONCE_COOKIE = "sj_google_calendar_nonce";

function getStateSecret() {
  return (
    process.env.GOOGLE_OAUTH_STATE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXTAUTH_SECRET ||
    ""
  );
}

function sign(payload) {
  const secret = getStateSecret();
  if (!secret) return "";
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

export function normalizeGoogleRedirect(value) {
  const redirect = String(value || "/dashboard/advogado/agenda").trim();
  return redirect.startsWith("/dashboard/advogado") && !redirect.startsWith("//")
    ? redirect
    : "/dashboard/advogado/agenda";
}

export function createGoogleCalendarState(userId, redirectTo) {
  const nonce = crypto.randomUUID();
  const payload = Buffer.from(
    JSON.stringify({
      userId,
      nonce,
      redirectTo: normalizeGoogleRedirect(redirectTo),
      expiresAt: Date.now() + STATE_TTL_MS,
    }),
  ).toString("base64url");
  const signature = sign(payload);
  if (!signature) throw new Error("Segredo de estado OAuth não configurado.");
  return { state: `${payload}.${signature}`, nonce };
}

export function verifyGoogleCalendarState(state, expectedNonce) {
  try {
    const [payload, signature] = String(state || "").split(".");
    if (!payload || !signature || !expectedNonce) return null;
    const expected = sign(payload);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (
      !expected ||
      actualBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      return null;
    }
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (
      !decoded?.userId ||
      decoded.nonce !== expectedNonce ||
      Number(decoded.expiresAt || 0) < Date.now()
    ) {
      return null;
    }
    return { ...decoded, redirectTo: normalizeGoogleRedirect(decoded.redirectTo) };
  } catch {
    return null;
  }
}
