import crypto from "node:crypto";

export const OFFICE_SESSION_COOKIE = "sj_escritorio_session";
export const OFFICE_SESSION_SIGNATURE_COOKIE = "sj_escritorio_session_sig";

function getOfficeSessionSecret() {
  return (
    process.env.OFFICE_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXTAUTH_SECRET ||
    ""
  );
}

export function signOfficeSessionValue(value) {
  const secret = getOfficeSessionSecret();
  if (!secret || !value) return "";
  return crypto.createHmac("sha256", secret).update(String(value)).digest("base64url");
}

export function verifyOfficeSessionValue(value, signature) {
  if (!value || !signature) return false;
  const expected = signOfficeSessionValue(value);
  if (!expected) return false;
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(String(signature));
  return (
    expectedBuffer.length === signatureBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
  );
}

export function decodeOfficeSessionValue(value) {
  try {
    const decoded = JSON.parse(Buffer.from(String(value), "base64").toString("utf8"));
    if (
      !decoded ||
      typeof decoded !== "object" ||
      !decoded.id ||
      !decoded.email ||
      String(decoded.role || "").toUpperCase() !== "ESCRITORIO"
    ) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function getVerifiedOfficeSession(request) {
  const value = request?.cookies?.get(OFFICE_SESSION_COOKIE)?.value;
  const signature = request?.cookies?.get(OFFICE_SESSION_SIGNATURE_COOKIE)?.value;
  if (!verifyOfficeSessionValue(value, signature)) return null;
  return decodeOfficeSessionValue(value);
}
