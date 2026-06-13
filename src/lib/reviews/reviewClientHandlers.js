import { requireClientUser } from "@/lib/clientDashboard/clientServer";

import {
  getReviewRequestHashes,
  isReviewUuid,
  normalizeReviewComment,
  normalizeReviewRating,
  reviewJson,
  reviewRpcError,
  safeReviewError,
  serializeReview,
  validateReviewMutationOrigin,
} from "./reviewServer";

const REVIEW_SELECT =
  "id, cliente_id, advogado_id, caso_id, nota, justificativa, status, created_at, updated_at, version, moderated_at, moderation_reason";

async function enrichClientReviews(db, reviews) {
  const items = reviews || [];
  const lawyerIds = [...new Set(items.map((item) => item.advogado_id).filter(Boolean))];
  const caseIds = [...new Set(items.map((item) => item.caso_id).filter(Boolean))];

  const [lawyersResult, casesResult] = await Promise.all([
    lawyerIds.length
      ? db.from("advogados").select("id, name").in("id", lawyerIds)
      : Promise.resolve({ data: [], error: null }),
    caseIds.length
      ? db.from("casos").select("id, titulo").in("id", caseIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (lawyersResult.error) {
    throw new Error(`Falha ao consultar advogados: ${lawyersResult.error.message}`);
  }
  if (casesResult.error) {
    throw new Error(`Falha ao consultar casos: ${casesResult.error.message}`);
  }

  const maps = {
    lawyers: new Map((lawyersResult.data || []).map((item) => [item.id, item.name])),
    clients: new Map(),
    cases: new Map((casesResult.data || []).map((item) => [item.id, item.titulo])),
  };

  return items.map((item) => serializeReview(item, maps));
}

export async function submitClientReview(request) {
  try {
    const originResponse = validateReviewMutationOrigin(request);
    if (originResponse) return originResponse;

    const access = await requireClientUser(request);
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const lawyerId = String(body?.advogado_id || "").trim();
    const caseId = String(body?.caso_id || "").trim();
    const rating = normalizeReviewRating(body?.nota);
    const comment = normalizeReviewComment(body?.justificativa);

    if (!isReviewUuid(lawyerId) || !isReviewUuid(caseId) || rating === null) {
      return reviewJson(
        { success: false, message: "Advogado, caso ou nota inválidos." },
        400,
      );
    }

    if (rating <= 2 && String(comment || "").length < 10) {
      return reviewJson(
        {
          success: false,
          message:
            "Explique brevemente o motivo para avaliações de uma ou duas estrelas.",
        },
        400,
      );
    }

    const hashes = getReviewRequestHashes(request);
    const { data, error } = await access.db.rpc("submit_lawyer_review", {
      p_client_id: access.user.id,
      p_lawyer_id: lawyerId,
      p_case_id: caseId,
      p_rating: rating,
      p_comment: comment,
      p_ip_hash: hashes.ipHash,
      p_user_agent_hash: hashes.userAgentHash,
    });

    if (error) {
      throw reviewRpcError(error, "Não foi possível registrar a avaliação.");
    }

    return reviewJson(
      {
        success: true,
        data,
        message: "Avaliação publicada com sucesso.",
      },
      201,
    );
  } catch (error) {
    return safeReviewError(error, "Não foi possível registrar a avaliação.");
  }
}

export async function listClientReviews(request) {
  try {
    const access = await requireClientUser(request);
    if (!access.ok) return access.response;

    const { data, error } = await access.db
      .from("avaliacoes_advogado")
      .select(REVIEW_SELECT)
      .eq("cliente_id", access.user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      throw reviewRpcError(error, "Não foi possível carregar suas avaliações.");
    }

    const reviews = await enrichClientReviews(access.db, data || []);
    return reviewJson({ success: true, data: reviews });
  } catch (error) {
    return safeReviewError(error, "Não foi possível carregar suas avaliações.");
  }
}
