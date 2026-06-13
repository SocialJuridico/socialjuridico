import {
  isReviewUuid,
  normalizeReviewComment,
  requireReviewAdmin,
  reviewJson,
  reviewRpcError,
  safeReviewError,
  serializeReview,
  validateReviewMutationOrigin,
} from "./reviewServer";

const REVIEW_SELECT =
  "id, cliente_id, advogado_id, caso_id, nota, justificativa, status, created_at, updated_at, version, moderated_at, moderation_reason";

async function enrichAdminReviews(db, reviews) {
  const items = reviews || [];
  const lawyerIds = [...new Set(items.map((item) => item.advogado_id).filter(Boolean))];
  const clientIds = [...new Set(items.map((item) => item.cliente_id).filter(Boolean))];
  const caseIds = [...new Set(items.map((item) => item.caso_id).filter(Boolean))];

  const [lawyersResult, clientsResult, casesResult] = await Promise.all([
    lawyerIds.length
      ? db.from("advogados").select("id, name").in("id", lawyerIds)
      : Promise.resolve({ data: [], error: null }),
    clientIds.length
      ? db.from("clientes").select("id, name").in("id", clientIds)
      : Promise.resolve({ data: [], error: null }),
    caseIds.length
      ? db.from("casos").select("id, titulo").in("id", caseIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (lawyersResult.error) {
    throw new Error(`Falha ao consultar advogados: ${lawyersResult.error.message}`);
  }
  if (clientsResult.error) {
    throw new Error(`Falha ao consultar clientes: ${clientsResult.error.message}`);
  }
  if (casesResult.error) {
    throw new Error(`Falha ao consultar casos: ${casesResult.error.message}`);
  }

  const maps = {
    lawyers: new Map((lawyersResult.data || []).map((item) => [item.id, item.name])),
    clients: new Map((clientsResult.data || []).map((item) => [item.id, item.name])),
    cases: new Map((casesResult.data || []).map((item) => [item.id, item.titulo])),
  };

  return items.map((item) => serializeReview(item, maps));
}

export async function listAdminReviews(request) {
  try {
    const access = await requireReviewAdmin();
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const lawyerId = String(searchParams.get("advogado_id") || "").trim();
    const status = String(searchParams.get("status") || "ALL")
      .trim()
      .toUpperCase();
    const auditFor = String(searchParams.get("audit_for") || "").trim();
    const requestedLimit = Number(searchParams.get("limit") || 500);
    const limit = Number.isInteger(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 500)
      : 500;

    if (lawyerId && !isReviewUuid(lawyerId)) {
      return reviewJson(
        { success: false, message: "ID do advogado inválido." },
        400,
      );
    }

    if (auditFor) {
      if (!isReviewUuid(auditFor)) {
        return reviewJson(
          { success: false, message: "ID da avaliação inválido." },
          400,
        );
      }

      const { data, error } = await access.db
        .from("lawyer_review_audit_logs")
        .select(
          "id, review_id, actor_id, actor_role, action, previous_status, next_status, reason, changes, created_at",
        )
        .eq("review_id", auditFor)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        throw reviewRpcError(error, "Não foi possível carregar a auditoria.");
      }

      return reviewJson({ success: true, data: data || [] });
    }

    if (!["ALL", "PUBLISHED", "HIDDEN", "INVALID"].includes(status)) {
      return reviewJson(
        { success: false, message: "Status de avaliação inválido." },
        400,
      );
    }

    let query = access.db
      .from("avaliacoes_advogado")
      .select(REVIEW_SELECT)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (lawyerId) query = query.eq("advogado_id", lawyerId);
    if (status !== "ALL") query = query.eq("status", status);

    const { data, error } = await query;
    if (error) {
      throw reviewRpcError(error, "Não foi possível carregar as avaliações.");
    }

    const reviews = await enrichAdminReviews(access.db, data || []);
    return reviewJson({ success: true, data: reviews });
  } catch (error) {
    return safeReviewError(error, "Não foi possível carregar as avaliações.");
  }
}

export async function moderateAdminReview(request) {
  try {
    const originResponse = validateReviewMutationOrigin(request);
    if (originResponse) return originResponse;

    const access = await requireReviewAdmin();
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const reviewId = String(body?.id || "").trim();
    const nextStatus = String(body?.status || "").trim().toUpperCase();
    const reason = normalizeReviewComment(body?.reason);
    const version = Number(body?.version);

    if (!isReviewUuid(reviewId)) {
      return reviewJson(
        { success: false, message: "Avaliação inválida." },
        400,
      );
    }
    if (!["PUBLISHED", "HIDDEN"].includes(nextStatus)) {
      return reviewJson(
        { success: false, message: "Status de moderação inválido." },
        400,
      );
    }
    if (!Number.isInteger(version) || version < 1) {
      return reviewJson(
        { success: false, message: "Versão da avaliação inválida." },
        400,
      );
    }
    if (nextStatus === "HIDDEN" && String(reason || "").length < 10) {
      return reviewJson(
        {
          success: false,
          message: "Informe uma justificativa com pelo menos 10 caracteres.",
        },
        400,
      );
    }

    const { data, error } = await access.db.rpc("moderate_lawyer_review", {
      p_review_id: reviewId,
      p_admin_id: access.auth.admin.id,
      p_next_status: nextStatus,
      p_reason: reason,
      p_expected_version: version,
    });

    if (error) {
      throw reviewRpcError(error, "Não foi possível moderar a avaliação.");
    }

    return reviewJson({
      success: true,
      data,
      message:
        nextStatus === "HIDDEN"
          ? "Avaliação ocultada e reputação recalculada."
          : "Avaliação restaurada e reputação recalculada.",
    });
  } catch (error) {
    return safeReviewError(error, "Não foi possível moderar a avaliação.");
  }
}
