export const CLIENT_TYPES = Object.freeze(["Pessoa Física", "Pessoa Jurídica"]);
export const CLIENT_STATUSES = Object.freeze([
  "Ativo",
  "Potencial",
  "Inativo",
  "Arquivado",
]);
export const INTERACTION_TYPES = Object.freeze([
  "nota",
  "reunião",
  "ligação",
  "email",
  "whatsapp",
  "auditoria",
]);
export const SCHEDULABLE_INTERACTION_TYPES = Object.freeze([
  "reunião",
  "ligação",
]);
export const FINANCE_STATUSES = Object.freeze(["PENDENTE", "PAGO", "CANCELADO"]);
export const MAX_CLIENT_PAGE_SIZE = 30;
export const DEFAULT_CLIENT_PAGE_SIZE = 12;
export const MAX_CLIENT_DOCUMENT_BYTES = 25 * 1024 * 1024;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeClientText(value, maxLength = 180) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function normalizeClientEmail(value) {
  return normalizeClientText(value, 254).toLowerCase();
}

export function normalizeClientDigits(value, maxLength = 18) {
  return String(value || "").replace(/\D/g, "").slice(0, maxLength);
}

export function isClientUuid(value) {
  return UUID_PATTERN.test(String(value || ""));
}

export function isClientEmail(value) {
  const email = normalizeClientEmail(value);
  return !email || EMAIL_PATTERN.test(email);
}

export function normalizeClientPayload(payload = {}) {
  return {
    requestId: normalizeClientText(payload.requestId, 36),
    name: normalizeClientText(payload.name, 160),
    type: CLIENT_TYPES.includes(payload.type) ? payload.type : "Pessoa Física",
    cpfCnpj: normalizeClientDigits(payload.cpfCnpj, 14),
    rg: normalizeClientText(payload.rg, 30),
    civilStatus: normalizeClientText(payload.civilStatus, 40),
    profession: normalizeClientText(payload.profession, 100),
    phone: normalizeClientDigits(payload.phone, 13),
    address: normalizeClientText(payload.address, 300),
    email: normalizeClientEmail(payload.email),
    notes: normalizeClientText(payload.notes, 3000),
    status: CLIENT_STATUSES.includes(payload.status) ? payload.status : "Ativo",
  };
}

export function validateClientPayload(payload = {}, { partial = false } = {}) {
  const data = normalizeClientPayload(payload);
  const errors = {};

  if (!partial && !isClientUuid(data.requestId)) {
    errors.requestId = "Identificador da solicitação inválido.";
  }
  if (!partial || Object.prototype.hasOwnProperty.call(payload, "name")) {
    if (data.name.length < 2) errors.name = "Informe o nome completo do cliente.";
  }
  if (data.email && !isClientEmail(data.email)) {
    errors.email = "Informe um e-mail válido.";
  }
  if (data.cpfCnpj && ![11, 14].includes(data.cpfCnpj.length)) {
    errors.cpfCnpj = "Informe um CPF ou CNPJ válido.";
  }
  if (data.phone && data.phone.length < 10) {
    errors.phone = "Informe um telefone com DDD.";
  }

  return { valid: Object.keys(errors).length === 0, errors, data };
}

export function normalizeClientQuery(searchParams) {
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(
    MAX_CLIENT_PAGE_SIZE,
    Math.max(
      1,
      Number.parseInt(
        searchParams.get("pageSize") || String(DEFAULT_CLIENT_PAGE_SIZE),
        10,
      ) || DEFAULT_CLIENT_PAGE_SIZE,
    ),
  );
  const status = CLIENT_STATUSES.includes(searchParams.get("status"))
    ? searchParams.get("status")
    : "all";
  const scope = searchParams.get("scope") === "mine" ? "mine" : "all";
  const search = normalizeClientText(searchParams.get("search"), 80).replace(
    /[^\p{L}\p{N}\s@._-]/gu,
    "",
  );

  return { page, pageSize, status, scope, search };
}

export function validateInteractionPayload(payload = {}) {
  const scheduledAt = payload.scheduledAt || payload.scheduled_at || "";
  const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
  const data = {
    requestId: normalizeClientText(payload.requestId, 36),
    type: INTERACTION_TYPES.includes(payload.type) ? payload.type : "nota",
    content: normalizeClientText(payload.content, 3000),
    scheduledAt:
      scheduledDate && !Number.isNaN(scheduledDate.getTime())
        ? scheduledDate.toISOString()
        : null,
  };
  const errors = {};

  if (data.content.length < 2) errors.content = "Descreva a interação realizada.";
  if (scheduledAt && !data.scheduledAt) {
    errors.scheduledAt = "Informe uma data e hora válidas.";
  }
  if (SCHEDULABLE_INTERACTION_TYPES.includes(data.type) && !data.scheduledAt) {
    errors.scheduledAt = "Informe quando este compromisso acontecerá.";
  }

  return { valid: Object.keys(errors).length === 0, errors, data };
}

export function validateFinancePayload(payload = {}) {
  const amount = Number(payload.amount);
  const data = {
    requestId: normalizeClientText(payload.requestId, 36),
    description: normalizeClientText(payload.description, 180),
    amount,
    dueDate: /^\d{4}-\d{2}-\d{2}$/.test(String(payload.dueDate || ""))
      ? String(payload.dueDate)
      : new Date().toISOString().slice(0, 10),
    status: FINANCE_STATUSES.includes(payload.status)
      ? payload.status
      : "PENDENTE",
  };
  const errors = {};
  if (data.description.length < 2) errors.description = "Informe a descrição do lançamento.";
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000) {
    errors.amount = "Informe um valor financeiro válido.";
  }
  return { valid: Object.keys(errors).length === 0, errors, data };
}

export function validateClientDocument(file) {
  const errors = {};
  const fileName = normalizeClientText(file?.name, 180);
  const size = Number(file?.size || 0);
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  const allowedExtensions = new Set(["pdf", "doc", "docx", "jpg", "jpeg", "png"]);
  const allowedMime = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
  ]);

  if (!fileName || !allowedExtensions.has(extension)) {
    errors.file = "Envie PDF, DOC, DOCX, JPG ou PNG.";
  }
  if (file?.type && !allowedMime.has(file.type)) {
    errors.file = "O tipo do arquivo não é permitido.";
  }
  if (!size || size > MAX_CLIENT_DOCUMENT_BYTES) {
    errors.file = "O arquivo deve possuir no máximo 25 MB.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    fileName,
    extension,
    size,
  };
}

export function maskClientDocument(value) {
  const digits = normalizeClientDigits(value, 14);
  if (digits.length === 11) return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
  if (digits.length === 14) return `**.${digits.slice(2, 5)}.${digits.slice(5, 8)}/****-**`;
  return "";
}

export function maskClientPhone(value) {
  const digits = normalizeClientDigits(value, 13);
  if (digits.length < 10) return "";
  return `(${digits.slice(0, 2)}) *****-${digits.slice(-4)}`;
}
