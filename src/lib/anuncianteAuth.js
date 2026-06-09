import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

const SESSION_DURATION_SECONDS = 60 * 60 * 8;

function getSessionSecret() {
  const secret =
    process.env.ANUNCIANTE_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error(
      "ANUNCIANTE_SESSION_SECRET não configurado.",
    );
  }

  return secret;
}

function toBase64Url(value) {
  return Buffer.from(value)
    .toString("base64url");
}

function fromBase64Url(value) {
  return Buffer.from(
    value,
    "base64url",
  ).toString("utf8");
}

export function hashAdvertiserPassword(password) {
  const salt = randomBytes(16).toString("hex");

  const derivedKey = scryptSync(
    password,
    salt,
    64,
  ).toString("hex");

  return `scrypt$${salt}$${derivedKey}`;
}

export function verifyAdvertiserPassword(
  password,
  storedHash,
) {
  try {
    if (
      typeof password !== "string" ||
      typeof storedHash !== "string"
    ) {
      return false;
    }

    const [
      algorithm,
      salt,
      storedKey,
    ] = storedHash.split("$");

    if (
      algorithm !== "scrypt" ||
      !salt ||
      !storedKey
    ) {
      return false;
    }

    const derivedKey = scryptSync(
      password,
      salt,
      64,
    );

    const storedBuffer =
      Buffer.from(storedKey, "hex");

    if (
      storedBuffer.length !==
      derivedKey.length
    ) {
      return false;
    }

    return timingSafeEqual(
      storedBuffer,
      derivedKey,
    );
  } catch {
    return false;
  }
}

export function createAdvertiserSession(
  advertiser,
) {
  const issuedAt = Math.floor(
    Date.now() / 1000,
  );

  const payload = {
    id: advertiser.id,
    username: advertiser.username,
    nome_empresa:
      advertiser.nome_empresa,
    role: "ANUNCIANTE",
    iat: issuedAt,
    exp:
      issuedAt +
      SESSION_DURATION_SECONDS,
  };

  const encodedPayload = toBase64Url(
    JSON.stringify(payload),
  );

  const signature = createHmac(
    "sha256",
    getSessionSecret(),
  )
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

export function verifyAdvertiserSession(
  token,
) {
  try {
    if (
      typeof token !== "string" ||
      !token.includes(".")
    ) {
      return null;
    }

    const [
      encodedPayload,
      receivedSignature,
    ] = token.split(".");

    const expectedSignature =
      createHmac(
        "sha256",
        getSessionSecret(),
      )
        .update(encodedPayload)
        .digest("base64url");

    const receivedBuffer =
      Buffer.from(receivedSignature);

    const expectedBuffer =
      Buffer.from(expectedSignature);

    if (
      receivedBuffer.length !==
      expectedBuffer.length ||
      !timingSafeEqual(
        receivedBuffer,
        expectedBuffer,
      )
    ) {
      return null;
    }

    const payload = JSON.parse(
      fromBase64Url(encodedPayload),
    );

    const now = Math.floor(
      Date.now() / 1000,
    );

    if (
      payload.role !== "ANUNCIANTE" ||
      !payload.id ||
      !payload.exp ||
      payload.exp <= now
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Compatibilidade temporária com cookies antigos.
 * Base64 não é considerado uma sessão segura.
 */
export function decodeLegacyAdvertiserSession(
  token,
) {
  try {
    if (
      typeof token !== "string" ||
      token.includes(".")
    ) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(
        token,
        "base64",
      ).toString("utf8"),
    );

    if (
      payload?.role !== "ANUNCIANTE" ||
      !payload?.id ||
      !payload?.username
    ) {
      return null;
    }

    return {
      ...payload,
      legacy: true,
    };
  } catch {
    return null;
  }
}

export const advertiserSessionConfig = {
  maxAge: SESSION_DURATION_SECONDS,
};