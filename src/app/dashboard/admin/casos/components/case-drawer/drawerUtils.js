export function formatCaseDate(value) {
  if (!value) return "Não informado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Não informado";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000)
    .toISOString()
    .slice(0, 16);
}

export function isSafeExternalUrl(value) {
  const url = String(value || "").trim();
  return url.startsWith("https://") || url.startsWith("http://");
}

export function getAuditActionLabel(action) {
  const labels = {
    SENSITIVE_CASE_VIEWED: "Dados sensíveis visualizados",
    AUDIT_TRAIL_VIEWED: "Trilha de auditoria consultada",
    UPDATE_GOVERNANCE: "Governança atualizada",
    CLIENT_REENGAGEMENT_SENT: "Cliente reengajado",
    CASE_ARCHIVED: "Caso arquivado",
    CASE_RESTORED: "Caso restaurado",
    LEGAL_HOLD_ENABLED: "Preservação jurídica ativada",
    LEGAL_HOLD_DISABLED: "Preservação jurídica desativada",
  };

  return labels[action] || action || "Evento administrativo";
}
