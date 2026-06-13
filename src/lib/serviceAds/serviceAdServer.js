import {
  getRequestIpHash,
  getRequestUserAgent,
  hasValidMutationOrigin,
} from "../lawyerOpportunities/opportunityServerUtils";
import {
  isUuid,
  normalizeRequestId,
} from "../lawyerOpportunities/opportunityValidation";
import {
  messageJson,
  requireMessageUser,
} from "../messages/messageServer";
import {
  buildServiceAdSummary,
  buildServiceAdWhatsAppUrl,
  getServiceAdCategoryLabel,
  isValidServiceAdPhone,
  matchesServiceAdSearch,
  normalizeServiceAdCategory,
  normalizeServiceAdFilters,
  normalizeServiceAdText,
  serializeServiceAdSummary,
} from "./serviceAdValidation";

const MAX_ADVERTISERS = 2000;
const MAX_ADS = 2000;

function normalizedAdCategory(value) {
  return normalizeServiceAdCategory(value, "OUTROS");
}

function serializeAd(ad, advertiser) {
  const category = normalizedAdCategory(ad.categoria);

  return {
    id: ad.id,
    title: normalizeServiceAdText(ad.titulo || "Serviço jurídico", 140),
    description: normalizeServiceAdText(ad.descricao || "", 3000),
    category,
    categoryLabel: getServiceAdCategoryLabel(category),
    featured: Boolean(ad.em_destaque),
    createdAt: ad.created_at,
    advertiser: {
      id: advertiser?.id || ad.anunciante_id,
      name: normalizeServiceAdText(
        advertiser?.nome_empresa || "Parceiro do Social Jurídico",
        140,
      ),
    },
    contactAvailable: isValidServiceAdPhone(
      ad.contato || advertiser?.whatsapp,
    ),
  };
}

function matchesFeatured(item, featured) {
  if (featured === "FEATURED") return item.featured;
  if (featured === "STANDARD") return !item.featured;
  return true;
}

function compareAds(sort) {
  return (left, right) => {
    if (sort === "RELEVANCE" && left.featured !== right.featured) {
      return left.featured ? -1 : 1;
    }

    return (
      new Date(right.createdAt || 0).getTime() -
      new Date(left.createdAt || 0).getTime()
    );
  };
}

function idempotencyConflict() {
  const error = new Error("Chave de idempotência já utilizada em outro anúncio.");
  error.status = 409;
  error.code = "IDEMPOTENCY_CONFLICT";
  return error;
}

async function requireLawyerAccess(request) {
  return requireMessageUser(request, { lawyerOnly: true });
}

async function loadActiveAd(db, adId) {
  if (!isUuid(adId)) {
    return { ok: false, status: 400, message: "Anúncio inválido." };
  }

  const { data: ad, error: adError } = await db
    .from("anuncios")
    .select(
      "id, anunciante_id, titulo, descricao, categoria, contato, status, em_destaque, created_at",
    )
    .eq("id", adId)
    .maybeSingle();

  if (adError) throw adError;
  if (!ad || ![null, "ATIVO"].includes(ad.status)) {
    return {
      ok: false,
      status: 404,
      message: "Este anúncio não está mais disponível.",
    };
  }

  const { data: advertiser, error: advertiserError } = await db
    .from("anunciantes")
    .select("id, nome_empresa, whatsapp, ativo")
    .eq("id", ad.anunciante_id)
    .maybeSingle();

  if (advertiserError) throw advertiserError;
  if (!advertiser || advertiser.ativo !== true) {
    return {
      ok: false,
      status: 404,
      message: "O parceiro responsável não está disponível.",
    };
  }

  return {
    ok: true,
    ad: { ...ad, categoria: normalizedAdCategory(ad.categoria) },
    advertiser,
  };
}

