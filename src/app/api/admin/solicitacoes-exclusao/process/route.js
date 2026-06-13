import {
  DELETION_STATUS,
  buildDeletionPreflight,
  executeAccountDeletion,
  hashRequestIp,
  normalizeDecisionReason,
  registerDeletionAudit,
} from "@/lib/lgpd/accountDeletionServer";
import { sendDeletionCompletionEmail } from "@/lib/lgpd/deletionEmail";

import {
  json,
  loadDeletionRequest,
  requireDeletionAdmin,
  safeErrorResponse,
  validateMutationOrigin,
} from "../deletionAdminUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONFIRMATION_PHRASE = "EXCLUIR DEFINITIVAMENTE";

function publicFailureCode(error) {
  const source = String(
    error?.code || error?.message || "PROCESS_FAILED",
  ).toLowerCase();

  if (source.includes("assinatura")) {
    return "SUBSCRIPTION_CANCELLATION_FAILED";
  }
  if (source.includes("auth")) return "AUTH_DELETION_FAILED";
  if (source.includes("perfil")) return "PROFILE_DELETION_FAILED";
  if (source.includes("caso")) return "CASE_CLEANUP_FAILED";
  return "ACCOUNT_DELETION_FAILED";
}

function rpcError(error, fallback) {
  const message = String(error?.message || fallback);
  const result = new Error(message);

  if (
    error?.code === "P0001" ||
    message.toLowerCase().includes("alterada por outro administrador") ||
    message.toLowerCase().includes("status não autorizado")
  ) {
    result.status = 409;
  } else if (["PGRST202", "42883"].includes(error?.code)) {
    result.message =
      "Execute a migração transacional das solicitações de exclusão.";
    result.status = 503;
  }

  return result;
}

