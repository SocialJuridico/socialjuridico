import {
  DETAIL_PURPOSES,
  buildDeletionPreflight,
  hashRequestIp,
  registerDeletionAudit,
} from "@/lib/lgpd/accountDeletionServer";

import {
  json,
  loadDeletionAudit,
  loadDeletionRequest,
  requireDeletionAdmin,
  safeErrorResponse,
  validateMutationOrigin,
} from "../deletionAdminUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const originResponse = validateMutationOrigin(request);
    if (originResponse) return originResponse;

    const access = await requireDeletionAdmin();
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const requestId = String(body?.id || "").trim();
    const purpose = String(body?.purpose || "").trim().toUpperCase();
    const justification = String(body?.justification || "").trim();

    if (!requestId || !DETAIL_PURPOSES.has(purpose)) {
      return json(
        { success: false, message: "Finalidade de acesso inválida." },
        400,
      );
    }

    if (justification.length < 15 || justification.length > 500) {
      return json(
        {
          success: false,
          message:
            "Informe uma justificativa entre 15 e 500 caracteres para acessar os dados protegidos.",
        },
        400,
      );
    }

    const requestRow = await loadDeletionRequest(access.db, requestId);
    const [preflight, audit] = await Promise.all([
      buildDeletionPreflight(access.db, requestRow),
      loadDeletionAudit(access.db, { requestId, limit: 50 }),
    ]);

    const fieldsAccessed = [
      "nome_confirmado",
      "email",
      "motivo",
      "tipo_perfil",
      "status_conta",
      "casos_vinculados",
      "assinatura",
      "transacoes_pendentes",
    ];

    await registerDeletionAudit(access.db, {
      requestId,
      adminId: access.auth.admin.id,
      action: "VIEW_DETAILS",
      purpose,
      justification,
      previousStatus: requestRow.status,
      nextStatus: requestRow.status,
      fieldsAccessed,
      snapshot: {
        profile_type: requestRow.profile_type,
        email_hash: requestRow.subject_email_hash,
        status: requestRow.status,
      },
      ipHash: hashRequestIp(request),
    });

    return json({
      success: true,
      data: {
        request: {
          id: requestRow.id,
          nome: requestRow.nome,
          motivo: requestRow.motivo,
          status: requestRow.status,
          profile_type: requestRow.profile_type,
          email_masked: requestRow.subject_email_masked,
          created_at: requestRow.created_at,
          due_at: requestRow.due_at,
          updated_at: requestRow.updated_at,
          version: Number(requestRow.version || 1),
          handled_at: requestRow.handled_at,
          decision_reason: requestRow.decision_reason,
          legal_basis: requestRow.legal_basis,
          retention_note: requestRow.retention_note,
          completed_at: requestRow.completed_at,
          last_error_code: requestRow.last_error_code,
        },
        subject: preflight.subject,
        counts: preflight.counts,
        blockers: preflight.blockers,
        warnings: preflight.warnings,
        canProcess: preflight.canProcess,
        audit: audit.items,
      },
    });
  } catch (error) {
    return safeErrorResponse(
      error,
      "Não foi possível abrir os detalhes protegidos da solicitação.",
    );
  }
}