async function findExistingAudit(access, requestId, action) {
  const { data, error } = await access.db
    .from("lawyer_service_ad_audit_logs")
    .select("ad_id, advertiser_id, action")
    .eq("lawyer_id", access.user.id)
    .eq("request_id", requestId)
    .eq("action", action)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function validateExistingAudit(existing, ad, advertiser, action) {
  if (!existing) return false;
  if (
    existing.action !== action ||
    String(existing.ad_id) !== String(ad.id) ||
    String(existing.advertiser_id) !== String(advertiser.id)
  ) {
    throw idempotencyConflict();
  }
  return true;
}

async function recordAudit(
  access,
  request,
  { requestId, ad, advertiser, action, metadata = {} },
) {
  const existing = await findExistingAudit(access, requestId, action);
  if (validateExistingAudit(existing, ad, advertiser, action)) return true;

  const { error } = await access.db
    .from("lawyer_service_ad_audit_logs")
    .insert([
      {
        request_id: requestId,
        lawyer_id: access.user.id,
        advertiser_id: advertiser.id,
        ad_id: ad.id,
        action,
        category: normalizedAdCategory(ad.categoria),
        metadata,
        ip_hash: getRequestIpHash(request),
        user_agent: getRequestUserAgent(request),
        created_at: new Date().toISOString(),
      },
    ]);

  if (!error) return false;
  if (error.code !== "23505") throw error;

  const racedAudit = await findExistingAudit(access, requestId, action);
  validateExistingAudit(racedAudit, ad, advertiser, action);
  return true;
}

export async function listLawyerServiceAds(request) {
  try {
    const access = await requireLawyerAccess(request);
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const filters = normalizeServiceAdFilters(searchParams);

    const { data: advertisers, error: advertisersError } = await access.db
      .from("anunciantes")
      .select("id, nome_empresa, whatsapp")
      .eq("ativo", true)
      .limit(MAX_ADVERTISERS);

    if (advertisersError) throw advertisersError;

    const advertiserMap = new Map(
      (advertisers || []).map((advertiser) => [advertiser.id, advertiser]),
    );
    const advertiserIds = [...advertiserMap.keys()];

    if (!advertiserIds.length) {
      return messageJson({
        success: true,
        data: [],
        filters,
        pagination: { page: 1, pages: 1, total: 0, limit: filters.limit },
        summary: {
          total: 0,
          featured: 0,
          prepostos: 0,
          diligencias: 0,
          outros: 0,
          advertisers: 0,
        },
      });
    }

    const { data: ads, error: adsError } = await access.db
      .from("anuncios")
      .select(
        "id, anunciante_id, titulo, descricao, categoria, contato, status, em_destaque, created_at",
      )
      .in("anunciante_id", advertiserIds)
      .or("status.eq.ATIVO,status.is.null")
      .order("em_destaque", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(MAX_ADS);

    if (adsError) throw adsError;

    const allItems = (ads || [])
      .map((ad) => serializeAd(ad, advertiserMap.get(ad.anunciante_id)))
      .filter((item) => item.advertiser.id);
    const summary = serializeServiceAdSummary(buildServiceAdSummary(allItems));

    const filtered = allItems
      .filter(
        (item) =>
          filters.category === "ALL" || item.category === filters.category,
      )
      .filter((item) => matchesFeatured(item, filters.featured))
      .filter((item) => matchesServiceAdSearch(item, filters.q))
      .sort(compareAds(filters.sort));

    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / filters.limit));
    const safePage = Math.min(filters.page, pages);
    const start = (safePage - 1) * filters.limit;

    return messageJson({
      success: true,
      data: filtered.slice(start, start + filters.limit),
      filters: {
        q: filters.q,
        category: filters.category,
        featured: filters.featured,
        sort: filters.sort,
      },
      pagination: {
        page: safePage,
        pages,
        total,
        limit: filters.limit,
      },
      summary,
      limits: {
        ads: MAX_ADS,
        advertisers: MAX_ADVERTISERS,
        adsTruncated: allItems.length >= MAX_ADS,
        advertisersTruncated: advertiserIds.length >= MAX_ADVERTISERS,
      },
      privacy: {
        rawPhoneReturned: false,
        inactiveAdvertisersReturned: false,
      },
    });
  } catch (error) {
    console.error("[Advogado/AnúnciosServiços][GET] Erro:", error);
    return messageJson(
      {
        success: false,
        message: "Não foi possível carregar os anúncios e serviços.",
      },
      500,
    );
  }
}

