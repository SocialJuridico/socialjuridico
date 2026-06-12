export const MESSAGE_FILTERS = {
  ALL: "ALL",
  CHAT: "CHAT",
  BROADCAST: "BROADCAST",
};

export function getConversationTypeLabel(type) {
  if (type === "ADMIN_CHAT") return "Conversa";
  if (type === "ADMIN_BROADCAST") return "Comunicado";
  return "Mensagem";
}
