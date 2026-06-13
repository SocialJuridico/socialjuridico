export const MESSAGE_TEXT_LIMIT = 5000;
export const MESSAGE_PREVIEW_LIMIT = 110;

export const ACTIVE_MESSAGE_INTEREST_STATUSES = ["NEGOTIATING", "HIRED"];

export function normalizeMessageText(value, maxLength = MESSAGE_TEXT_LIMIT) {
  return String(value || "").replace(/\r\n/g, "\n").trim().slice(0, maxLength);
}

export function isValidMessageUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ""),
  );
}

export function conversationKey(caseId, interestId = null) {
  return `${String(caseId || "")}:${interestId ? String(interestId) : "case"}`;
}

export function parseMediaMessage(value) {
  if (!value || typeof value !== "string" || value.length > 10000) return null;

  try {
    const parsed = JSON.parse(value);
    if (!parsed || parsed.isMedia !== true) return null;

    const fileUrl = String(parsed.fileUrl || "").trim();
    const fileName = String(parsed.fileName || "Arquivo").trim().slice(0, 180);
    const fileType = String(parsed.fileType || "application/octet-stream")
      .trim()
      .toLowerCase()
      .slice(0, 120);

    const url = new URL(fileUrl);
    if (url.protocol !== "https:") return null;

    return {
      isMedia: true,
      fileUrl: url.toString(),
      fileName: fileName || "Arquivo",
      fileType,
    };
  } catch {
    return null;
  }
}

export function mediaKind(fileType) {
  const normalized = String(fileType || "").toLowerCase();
  if (normalized.startsWith("image/")) return "IMAGE";
  if (normalized.startsWith("audio/")) return "AUDIO";
  if (normalized.startsWith("video/")) return "VIDEO";
  if (normalized === "application/pdf" || normalized === "pdf") return "PDF";
  return "FILE";
}

export function messagePreview(content, maxLength = MESSAGE_PREVIEW_LIMIT) {
  const media = parseMediaMessage(content);
  if (media) {
    const labels = {
      IMAGE: "Imagem enviada",
      AUDIO: "Mensagem de voz",
      VIDEO: "Vídeo enviado",
      PDF: "Documento PDF",
      FILE: "Arquivo enviado",
    };
    return labels[mediaKind(media.fileType)] || labels.FILE;
  }

  const text = normalizeMessageText(content, Math.max(1, maxLength + 1));
  if (!text) return "Mensagem sem conteúdo";
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}…` : text;
}

export function serializeMediaMessage(media) {
  if (!media?.fileUrl) return "";

  return JSON.stringify({
    isMedia: true,
    fileUrl: media.fileUrl,
    fileName: String(media.fileName || "Arquivo").slice(0, 180),
    fileType: String(media.fileType || "application/octet-stream").slice(0, 120),
  });
}

export function messageBelongsToConversation(message, caseId, interestId = null) {
  if (String(message?.caso_id || "") !== String(caseId || "")) return false;

  const messageInterest = message?.interest_id || null;
  const requestedInterest = interestId || null;
  return String(messageInterest || "") === String(requestedInterest || "");
}

export function conversationStatusPresentation(conversation) {
  if (conversation?.mode === "NEGOTIATION") {
    if (conversation?.interestStatus === "HIRED") {
      return {
        code: "HIRED_NEGOTIATION",
        label: "Negociação concluída",
        tone: "success",
      };
    }

    return {
      code: "NEGOTIATING",
      label: "Em negociação",
      tone: "warning",
    };
  }

  const caseStatus = String(conversation?.caseStatus || "").toUpperCase();
  if (["CONCLUIDO", "ENCERRADO", "CANCELADO"].includes(caseStatus)) {
    return { code: "CLOSED", label: "Caso encerrado", tone: "neutral" };
  }

  return { code: "ACTIVE_CASE", label: "Caso ativo", tone: "success" };
}

export function summarizeConversations(items) {
  return (items || []).reduce(
    (summary, item) => {
      summary.total += 1;
      summary.unread += Number(item.unreadCount || 0);

      if (item.mode === "NEGOTIATION" && item.interestStatus === "NEGOTIATING") {
        summary.negotiating += 1;
      }

      if (item.mode === "CASE") summary.activeCases += 1;
      return summary;
    },
    { total: 0, unread: 0, negotiating: 0, activeCases: 0 },
  );
}
