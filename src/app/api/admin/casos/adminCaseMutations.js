import {
  isValidUuid,
  json,
  requireAdminCaseAccess,
} from "./adminCases";
import {
  updateCaseGovernance,
  updateCaseLegalHold,
} from "./adminCaseGovernanceActions";
import {
  archiveAdminCase,
  restoreAdminCase,
} from "./adminCaseLifecycleActions";
import { fetchAdminCase } from "./adminCaseMutationHelpers";

const VALID_ACTIONS = new Set([
  "UPDATE_GOVERNANCE",
  "ARCHIVE",
  "RESTORE",
  "SET_LEGAL_HOLD",
]);

export async function patchAdminCase(request) {
  try {
    const access = await requireAdminCaseAccess();
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const caseId = String(body?.caseId || "").trim();
    const action = String(body?.action || "").trim().toUpperCase();

    if (!isValidUuid(caseId)) {
      return json({ success: false, message: "Caso inválido." }, 400);
    }

    if (!VALID_ACTIONS.has(action)) {
      return json({ success: false, message: "Ação inválida." }, 400);
    }

    const caseItem = await fetchAdminCase(access.db, caseId);

    if (!caseItem) {
      return json({ success: false, message: "Caso não encontrado." }, 404);
    }

    const context = {
      db: access.db,
      request,
      adminId: access.auth.user.id,
      caseId,
      caseItem,
      body,
    };

    if (action === "UPDATE_GOVERNANCE") {
      return updateCaseGovernance(context);
    }

    if (action === "SET_LEGAL_HOLD") {
      return updateCaseLegalHold(context);
    }

    if (action === "ARCHIVE") {
      return archiveAdminCase(context);
    }

    return restoreAdminCase(context);
  } catch (error) {
    console.error("[Admin/Casos][PATCH] Erro:", error);

    if (error?.code === "GOVERNANCE_MIGRATION_REQUIRED") {
      return json({ success: false, message: error.message }, 503);
    }

    if (error?.code === "VALIDATION_ERROR") {
      return json({ success: false, message: error.message }, 400);
    }

    return json(
      {
        success: false,
        message: "Não foi possível atualizar o caso.",
      },
      500,
    );
  }
}

export async function deleteAdminCase() {
  return json(
    {
      success: false,
      message:
        "A exclusão destrutiva foi desativada. Utilize o arquivamento controlado do caso.",
    },
    405,
  );
}
