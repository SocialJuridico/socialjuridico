export const CHAT_MESSAGE_LIMIT = 5000;
export const CHAT_PAGE_LIMIT = 50;
export const CHAT_MAX_FILE_BYTES = 20 * 1024 * 1024;
export const CHAT_READABLE_INTEREST_STATUSES = ["NEGOTIATING", "HIRED"];
export const CHAT_WRITABLE_INTEREST_STATUSES = ["NEGOTIATING"];
export const CHAT_CLOSED_CASE_STATUSES = [
  "CANCELADO",
  "FECHADO",
  "CONCLUIDO",
  "ENCERRADO",
];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const CHAT_ALLOWED_MIME_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["application/pdf", "pdf"],
  ["application/msword", "doc"],
  [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "docx",
  ],
  ["application/vnd.ms-excel", "xls"],
  [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "xlsx",
  ],
  ["application/vnd.ms-powerpoint", "ppt"],
  [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "pptx",
  ],
  ["application/rtf", "rtf"],
  ["text/rtf", "rtf"],
  ["text/plain", "txt"],
  ["audio/webm", "webm"],
  ["audio/mpeg", "mp3"],
  ["audio/mp4", "m4a"],
  ["audio/ogg", "ogg"],
  ["audio/wav", "wav"],
  ["video/mp4", "mp4"],
  ["video/webm", "webm"],
  ["video/quicktime", "mov"],
]);

export function isChatUuid(value) {
  return typeof value === "string" && UUID_PATTERN.test(value.trim());
}

export function normalizeChatRequestId(value) {
  const requestId = String(value || "").trim();
  return isChatUuid(requestId) ? requestId : null;
}

export function normalizeChatInterestId(value) {
  const interestId = String(value || "").trim();
  if (!interestId) return null;
  return isChatUuid(interestId) ? interestId : undefined;
}

export function normalizeChatText(value, maxLength = CHAT_MESSAGE_LIMIT) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[\u0000\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim()
    .slice(0, maxLength);
}

export function normalizeChatCursor(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function normalizeChatFileName(value) {
  return (
    String(value || "Arquivo")
      .replace(/[\\/\0<>:"|?*]+/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180) || "Arquivo"
  );
}

export function normalizeMimeType(value) {
  return String(value || "")
    .toLowerCase()
    .split(";")[0]
    .trim();
}

export function getChatFileExtension(mimeType) {
  return CHAT_ALLOWED_MIME_TYPES.get(normalizeMimeType(mimeType)) || null;
}

export function chatAttachmentKind(mimeType) {
  const normalized = normalizeMimeType(mimeType);
  if (normalized.startsWith("image/")) return "IMAGE";
  if (normalized.startsWith("audio/")) return "AUDIO";
  if (normalized.startsWith("video/")) return "VIDEO";
  if (normalized === "application/pdf") return "PDF";
  if (
    normalized.includes("word") ||
    normalized.includes("officedocument.wordprocessingml") ||
    normalized === "application/msword"
  ) {
    return "DOCUMENT";
  }
  return "FILE";
}

export function isClosedChatCase(status) {
  return CHAT_CLOSED_CASE_STATUSES.includes(
    String(status || "").trim().toUpperCase(),
  );
}

export function canWriteChatConversation({ caseStatus, interestStatus, mode }) {
  if (isClosedChatCase(caseStatus)) return false;
  if (mode === "NEGOTIATION") {
    return CHAT_WRITABLE_INTEREST_STATUSES.includes(
      String(interestStatus || "").toUpperCase(),
    );
  }
  return true;
}

export function parseChatMetadata(value) {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

export function parseLegacyMediaContent(value) {
  if (!value || typeof value !== "string" || value.length > 12000) return null;
  try {
    const parsed = JSON.parse(value);
    if (!parsed || parsed.isMedia !== true) return null;
    const fileUrl = String(parsed.fileUrl || "").trim();
    if (!fileUrl) return null;
    const url = new URL(fileUrl);
    if (url.protocol !== "https:") return null;
    return {
      legacy: true,
      url: url.toString(),
      name: normalizeChatFileName(parsed.fileName),
      mimeType: normalizeMimeType(parsed.fileType || "application/octet-stream"),
      kind: chatAttachmentKind(parsed.fileType),
    };
  } catch {
    return null;
  }
}

export function normalizeAiScope(value) {
  const scope = String(value || "GLOBAL").trim().toUpperCase();
  return ["GLOBAL", "MESSAGE"].includes(scope) ? scope : null;
}

export function buildChatConversationKey(caseId, interestId = null) {
  return `${String(caseId || "")}:${interestId || "case"}`;
}
