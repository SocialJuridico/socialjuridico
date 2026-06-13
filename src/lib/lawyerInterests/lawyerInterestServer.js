import { isUuid, normalizeRequestId, normalizeSearch, safePublicUrl } from "../lawyerOpportunities/opportunityValidation";
import {
  getRequestIpHash,
  getRequestUserAgent,
  hasValidMutationOrigin,
  opportunityJson,
  requireLawyerAccess,
} from "../lawyerOpportunities/opportunityServerUtils";
import {
  buildInterestSummary,
  canCancelInterest,
  canOpenNegotiation,
  normalizeInterestFilters,
  resolveInterestStatusList,
} from "./lawyerInterestValidation";

function normalizeAttachments(value) {
  const items = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? (() => {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [value];
          } catch {
            return [value];
          }
        })()
      : [];

  return items
    .map((item) => {
      if (typeof item === "string") {
        const url = safePublicUrl(item);
        return url ? { url, name: "Documento anexado" } : null;
      }

      if (!item || typeof item !== "object") return null;
      const url = safePublicUrl(item.url || item.path || item.publicUrl);
      if (!url) return null;

      return {
        url,
        name: normalizeSearch(item.name || item.fileName || "Documento anexado", 120),
      };
    })
    .filter(Boolean)
    .slice(0, 20);
}

function serializeCase(item) {
  if (!item) return null;

  return {
    id: item.id,
    title: normalizeSearch(item.titulo || "Caso jurídico", 180),
    description: normalizeSearch(item.descricao, 5000),
    practiceArea: normalizeSearch(item.area_atuacao || "Direito Geral", 100),
    city: normalizeSearch(item.cidade || "", 100),
    state: normalizeSearch(item.estado || "", 2).toUpperCase(),
    status: item.status || null,
    createdAt: item.created_at,
    attachments: normalizeAttachments(item.anexos),
    audioUrl: safePublicUrl(item.audio_url),
    videoUrl: safePublicUrl(item.video_url || item.video_link),
  };
}

function serializeInterest(interest, caseById) {
  const relatedCase = serializeCase(caseById.get(interest.case_id));

  return {
    id: interest.id,
    caseId: interest.case_id,
    status: interest.status,
    createdAt: interest.created_at,
    canCancel: canCancelInterest(interest.status),
    canOpenNegotiation: canOpenNegotiation(interest.status),
    case: relatedCase || {
      id: interest.case_id,
      title: "Caso não localizado",
      description: "Este caso não foi localizado ou pode ter sido removido.",
      practiceArea: "Direito Geral",
      city: "",
      state: "",
      status: null,
      createdAt: interest.created_at,
      attachments: [],
      audioUrl: null,
      videoUrl: null,
    },
  };
}

function matchesSearch(item, query) {
  if (!query) return true;
  const haystack = [
    item.case?.title,
    item.case?.description,
    item.case?.practiceArea,
    item.case?.city,
    item.case?.state,
    item.status,
  ]
    .filter(Boolean)
    .join(" ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const needle = query
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return haystack.includes(needle);
}

async function loadCasesById(db, caseIds) {
  if (!caseIds.length) return new Map();

  const { data, error } = await db
    .from("casos")
    .select("id, titulo, descricao, area_atuacao, cidade, estado, status, created_at, anexos, audio_url, video_url, video_link")
    .in("id", caseIds);

  if (error) throw error;
  return new Map((data || []).map((item) => [item.id, item]));
}

export async function listLawyerInterests(request) {
  try {
    const access = await requireLawyerAccess(request);
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const { q, status, page, limit } = normalizeInterestFilters(searchParams);
    const statuses = resolveInterestStatusList(status);

    const { data: allInterests, error: summaryError } = await access.db
      .from("case_interests")
      .select("id, case_id, status, created_at")
      .eq("lawyer_id", access.user.id)
      .in("status", ["PENDING", "NEGOTIATING", "HIRED", "DECLINED"])
      .order("created_at", { ascending: false })
      .limit(500);

    if (summaryError) throw summaryError;

    const summary = buildInterestSummary(allInterests || []);
    const filteredByStatus = (allInterests || []).filter((item) => statuses.includes(item.status));
    const caseIds = [...new Set(filteredByStatus.map((item) => item.case_id).filter(Boolean))];
    const caseById = await loadCasesById(access.db, caseIds);
    const serialized = filteredByStatus
      .map((item) => serializeInterest(item, caseById))
      .filter((item) => matchesSearch(item, q));

    const total = serialized.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, pages);
    const start = (safePage - 1) * limit;
    const paginated = serialized.slice(start, start + limit);

    const areas = [...new Set(serialized.map((item) => item.case?.practiceArea).filter(Boolean))].sort();

    return opportunityJson({
      success: true,
      data: paginated,
      filters: {
        status,
        q,
        areas,
      },
      pagination: {
        page: safePage,
        limit,
        total,
        pages,
      },
      summary,
    });
  } catch (error) {
    console.error("[DeclareiInteresse][GET] Falha:", error);
    return opportunityJson(
      {
        success: false,
        message: "Não foi possível carregar seus interesses.",
      },
      500,
    );
  }
}

export async function cancelLawyerInterest(request) {
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
    const url = new URL(request.url);
    const interestId = String(body?.interestId || url.searchParams.get("interestId") || "").trim();
    const requestId = normalizeRequestId(body?.requestId || url.searchParams.get("requestId"));

    if (!isUuid(interestId) || !requestId) {
      return opportunityJson(
        {
          success: false,
          message: "Dados do cancelamento são inválidos.",
        },
        400,
      );
    }

    const { data: transaction, error: transactionError } = await access.db.rpc(
      "cancel_lawyer_case_interest",
      {
        p_interest_id: interestId,
        p_lawyer_id: access.user.id,
        p_request_id: requestId,
        p_ip_hash: getRequestIpHash(request),
        p_user_agent: getRequestUserAgent(request),
      },
    );

    if (transactionError) {
      const message = transactionError.message || "Não foi possível desfazer interesse.";
      const status = message.includes("mensagens vinculadas") || message.includes("já iniciou negociação") ? 409 : 400;
      return opportunityJson({ success: false, message }, status);
    }

    return opportunityJson({
      success: true,
      message: transaction?.already_processed
        ? "Cancelamento já processado."
        : "Interesse desfeito com segurança. 1 Juri foi reembolsado.",
      data: {
        interestId: transaction?.interest_id,
        caseId: transaction?.case_id,
        newBalance: transaction?.new_balance,
        reimbursedJuris: transaction?.reimbursed_juris || 1,
        alreadyProcessed: Boolean(transaction?.already_processed),
      },
    });
  } catch (error) {
    console.error("[DeclareiInteresse][DELETE] Falha:", error);
    return opportunityJson(
      {
        success: false,
        message: "Não foi possível desfazer interesse agora.",
      },
      500,
    );
  }
}
