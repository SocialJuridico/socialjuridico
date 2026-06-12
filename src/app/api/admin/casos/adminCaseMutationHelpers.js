import {
  json,
  recordCaseAudit,
} from "./adminCases";

export function normalizeOptionalDate(value, label) {
  if (!value) return null;
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    const error = new Error(`${label} inválida.`);
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  return date.toISOString();
}

export async function fetchAdminCase(db, caseId) {
  const { data, error } = await db
    .from("casos")
    .select("id, titulo, status")
    .eq("id", caseId)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao validar caso: ${error.message}`);
  }

  return data;
}

export async function updateSourceCaseStatus(
  db,
  caseId,
  status,
  updatedAt,
) {
  const { data, error } = await db
    .from("casos")
    .update({ status, updated_at: updatedAt })
    .eq("id", caseId)
    .select("id, status, updated_at")
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao atualizar o status do caso: ${error.message}`);
  }

  if (!data) {
    throw new Error("O caso não foi atualizado no banco de dados.");
  }

  return data;
}

export async function recordMutationAudit(db, request, event) {
  const recorded = await recordCaseAudit(db, request, event);

  if (!recorded) {
    console.error("[Admin/Casos] Mutação concluída sem confirmação de auditoria.", {
      caseId: event.caseId,
      action: event.action,
    });
  }

  return recorded;
}

export function mutationResponse(message, data, auditRecorded) {
  return json({
    success: true,
    message: auditRecorded
      ? message
      : `${message} A auditoria requer verificação.`,
    data: { ...data, auditRecorded },
  });
}
