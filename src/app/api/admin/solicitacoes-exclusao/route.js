import {
  json,
  loadDeletionAudit,
  loadDeletionRequest,
  requireDeletionAdmin,
  safeErrorResponse,
  updateRequestStatus,
  validateMutationOrigin,
} from "./deletionAdminUtils";
import { serializeDeletionListItem } from "./deletionListSerializer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const access = await requireDeletionAdmin();
    if (!access.ok) return access.response;

    const [{ data, error }, audit] = await Promise.all([
      access.db
        .from("solicitacoes_exclusao")
        .select(
          "id, profile_type, subject_email_masked, nome, status, created_at, due_at, updated_at, version, handled_at, decision_reason, legal_basis, retention_note, completed_at, last_error_code",
        )
        .order("created_at", { ascending: false }),
      loadDeletionAudit(access.db, { limit: 30 }),
    ]);

    if (error) {
      const migrationMissing = ["42703", "PGRST204"].includes(error.code);
      const listError = new Error(
        migrationMissing
          ? "Execute a migração de governança das exclusões."
          : `Falha ao carregar solicitações: ${error.message}`,
      );
      listError.status = migrationMissing ? 503 : 500;
      throw listError;
    }

    const requests = (data || []).map(serializeDeletionListItem);
    const summary = requests.reduce(
      (acc, item) => {
        acc.total += 1;
        acc[item.status] = Number(acc[item.status] || 0) + 1;
        if (item.overdue) acc.overdue += 1;
        return acc;
      },
      {
        total: 0,
        PENDENTE: 0,
        EM_ANALISE: 0,
        AGUARDANDO_USUARIO: 0,
        APROVADA: 0,
        REJEITADA: 0,
        CANCELADA: 0,
        PROCESSANDO: 0,
        CONCLUIDA: 0,
        FALHA: 0,
        overdue: 0,
      },
    );

    return json({
      success: true,
      data: requests,
      summary,
      recentAudit: audit.items,
      auditAvailable: audit.available,
    });
  } catch (error) {
    return safeErrorResponse(
      error,
      "Não foi possível carregar as solicitações de exclusão.",
    );
  }
}

export async function PATCH(request) {
  try {
    const originResponse = validateMutationOrigin(request);
    if (originResponse) return originResponse;

    const access = await requireDeletionAdmin();
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const requestId = String(body?.id || "").trim();
    const action = String(body?.action || "").trim().toUpperCase();

    if (!requestId || !action) {
      return json(
        { success: false, message: "Solicitação ou ação não informada." },
        400,
      );
    }

    const current = await loadDeletionRequest(access.db, requestId);
    const updated = await updateRequestStatus(access.db, {
      request: current,
      admin: access.auth.admin,
      action,
      reason: body?.reason,
      legalBasis: body?.legal_basis,
      expectedUpdatedAt: body?.updated_at,
      expectedVersion: Number(body?.version || 0) || null,
      httpRequest: request,
    });

    return json({
      success: true,
      data: serializeDeletionListItem(updated),
      message:
        action === "START_REVIEW"
          ? "Análise iniciada."
          : action === "REQUEST_INFORMATION"
            ? "Solicitação marcada como aguardando o titular."
            : action === "APPROVE"
              ? "Solicitação aprovada para processamento."
              : action === "REJECT"
                ? "Solicitação rejeitada com justificativa registrada."
                : "Solicitação reaberta para análise.",
    });
  } catch (error) {
    return safeErrorResponse(
      error,
      "Não foi possível atualizar a solicitação de exclusão.",
    );
  }
}