function serviceAdMutationError(error, fallback) {
  const missingMigration = ["PGRST205", "42P01"].includes(error?.code);
  return {
    status: missingMigration ? 503 : Number(error?.status || 500),
    message: missingMigration
      ? "Execute a migração de auditoria dos anúncios antes de continuar."
      : error?.message || fallback,
  };
}

export async function recordLawyerServiceAdView(request, adId) {
  try {
    if (!hasValidMutationOrigin(request)) {
      return messageJson(
        { success: false, message: "Origem da requisição inválida." },
        403,
      );
    }

    const access = await requireLawyerAccess(request);
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const requestId = normalizeRequestId(body?.requestId);
    if (!requestId) {
      return messageJson(
        { success: false, message: "Identificador da visualização inválido." },
        400,
      );
    }

    const loaded = await loadActiveAd(access.db, adId);
    if (!loaded.ok) {
      return messageJson(
        { success: false, message: loaded.message },
        loaded.status,
      );
    }

    const alreadyProcessed = await recordAudit(access, request, {
      requestId,
      ad: loaded.ad,
      advertiser: loaded.advertiser,
      action: "AD_VIEWED",
      metadata: { source: "LAWYER_DASHBOARD" },
    });

    return messageJson({ success: true, alreadyProcessed });
  } catch (error) {
    console.error("[Advogado/AnúnciosServiços/View][POST] Erro:", error);
    const failure = serviceAdMutationError(
      error,
      "Não foi possível registrar a visualização.",
    );
    return messageJson(
      { success: false, message: failure.message },
      failure.status,
    );
  }
}

export async function openLawyerServiceAdContact(request, adId) {
  try {
    if (!hasValidMutationOrigin(request)) {
      return messageJson(
        { success: false, message: "Origem da requisição inválida." },
        403,
      );
    }

    const access = await requireLawyerAccess(request);
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const requestId = normalizeRequestId(body?.requestId);
    if (!requestId) {
      return messageJson(
        { success: false, message: "Identificador do contato inválido." },
        400,
      );
    }

    const loaded = await loadActiveAd(access.db, adId);
    if (!loaded.ok) {
      return messageJson(
        { success: false, message: loaded.message },
        loaded.status,
      );
    }

    const whatsappUrl = buildServiceAdWhatsAppUrl(
      loaded.ad.contato || loaded.advertiser.whatsapp,
      loaded.ad.titulo,
    );
    if (!whatsappUrl) {
      return messageJson(
        {
          success: false,
          message: "O parceiro ainda não possui um WhatsApp válido.",
        },
        409,
      );
    }

    const alreadyProcessed = await recordAudit(access, request, {
      requestId,
      ad: loaded.ad,
      advertiser: loaded.advertiser,
      action: "CONTACT_OPENED",
      metadata: { channel: "WHATSAPP", source: "LAWYER_DASHBOARD" },
    });

    return messageJson({
      success: true,
      alreadyProcessed,
      data: {
        url: whatsappUrl,
        advertiserName: normalizeServiceAdText(
          loaded.advertiser.nome_empresa || "Parceiro",
          140,
        ),
      },
    });
  } catch (error) {
    console.error("[Advogado/AnúnciosServiços/Contato][POST] Erro:", error);
    const failure = serviceAdMutationError(
      error,
      "Não foi possível abrir o contato do parceiro.",
    );
    return messageJson(
      { success: false, message: failure.message },
      failure.status,
    );
  }
}
