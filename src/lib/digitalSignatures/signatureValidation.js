export const SIGNATURE_DOCUMENT_TYPES = Object.freeze([
  "contrato",
  "procuracao",
  "outro",
]);

export const SIGNATURE_STATUSES = Object.freeze([
  "pending",
  "partially_signed",
  "signed",
]);

export const SIGNATURE_ROLES = Object.freeze(["lawyer", "client"]);
export const MAX_SIGNATURE_FILE_BYTES = 15 * 1024 * 1024;
export const DEFAULT_SIGNATURE_PAGE_SIZE = 10;
export const MAX_SIGNATURE_PAGE_SIZE = 25;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VERIFICATION_CODE_PATTERN = /^SJ-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;

export function normalizeSignatureText(value, maxLength = 160) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function normalizeSignatureEmail(value) {
  return normalizeSignatureText(value, 254).toLowerCase();
}

export function isValidSignatureEmail(value) {
  return EMAIL_PATTERN.test(normalizeSignatureEmail(value));
}

export function isValidSignatureUuid(value) {
  return UUID_PATTERN.test(String(value || ""));
}

export function isValidVerificationCode(value) {
  return VERIFICATION_CODE_PATTERN.test(String(value || "").toUpperCase());
}

export function normalizeSignatureRole(value) {
  const role = String(value || "").toLowerCase();
  return SIGNATURE_ROLES.includes(role) ? role : "";
}

export function normalizeSignatureStatus(value) {
  const status = String(value || "").toLowerCase();
  return SIGNATURE_STATUSES.includes(status) ? status : "all";
}

export function normalizeSignatureQuery(searchParams) {
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(
    MAX_SIGNATURE_PAGE_SIZE,
    Math.max(
      1,
      Number.parseInt(
        searchParams.get("pageSize") || String(DEFAULT_SIGNATURE_PAGE_SIZE),
        10,
      ) || DEFAULT_SIGNATURE_PAGE_SIZE,
    ),
  );

  return {
    page,
    pageSize,
    status: normalizeSignatureStatus(searchParams.get("status")),
    search: normalizeSignatureText(searchParams.get("search"), 80).replace(
      /[^\p{L}\p{N}\s-]/gu,
      "",
    ),
  };
}

export function normalizeCreateSignaturePayload(payload = {}) {
  return {
    requestId: normalizeSignatureText(payload.requestId, 36),
    documentName: normalizeSignatureText(payload.documentName, 180),
    documentType: SIGNATURE_DOCUMENT_TYPES.includes(payload.documentType)
      ? payload.documentType
      : "contrato",
    clientId: isValidSignatureUuid(payload.clientId) ? payload.clientId : null,
    clientName: normalizeSignatureText(payload.clientName, 140),
    clientEmail: normalizeSignatureEmail(payload.clientEmail),
    uploadPath: normalizeSignatureText(payload.uploadPath, 500),
  };
}

export function validateCreateSignaturePayload(payload = {}) {
  const normalized = normalizeCreateSignaturePayload(payload);
  const errors = {};

  if (!isValidSignatureUuid(normalized.requestId)) {
    errors.requestId = "Identificador da solicitação inválido.";
  }
  if (normalized.documentName.length < 3) {
    errors.documentName = "Informe um nome de documento com ao menos 3 caracteres.";
  }
  if (!SIGNATURE_DOCUMENT_TYPES.includes(normalized.documentType)) {
    errors.documentType = "Tipo de documento inválido.";
  }
  if (normalized.clientName.length < 2) {
    errors.clientName = "Informe o nome completo do outro signatário.";
  }
  if (!isValidSignatureEmail(normalized.clientEmail)) {
    errors.clientEmail = "Informe um e-mail válido para o outro signatário.";
  }
  if (!normalized.uploadPath || !normalized.uploadPath.endsWith(".pdf")) {
    errors.uploadPath = "Envie um arquivo PDF válido antes de continuar.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    data: normalized,
  };
}

export function validateSignatureFileDescriptor({ fileName, contentType, size }) {
  const errors = {};
  const safeName = normalizeSignatureText(fileName, 180);
  const normalizedType = String(contentType || "").toLowerCase();
  const numericSize = Number(size || 0);

  if (!safeName.toLowerCase().endsWith(".pdf")) {
    errors.file = "Apenas arquivos PDF são permitidos.";
  }
  if (normalizedType && normalizedType !== "application/pdf") {
    errors.file = "O arquivo informado não possui o tipo PDF esperado.";
  }
  if (!numericSize || numericSize > MAX_SIGNATURE_FILE_BYTES) {
    errors.file = `O PDF deve possuir no máximo ${Math.round(MAX_SIGNATURE_FILE_BYTES / 1024 / 1024)} MB.`;
  }

  return { valid: Object.keys(errors).length === 0, errors, safeName };
}

export function parseSignatureMetadata(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function sanitizeParty(party = {}, { maskSensitive = false } = {}) {
  const email = normalizeSignatureEmail(party.email);
  const maskedEmail = email
    ? email.replace(/^(.{1,2}).*(@.*)$/, "$1***$2")
    : "";
  const rawIp = normalizeSignatureText(party.ip, 100);
  const maskedIp = rawIp
    ? rawIp.includes(":")
      ? `${rawIp.split(":").slice(0, 2).join(":")}:…`
      : `${rawIp.split(".").slice(0, 2).join(".")}.*.*`
    : null;

  return {
    name: normalizeSignatureText(party.name, 140),
    email: maskSensitive ? maskedEmail : email,
    signed: Boolean(party.signed),
    signed_at: party.signed_at || null,
    ip: maskSensitive ? maskedIp : rawIp || null,
    user_agent: maskSensitive
      ? null
      : normalizeSignatureText(party.user_agent || party.agent, 500) || null,
  };
}

export function sanitizeSignatureMetadata(value, options = {}) {
  const metadata = parseSignatureMetadata(value);
  return {
    lawyer: sanitizeParty(metadata.lawyer, options),
    client: sanitizeParty(metadata.client, options),
    history: Array.isArray(metadata.history)
      ? metadata.history.slice(-50).map((item) => ({
          event: normalizeSignatureText(item?.event, 80),
          timestamp: item?.timestamp || null,
          details: normalizeSignatureText(item?.details, 300),
        }))
      : [],
  };
}

export function signatureStatusLabel(status) {
  if (status === "signed") return "Assinado por completo";
  if (status === "partially_signed") return "Parcialmente assinado";
  return "Aguardando assinaturas";
}
