export const NOTIFICATION_FILTERS = {
  ALL: "ALL",
  UNREAD: "UNREAD",
  CHAT: "CHAT",
};

export const CHAT_NOTIFICATION_TYPES = new Set([
  "ADMIN_CHAT",
  "ADMIN_BROADCAST",
]);

export function isChatNotification(notification) {
  return CHAT_NOTIFICATION_TYPES.has(notification?.tipo);
}

export function getNotificationPartnerId(notification) {
  if (!isChatNotification(notification)) return null;

  const meta = notification?.meta || {};
  return meta.chat_with || meta.sender_id || meta.sent_by || null;
}

export function getNotificationTypeLabel(type) {
  const labels = {
    ADMIN_CHAT: "Conversa administrativa",
    ADMIN_BROADCAST: "Comunicado administrativo",
    MENSAGEM: "Mensagem",
    INTERESSE: "Interesse",
    SISTEMA: "Sistema",
    FINANCEIRO: "Financeiro",
  };

  return labels[type] || type || "Geral";
}
