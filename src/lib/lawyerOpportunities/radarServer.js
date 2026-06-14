import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authServerUtils";
import { checkAndNotifyLowBalance } from "@/lib/jurisHelper";
import { hasTrustedMutationOrigin } from "@/lib/publicAppOrigin";
import { supabaseAdmin } from "@/lib/supabase";

import {
  clampInteger,
  isUuid,
  normalizeRequestId,
  normalizeSearch,
  normalizeState,
  safePublicUrl,
} from "./opportunityValidation";

const BLOCKED_SUBSCRIPTIONS = new Set([
  "canceled",
  "cancelled",
  "unpaid",
  "blocked",
]);

const RADAR_FIELDS = [
  "id",
  "titulo",
  "categoria",
  "fonte",
  "url_original",
  "trecho_publico",
  "cidade",
  "estado",
  "score_intencao",
  "urgencia",
  "resumo_ia",
  "status",
  "criado_em",
  "detectado_em",
  "publicado_em",
  "fonte_tipo",
  "reportado",
].join(",");

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
}

function hasValidMutationOrigin(request) {
  return hasTrustedMutationOrigin(request);
}

function getRequestIpHash(request) {
  const rawIp =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const salt =
    process.env.AUDIT_IP_HASH_SALT ||
    process.env.SUPABASE_JWT_SECRET ||
    "sj";
  return createHash("sha256").update(`${salt}:${rawIp}`).digest("hex");
}

function isEligibleRadarLawyer(profile) {
  if (!profile) return false;
  const activePlan =
    profile.plan_type === "START" ||
    profile.plan_type === "PRO" ||
    profile.is_premium === true;
  return (
    activePlan &&
    !BLOCKED_SUBSCRIPTIONS.has(
      String(profile.subscription_status || "").toLowerCase(),
    )
  );
}

async function requireRadarLawyer(request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return {
      ok: false,
      response: json({ success: false, message: "Não autorizado." }, 401),
    };
  }

  if (!supabaseAdmin) {
    return {
      ok: false,
      response: json(
        { success: false, message: "Serviço do Radar indisponível." },
        503,
      ),
    };
  }

  const { data: profile, error } = await supabaseAdmin
    .from("advogados")
    .select(
      "id, plan_type, is_premium, subscription_status, balance, oab_verification_status",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) {
    return {
      ok: false,
      response: json(
        { success: false, message: "Acesso exclusivo para advogados." },
        403,
      ),
    };
  }

  if (
    String(profile.oab_verification_status || "").toUpperCase() === "ERROR"
  ) {
    return {
      ok: false,
      response: json(
        {
          success: false,
          message: "O perfil profissional não está habilitado.",
        },
        403,
      ),
    };
  }

  return {
    ok: true,
    user,
    profile,
    db: supabaseAdmin,
    eligible: isEligibleRadarLawyer(profile),
  };
}

function serializeRadarOpportunity(item, clicked, demo) {
  if (demo) {
    return {
      id: item.id,
      titulo: normalizeSearch(item.titulo || "Oportunidade pública", 180),
      categoria: normalizeSearch(item.categoria || "Direito Geral", 100),
      cidade: normalizeSearch(item.cidade, 100),
      estado: normalizeState(item.estado),
      score_intencao: clampInteger(item.score_intencao, 0, 0, 100),
      urgencia: normalizeSearch(item.urgencia || "baixa", 20),
      criado_em: item.criado_em,
      detectado_em: item.detectado_em,
      publicado_em: item.publicado_em,
      url_original: null,
      trecho_publico:
        "Conteúdo protegido. Ative o plano START ou PRO para analisar esta oportunidade.",
      resumo_ia: "Resumo inteligente disponível para assinantes.",
      fonte: "Fonte protegida",
      fonte_tipo: "Protegida",
      reportado: false,
      clicado: false,
    };
  }

  return {
    id: item.id,
    titulo: normalizeSearch(item.titulo || "Oportunidade pública", 180),
    categoria: normalizeSearch(item.categoria || "Direito Geral", 100),
    fonte: normalizeSearch(item.fonte || "Fonte pública", 100),
    url_original: clicked ? safePublicUrl(item.url_original) : null,
    trecho_publico: normalizeSearch(item.trecho_publico, 1800),
    cidade: normalizeSearch(item.cidade, 100),
    estado: normalizeState(item.estado),
    score_intencao: clampInteger(item.score_intencao, 0, 0, 100),
    urgencia: normalizeSearch(item.urgencia || "baixa", 20),
    resumo_ia: normalizeSearch(item.resumo_ia, 1800),
    status: item.status,
    criado_em: item.criado_em,
    detectado_em: item.detectado_em,
    publicado_em: item.publicado_em,
    fonte_tipo: normalizeSearch(item.fonte_tipo, 80),
    reportado: Boolean(item.reportado),
    clicado: clicked,
  };
}

