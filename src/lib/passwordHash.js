import crypto from "node:crypto";

const KEY_LENGTH = 64;
const PREFIX = "scrypt";

export function hashPassword(password) {
  const value = String(password || "");
  if (value.length < 8) {
    throw new Error("A senha deve possuir pelo menos 8 caracteres.");
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(value, salt, KEY_LENGTH).toString("hex");
  return `${PREFIX}$${salt}$${hash}`;
}

export function isHashedPassword(value) {
  return String(value || "").startsWith(`${PREFIX}$`);
}

export function verifyPassword(password, storedValue) {
  const stored = String(storedValue || "");
  const candidate = String(password || "");

  if (!stored || !candidate) return false;

  if (!isHashedPassword(stored)) {
    const expected = Buffer.from(stored);
    const received = Buffer.from(candidate);

    return (
      expected.length === received.length &&
      crypto.timingSafeEqual(expected, received)
    );
  }

  const [, salt, hashHex] = stored.split("$");
  if (!salt || !hashHex) return false;

  const expected = Buffer.from(hashHex, "hex");
  const received = crypto.scryptSync(candidate, salt, KEY_LENGTH);

  return (
    expected.length === received.length &&
    crypto.timingSafeEqual(expected, received)
  );
}
