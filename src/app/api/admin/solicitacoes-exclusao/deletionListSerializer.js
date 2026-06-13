import { DELETION_STATUS } from "@/lib/lgpd/accountDeletionServer";

function maskPersonName(value) {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "Titular não identificado";
  if (parts.length === 1) {
    const first = parts[0];
    return `${first.slice(0, 1)}${"*".repeat(Math.max(2, first.length - 1))}`;
  }

  return parts
    .map((part, index) => {
      if (index === 0) {
        return `${part.slice(0, 1)}${"*".repeat(Math.max(2, part.length - 1))}`;
      }
      return `${part.slice(0, 1)}.`;
    })
    .join(" ");
}

export function serializeDeletionListItem(item) {
  const now = Date.now();
  const dueAt = item.due_at ? new Date(item.due_at).getTime() : null;
  const completed = [
    DELETION_STATUS.COMPLETED,
    DELETION_STATUS.REJECTED,
    DELETION_STATUS.CANCELLED,
  ].includes(item.status);

  return {
    id: item.id,
    display_name:
      item.status === DELETION_STATUS.COMPLETED
        ? "Titular excluído"
        : maskPersonName(item.nome),
    email_masked: item.subject_email_masked || "E-mail não disponível",
    profile_type: item.profile_type || "UNKNOWN",
    reason_preview:
      item.status === DELETION_STATUS.COMPLETED
        ? "Conteúdo minimizado após a conclusão."
        : "Motivo protegido — acesso auditado necessário.",
    status: item.status,
    created_at: item.created_at,
    due_at: item.due_at,
    updated_at: item.updated_at,
    version: Number(item.version || 1),
    handled_at: item.handled_at,
    decision_reason: item.decision_reason,
    legal_basis: item.legal_basis,
    retention_note: item.retention_note,
    completed_at: item.completed_at,
    last_error_code: item.last_error_code,
    overdue: Boolean(!completed && dueAt && dueAt < now),
  };
}
