import {
  clampInteger,
  normalizeSearch,
  normalizeState,
  safePublicUrl,
} from "./opportunityValidation";
import {
  opportunityJson,
  requireLawyerAccess,
} from "./opportunityServerUtils";
import {
  isSocialCase,
  normalizePriority,
  normalizeSocialType,
} from "@/lib/clientDashboard/caseClassification";

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
        name: normalizeSearch(
          item.name || item.fileName || "Documento anexado",
          120,
        ),
      };
    })
    .filter(Boolean)
    .slice(0, 20);
}

function normalizeNextSteps(value) {
  let list = value;
  if (typeof value === "string") {
    try {
      list = JSON.parse(value);
    } catch {
      list = [];
    }
  }
  if (!Array.isArray(list)) return [];

  return list
    .map((step) => ({
      titulo: normalizeSearch(step?.titulo, 120),
      descricao: normalizeSearch(step?.descricao, 800),
    }))
    .filter((step) => step.titulo || step.descricao)
    .slice(0, 6);
}

function readMeta(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function serializeCase(item, negotiatingLawyers = []) {
  const meta = readMeta(item.ai_meta);
  const priority = normalizePriority(item.prioridade);
  const socialType = normalizeSocialType(item.tipo_social);

  return {
    id: item.id,
    title: normalizeSearch(item.titulo || "Caso jurídico", 180),
    description: normalizeSearch(item.descricao, 5000),
    practiceArea: normalizeSearch(
      item.area_atuacao || "Direito Geral",
      100,
    ),
    city: normalizeSearch(item.cidade || "", 100),
    state: normalizeState(item.estado),
    status: item.status,
    createdAt: item.created_at,
    attachments: normalizeAttachments(item.anexos),
    audioUrl: safePublicUrl(item.audio_url),
    videoUrl: safePublicUrl(item.video_url || item.video_link),
    priority,
    socialType,
    isSocial: isSocialCase(socialType),
    isEmergency: item.is_emergencia === true,
    intencaoFechamento:
      item.intencao_fechamento === null || item.intencao_fechamento === undefined
        ? null
        : Number(item.intencao_fechamento),
    riskToLife: item.risco_vida === true,
    nextSteps: normalizeNextSteps(item.ai_proximos_passos),
    aiSummary: normalizeSearch(meta.resumo, 900),
    priorityReason: normalizeSearch(meta.prioridadeJustificativa, 900),
    socialTypeReason: normalizeSearch(meta.tipoSocialJustificativa, 900),
    transcript: normalizeSearch(meta.transcricao, 12000),
    negotiatingLawyers,
  };
}

async function loadNegotiatingLawyers(db, caseIds) {
  if (!caseIds.length) return new Map();

  const { data: interests, error } = await db
    .from("case_interests")
    .select("case_id, lawyer_id")
    .in("case_id", caseIds)
    .eq("status", "NEGOTIATING");

  if (error || !interests?.length) return new Map();

  const lawyerIds = [
    ...new Set(interests.map((item) => item.lawyer_id).filter(Boolean)),
  ];
  if (!lawyerIds.length) return new Map();

  const { data: lawyers, error: lawyerError } = await db
    .from("advogados")
    .select("id, name, avatar")
    .in("id", lawyerIds);
  if (lawyerError) return new Map();

  const lawyerById = new Map((lawyers || []).map((item) => [item.id, item]));
  const grouped = new Map();

  interests.forEach((interest) => {
    const lawyer = lawyerById.get(interest.lawyer_id);
    if (!lawyer) return;

    const current = grouped.get(interest.case_id) || [];
    current.push({
      id: lawyer.id,
      name: normalizeSearch(lawyer.name || "Advogado", 120),
      avatar: safePublicUrl(lawyer.avatar),
    });
    grouped.set(interest.case_id, current.slice(0, 8));
  });

  return grouped;
}

export async function listLawyerOpportunities(request) {
  try {
    const access = await requireLawyerAccess(request);
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const search = normalizeSearch(searchParams.get("q"), 120);
    const area = normalizeSearch(searchParams.get("area"), 100);
    const state = normalizeState(searchParams.get("state"));
    const page = clampInteger(searchParams.get("page"), 1, 1, 1000);
    const limit = clampInteger(searchParams.get("limit"), 12, 6, 30);

    // emergency: "true" só emergências, "false" exclui emergências, ausente = todos.
    const emergencyParam = searchParams.get("emergency");
    const emergency =
      emergencyParam === "true"
        ? true
        : emergencyParam === "false"
          ? false
          : null;

    // feed: platform|media|oraculos|legado mapeiam para as faixas de
    // intenção da RPC; emergência e radar nunca enviam faixa (emergency já
    // os isola). "legado" são casos anteriores à triagem (sem score) — não
    // se misturam com "platform" (alta intenção já triada).
    const feedParam = searchParams.get("feed");
    const intentTier =
      feedParam === "media"
        ? "MEDIA"
        : feedParam === "oraculos"
          ? "ORACULO"
          : feedParam === "legado"
            ? "LEGADO"
            : feedParam === "platform"
              ? "ALTA"
              : null;

    const { data: result, error } = await access.db.rpc(
      "list_lawyer_opportunities",
      {
        p_lawyer_id: access.user.id,
        p_search: search,
        p_area: area,
        p_state: state,
        p_page: page,
        p_limit: limit,
        p_emergency: emergency,
        p_intent_tier: intentTier,
      },
    );

    if (error) throw error;

    const items = Array.isArray(result?.items) ? result.items : [];
    const total = Number(result?.total || 0);
    const resolvedLimit = clampInteger(result?.limit, limit, 6, 30);
    const resolvedPage = clampInteger(result?.page, page, 1, 1000);
    const pages = Math.max(1, Math.ceil(total / resolvedLimit));
    const negotiatingByCase = await loadNegotiatingLawyers(
      access.db,
      items.map((item) => item.id).filter(Boolean),
    );

    return opportunityJson({
      success: true,
      data: items.map((item) =>
        serializeCase(item, negotiatingByCase.get(item.id) || []),
      ),
      filters: {
        areas: Array.isArray(result?.areas)
          ? result.areas
              .map((item) => normalizeSearch(item, 100))
              .filter(Boolean)
          : [],
      },
      pagination: {
        page: resolvedPage,
        limit: resolvedLimit,
        total,
        pages,
      },
      summary: {
        available: total,
        negotiating: Number(result?.negotiating || 0),
        countAlta: Number(result?.count_alta || 0),
        countMedia: Number(result?.count_media || 0),
        countOraculo: Number(result?.count_oraculo || 0),
        countLegado: Number(result?.count_legado || 0),
      },
    });
  } catch (error) {
    console.error("[Oportunidades][GET] Falha:", error);
    return opportunityJson(
      {
        success: false,
        message: "Não foi possível carregar as oportunidades.",
      },
      500,
    );
  }
}
