import { runOpportunityInterestSideEffects } from "./opportunitySideEffects";
import {
  isUuid,
  normalizeRequestId,
} from "./opportunityValidation";
import {
  getRequestIpHash,
  getRequestUserAgent,
  hasValidMutationOrigin,
  opportunityJson,
  requireLawyerAccess,
} from "./opportunityServerUtils";

export async function manifestLawyerOpportunityInterest(request) {
  try {
    if (!hasValidMutationOrigin(request)) {
      return opportunityJson(
        { success: false, message: "Origem da requisição inválida." },
        403,
      );
    }

    const access = await requireLawyerAccess(request);
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const caseId = String(body?.caseId || "").trim();
    const requestId = normalizeRequestId(body?.requestId);

    if (!isUuid(caseId) || !requestId) {
      return opportunityJson(
        {
          success: false,
          message: "Dados da manifestação são inválidos.",
        },
        400,
      );
    }

    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
    const { count: recentActions, error: rateLimitError } = await access.db
      .from("lawyer_opportunity_audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("lawyer_id", access.user.id)
      .gte("created_at", oneMinuteAgo);

    if (rateLimitError) throw rateLimitError;
    if ((recentActions || 0) >= 10) {
      return opportunityJson(
        {
          success: false,
          message: "Muitas tentativas em sequência. Aguarde um instante.",
        },
        429,
      );
    }

    const { data: lawyer, error: lawyerError } = await access.db
      .from("advogados")
      .select("id, name")
      .eq("id", access.user.id)
      .maybeSingle();

    if (lawyerError || !lawyer) {
      return opportunityJson(
        { success: false, message: "Perfil de advogado não encontrado." },
        404,
      );
    }

    const { data: transaction, error: transactionError } =
      await access.db.rpc("manifest_lawyer_case_interest", {
        p_case_id: caseId,
        p_lawyer_id: access.user.id,
        p_request_id: requestId,
        p_ip_hash: getRequestIpHash(request),
        p_user_agent: getRequestUserAgent(request),
      });

    if (transactionError) {
      const message =
        transactionError.message ||
        "Não foi possível manifestar interesse.";
      const status =
        transactionError.code === "P0002"
          ? 402
          : transactionError.code === "P0003"
            ? 403
            : message.includes("não está mais disponível")
              ? 409
              : 400;

      return opportunityJson({ success: false, message }, status);
    }

    await runOpportunityInterestSideEffects({
      db: access.db,
      transaction,
      lawyerName: lawyer.name,
    });

    return opportunityJson({
      success: true,
      message: transaction?.already_processed
        ? "Manifestação já processada."
        : "Interesse manifestado com sucesso. O cliente foi notificado.",
      data: {
        caseId: transaction?.case_id,
        interestId: transaction?.interest_id,
        newBalance: transaction?.new_balance,
        alreadyProcessed: Boolean(transaction?.already_processed),
      },
    });
  } catch (error) {
    console.error("[Oportunidades][POST] Falha:", error);
    return opportunityJson(
      {
        success: false,
        message: "Não foi possível manifestar interesse agora.",
      },
      500,
    );
  }
}