export async function POST(request) {
  let access = null;
  let requestRow = null;
  let processingRow = null;
  let ipHash = null;

  try {
    const originResponse = validateMutationOrigin(request);
    if (originResponse) return originResponse;

    access = await requireDeletionAdmin();
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const requestId = String(body?.id || "").trim();
    const justification = normalizeDecisionReason(body?.justification);
    const confirmation = String(body?.confirmation || "")
      .trim()
      .toUpperCase();

    if (!requestId) {
      return json(
        { success: false, message: "Solicitação não informada." },
        400,
      );
    }

    if (confirmation !== CONFIRMATION_PHRASE) {
      return json(
        {
          success: false,
          message: `Digite “${CONFIRMATION_PHRASE}” para confirmar a operação.`,
        },
        400,
      );
    }

    if (justification.length < 15) {
      return json(
        {
          success: false,
          message:
            "Informe uma justificativa operacional com pelo menos 15 caracteres.",
        },
        400,
      );
    }

    if (body?.acknowledge_retention !== true) {
      return json(
        {
          success: false,
          message:
            "Confirme a ciência sobre a retenção legal restrita antes de continuar.",
        },
        400,
      );
    }

    requestRow = await loadDeletionRequest(access.db, requestId);

    if (
      ![DELETION_STATUS.APPROVED, DELETION_STATUS.FAILED].includes(
        requestRow.status,
      )
    ) {
      return json(
        {
          success: false,
          message:
            "A solicitação precisa estar aprovada antes do processamento definitivo.",
        },
        409,
      );
    }

    const preflight = await buildDeletionPreflight(access.db, requestRow);

    if (!preflight.canProcess) {
      return json(
        {
          success: false,
          code: "DELETION_BLOCKED",
          message:
            "A exclusão está bloqueada por pendências operacionais que precisam ser resolvidas.",
          blockers: preflight.blockers,
          warnings: preflight.warnings,
        },
        409,
      );
    }

    ipHash = hashRequestIp(request);
    const auditSnapshot = {
      profile_type: requestRow.profile_type,
      email_hash: requestRow.subject_email_hash,
      preflight: {
        counts: preflight.counts,
        warnings: preflight.warnings.map((item) => item.code),
      },
    };

    const { data: claimed, error: claimError } = await access.db.rpc(
      "claim_account_deletion_processing",
      {
        p_request_id: requestId,
        p_expected_status: requestRow.status,
        p_expected_version: Number(requestRow.version),
        p_expected_updated_at: body?.updated_at || requestRow.updated_at,
        p_admin_id: access.auth.admin.id,
        p_justification: justification,
        p_ip_hash: ipHash,
        p_snapshot: auditSnapshot,
      },
    );

    if (claimError) {
      throw rpcError(claimError, "Falha ao reservar o processamento.");
    }

    if (!claimed?.id) {
      const error = new Error(
        "A solicitação foi alterada por outro administrador. Atualize a página.",
      );
      error.status = 409;
      throw error;
    }

    processingRow = claimed;

    const result = await executeAccountDeletion(access.db, processingRow);
    const metadata = {
      ...(processingRow.metadata || {}),
      deletion_result: {
        auth_already_missing: result.authAlreadyMissing,
        subscription_cancelled: result.subscription.cancelled,
        subscription_already_missing: result.subscription.alreadyMissing,
      },
    };

    const completionChanges = {
      retention_note: result.retentionNote,
      auth_already_missing: result.authAlreadyMissing,
      subscription: result.subscription,
    };

    const { data: completed, error: completionError } = await access.db.rpc(
      "complete_account_deletion_processing",
      {
        p_request_id: requestId,
        p_admin_id: access.auth.admin.id,
        p_justification: justification,
        p_retention_note: result.retentionNote,
        p_metadata: metadata,
        p_snapshot: {
          profile_type: requestRow.profile_type,
          email_hash: requestRow.subject_email_hash,
        },
        p_changes: completionChanges,
        p_ip_hash: ipHash,
      },
    );

    if (completionError) {
      throw rpcError(
        completionError,
        "Conta removida, mas falhou o encerramento administrativo.",
      );
    }

    try {
      const emailResult = await sendDeletionCompletionEmail({
        email:
          result.subject.profile?.email || result.subject.authUser?.email,
        name:
          result.subject.profile?.name ||
          result.subject.authUser?.user_metadata?.full_name,
      });

      await registerDeletionAudit(access.db, {
        requestId,
        adminId: access.auth.admin.id,
        action: "EMAIL_SENT",
        previousStatus: DELETION_STATUS.COMPLETED,
        nextStatus: DELETION_STATUS.COMPLETED,
        snapshot: { email_hash: requestRow.subject_email_hash },
        changes: emailResult,
        ipHash,
      });
    } catch (emailError) {
      try {
        await registerDeletionAudit(access.db, {
          requestId,
          adminId: access.auth.admin.id,
          action: "EMAIL_FAILURE",
          previousStatus: DELETION_STATUS.COMPLETED,
          nextStatus: DELETION_STATUS.COMPLETED,
          snapshot: { email_hash: requestRow.subject_email_hash },
          changes: { error_code: "CONFIRMATION_EMAIL_FAILED" },
          ipHash,
        });
      } catch (auditError) {
        console.error(
          "[Admin/LGPD] Falha ao auditar erro de e-mail:",
          auditError.message,
        );
      }

      console.warn(
        "[Admin/LGPD] Exclusão concluída sem e-mail:",
        emailError.message,
      );
    }

    return json({
      success: true,
      data: completed,
      message:
        "Conta excluída, solicitação concluída e trilha de auditoria registrada.",
    });
  } catch (error) {
    if (access?.ok && processingRow?.id) {
      const errorCode = publicFailureCode(error);
      const failureReason =
        "O processamento encontrou uma falha técnica e requer revisão antes de uma nova tentativa.";

      const { error: failureError } = await access.db.rpc(
        "fail_account_deletion_processing",
        {
          p_request_id: processingRow.id,
          p_admin_id: access.auth.admin.id,
          p_error_code: errorCode,
          p_justification: failureReason,
          p_snapshot: {
            profile_type: processingRow.profile_type,
            email_hash: processingRow.subject_email_hash,
          },
          p_ip_hash: ipHash || hashRequestIp(request),
        },
      );

      if (failureError) {
        console.error(
          "[Admin/LGPD] Falha ao registrar processamento incompleto:",
          failureError.message,
        );
      }
    }

    return safeErrorResponse(
      error,
      "Não foi possível concluir a exclusão. A solicitação foi marcada para revisão.",
    );
  }
}
