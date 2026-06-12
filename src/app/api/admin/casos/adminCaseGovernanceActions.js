import {
  CASE_RISK_LEVELS,
  CASE_STAGES,
  json,
  normalizeText,
  upsertGovernance,
} from "./adminCases";
import {
  mutationResponse,
  normalizeOptionalDate,
  recordMutationAudit,
} from "./adminCaseMutationHelpers";

export async function updateCaseGovernance({
  db,
  request,
  adminId,
  caseId,
  body,
}) {
  const operationalStage = String(body?.operationalStage || "").toUpperCase();
  const riskLevel = String(body?.riskLevel || "").toUpperCase();
  const nextActionAt = normalizeOptionalDate(
    body?.nextActionAt,
    "Próxima ação",
  );
  const retentionUntil = normalizeOptionalDate(
    body?.retentionUntil,
    "Data de revisão da retenção",
  );

  if (!CASE_STAGES.has(operationalStage)) {
    return json(
      { success: false, message: "Etapa operacional inválida." },
      400,
    );
  }

  if (operationalStage === "ARCHIVED") {
    return json(
      {
        success: false,
        message: "Use a ação específica de arquivamento.",
      },
      409,
    );
  }

  if (!CASE_RISK_LEVELS.has(riskLevel)) {
    return json(
      { success: false, message: "Nível de atenção inválido." },
      400,
    );
  }

  const governance = await upsertGovernance(db, caseId, {
    operational_stage: operationalStage,
    risk_level: riskLevel,
    assigned_admin_id: adminId,
    next_action_at: nextActionAt,
    retention_until: retentionUntil,
  });

  const auditRecorded = await recordMutationAudit(db, request, {
    adminId,
    caseId,
    action: "UPDATE_GOVERNANCE",
    purpose: "CASE_OPERATIONS",
    metadata: {
      operationalStage,
      riskLevel,
      nextActionAt,
      retentionUntil,
    },
  });

  return mutationResponse(
    "Governança do caso atualizada.",
    { governance },
    auditRecorded,
  );
}

export async function updateCaseLegalHold({
  db,
  request,
  adminId,
  caseId,
  body,
}) {
  const legalHold = Boolean(body?.legalHold);
  const reason = normalizeText(body?.reason, 1000);

  if (reason.length < 10) {
    return json(
      {
        success: false,
        message: "Informe uma justificativa com ao menos 10 caracteres.",
      },
      400,
    );
  }

  const governance = await upsertGovernance(db, caseId, {
    legal_hold: legalHold,
    assigned_admin_id: adminId,
  });

  const auditRecorded = await recordMutationAudit(db, request, {
    adminId,
    caseId,
    action: legalHold
      ? "LEGAL_HOLD_ENABLED"
      : "LEGAL_HOLD_DISABLED",
    purpose: "LEGAL_PRESERVATION",
    justification: reason,
  });

  return mutationResponse(
    legalHold
      ? "Preservação jurídica ativada."
      : "Preservação jurídica desativada.",
    { governance },
    auditRecorded,
  );
}
