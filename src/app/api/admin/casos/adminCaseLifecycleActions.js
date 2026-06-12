import {
  fetchGovernanceMap,
  json,
  normalizeText,
  upsertGovernance,
} from "./adminCases";
import {
  mutationResponse,
  recordMutationAudit,
  updateSourceCaseStatus,
} from "./adminCaseMutationHelpers";

async function rollbackSourceStatus(db, caseId, status) {
  await updateSourceCaseStatus(
    db,
    caseId,
    status,
    new Date().toISOString(),
  ).catch((error) => {
    console.error("[Admin/Casos] Falha ao reverter status do caso:", error);
  });
}

export async function archiveAdminCase({
  db,
  request,
  adminId,
  caseId,
  caseItem,
  body,
}) {
  const reason = normalizeText(body?.reason, 1000);

  if (reason.length < 10) {
    return json(
      { success: false, message: "Informe o motivo do arquivamento." },
      400,
    );
  }

  const governanceResult = await fetchGovernanceMap(db, [caseId]);
  const currentGovernance = governanceResult.map.get(caseId);

  if (currentGovernance?.legal_hold) {
    return json(
      {
        success: false,
        message:
          "O caso está sob preservação jurídica e não pode ser arquivado.",
      },
      409,
    );
  }

  const archivedAt = new Date().toISOString();
  const sourceCase = await updateSourceCaseStatus(
    db,
    caseId,
    "CANCELADO",
    archivedAt,
  );

  let governance;

  try {
    governance = await upsertGovernance(db, caseId, {
      operational_stage: "ARCHIVED",
      assigned_admin_id: adminId,
      archived_at: archivedAt,
      archived_by: adminId,
      archive_reason: reason,
    });
  } catch (error) {
    await rollbackSourceStatus(db, caseId, caseItem.status || "ABERTO");
    throw error;
  }

  const auditRecorded = await recordMutationAudit(db, request, {
    adminId,
    caseId,
    action: "CASE_ARCHIVED",
    purpose: "CASE_LIFECYCLE_MANAGEMENT",
    justification: reason,
    metadata: {
      previousStatus: caseItem.status,
      currentStatus: sourceCase.status,
    },
  });

  return mutationResponse(
    "Caso arquivado sem destruição do histórico.",
    { governance, sourceCase },
    auditRecorded,
  );
}

export async function restoreAdminCase({
  db,
  request,
  adminId,
  caseId,
  caseItem,
}) {
  const restoredAt = new Date().toISOString();
  const sourceCase = await updateSourceCaseStatus(
    db,
    caseId,
    "ABERTO",
    restoredAt,
  );

  let governance;

  try {
    governance = await upsertGovernance(db, caseId, {
      operational_stage: "NEW",
      assigned_admin_id: adminId,
      archived_at: null,
      archived_by: null,
      archive_reason: null,
    });
  } catch (error) {
    await rollbackSourceStatus(
      db,
      caseId,
      caseItem.status || "CANCELADO",
    );
    throw error;
  }

  const auditRecorded = await recordMutationAudit(db, request, {
    adminId,
    caseId,
    action: "CASE_RESTORED",
    purpose: "CASE_LIFECYCLE_MANAGEMENT",
    metadata: {
      previousStatus: caseItem.status,
      currentStatus: sourceCase.status,
    },
  });

  return mutationResponse(
    "Caso restaurado para o fluxo operacional.",
    { governance, sourceCase },
    auditRecorded,
  );
}