export async function listRadarOpportunities(request) {
  try {
    const access = await requireRadarLawyer(request);
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const countOnly = searchParams.get("count_only") === "true";
    const approvedCutoff = new Date(
      Date.now() - 5 * 24 * 60 * 60 * 1000,
    ).toISOString();

    let query = access.db
      .from("radar_oportunidades")
      .select(countOnly ? "id" : RADAR_FIELDS, {
        count: "exact",
        head: countOnly,
      })
      .eq("status", "aprovado")
      .gt("publicado_em", approvedCutoff)
      .or("cliques_count.is.null,cliques_count.lt.5");

    if (countOnly) {
      const { count, error } = await query;
      if (error) throw error;
      return json({ success: true, count: count || 0 });
    }

    const categoria = normalizeSearch(searchParams.get("categoria"), 100);
    const estado = normalizeState(searchParams.get("estado"));
    const cidade = normalizeSearch(searchParams.get("cidade"), 100);
    const fonte = normalizeSearch(searchParams.get("fonte"), 100);
    const urgencia = normalizeSearch(searchParams.get("urgencia"), 20);
    const scoreMin = clampInteger(
      searchParams.get("score_min"),
      0,
      0,
      100,
    );
    const page = clampInteger(searchParams.get("page"), 1, 1, 1000);
    const limit = clampInteger(searchParams.get("limit"), 9, 6, 30);

    if (categoria) query = query.eq("categoria", categoria);
    if (estado) query = query.eq("estado", estado);
    if (cidade) query = query.ilike("cidade", `%${cidade}%`);
    if (fonte) query = query.eq("fonte", fonte);
    if (urgencia) query = query.eq("urgencia", urgencia);
    if (scoreMin > 0) query = query.gte("score_intencao", scoreMin);

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, error, count } = await query
      .order("detectado_em", { ascending: false })
      .range(from, to);

    if (error) throw error;

    const opportunityIds = (data || []).map((item) => item.id);
    let clickedIds = new Set();
    if (access.eligible && opportunityIds.length) {
      const { data: clicks, error: clickError } = await access.db
        .from("radar_cliques")
        .select("radar_oportunidade_id")
        .eq("advogado_id", access.user.id)
        .in("radar_oportunidade_id", opportunityIds);
      if (clickError) throw clickError;
      clickedIds = new Set(
        (clicks || []).map((item) => item.radar_oportunidade_id),
      );
    }

    const total = count || 0;
    return json({
      success: true,
      data: (data || []).map((item) =>
        serializeRadarOpportunity(
          item,
          clickedIds.has(item.id),
          !access.eligible,
        ),
      ),
      is_demo: !access.eligible,
      plan: access.profile.plan_type || "FREE",
      pagination: {
        total,
        page,
        limit,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("[Radar][GET] Falha:", error);
    return json(
      {
        success: false,
        message: "Não foi possível carregar o Radar Jurídico.",
      },
      500,
    );
  }
}

export async function accessRadarOpportunity(request) {
  try {
    if (!hasValidMutationOrigin(request)) {
      return json(
        { success: false, message: "Origem da requisição inválida." },
        403,
      );
    }

    const access = await requireRadarLawyer(request);
    if (!access.ok) return access.response;
    if (!access.eligible) {
      return json(
        {
          success: false,
          message: "Acesso restrito a advogados START e PRO ativos.",
        },
        403,
      );
    }

    const body = await request.json().catch(() => null);
    const opportunityId = String(body?.radar_oportunidade_id || "").trim();
    const requestId = normalizeRequestId(body?.request_id);
    if (!isUuid(opportunityId) || !requestId) {
      return json(
        { success: false, message: "Oportunidade inválida." },
        400,
      );
    }

    const { data: transaction, error } = await access.db.rpc(
      "process_radar_opportunity_access",
      {
        p_opportunity_id: opportunityId,
        p_lawyer_id: access.user.id,
        p_request_id: requestId,
        p_ip_hash: getRequestIpHash(request),
        p_user_agent: normalizeSearch(
          request.headers.get("user-agent"),
          500,
        ),
      },
    );

    if (error) {
      const message =
        error.message || "Não foi possível acessar esta oportunidade.";
      const status =
        error.code === "P0002"
          ? 402
          : error.code === "P0003"
            ? 403
            : error.code === "P0004"
              ? 410
              : 409;
      return json({ success: false, message }, status);
    }

    const url = safePublicUrl(transaction?.url_original);
    if (!url) {
      return json(
        {
          success: false,
          message: "A publicação original possui um link inválido.",
        },
        422,
      );
    }

    if (
      Number(transaction?.deducted || 0) > 0 &&
      !transaction?.already_processed
    ) {
      await checkAndNotifyLowBalance(
        access.user.id,
        transaction.previous_balance,
        transaction.new_balance,
      );
    }

    return json({
      success: true,
      message: transaction?.already_granted
        ? "Acesso já liberado anteriormente."
        : "Acesso liberado com sucesso.",
      data: {
        opportunityId,
        url,
        deducted: Number(transaction?.deducted || 0),
        newBalance: Number(transaction?.new_balance || 0),
        alreadyGranted: Boolean(transaction?.already_granted),
      },
    });
  } catch (error) {
    console.error("[Radar][ACCESS] Falha:", error);
    return json(
      {
        success: false,
        message: "Não foi possível liberar o acesso agora.",
      },
      500,
    );
  }
}

export async function reportRadarOpportunity(request) {
  try {
    if (!hasValidMutationOrigin(request)) {
      return json(
        { success: false, message: "Origem da requisição inválida." },
        403,
      );
    }

    const access = await requireRadarLawyer(request);
    if (!access.ok) return access.response;
    if (!access.eligible) {
      return json(
        {
          success: false,
          message: "Acesso restrito a advogados START e PRO ativos.",
        },
        403,
      );
    }

    const body = await request.json().catch(() => null);
    const opportunityId = String(body?.radar_oportunidade_id || "").trim();
    const reason = normalizeSearch(body?.motivo, 500);
    if (!isUuid(opportunityId) || reason.length < 10) {
      return json(
        {
          success: false,
          message: "Informe um motivo entre 10 e 500 caracteres.",
        },
        400,
      );
    }

    const since = new Date(Date.now() - 60_000).toISOString();
    const { count } = await access.db
      .from("radar_opportunity_reports")
      .select("id", { count: "exact", head: true })
      .eq("lawyer_id", access.user.id)
      .gte("updated_at", since);
    if ((count || 0) >= 10) {
      return json(
        {
          success: false,
          message: "Muitos reportes em sequência. Aguarde um instante.",
        },
        429,
      );
    }

    const { error } = await access.db.rpc("report_radar_opportunity", {
      p_opportunity_id: opportunityId,
      p_lawyer_id: access.user.id,
      p_reason: reason,
    });
    if (error) {
      return json(
        {
          success: false,
          message:
            error.message || "Não foi possível registrar o reporte.",
        },
        400,
      );
    }

    return json({
      success: true,
      message: "Oportunidade sinalizada. Nossa equipe fará a revisão.",
    });
  } catch (error) {
    console.error("[Radar][REPORT] Falha:", error);
    return json(
      {
        success: false,
        message: "Não foi possível registrar o reporte agora.",
      },
      500,
    );
  }
}
