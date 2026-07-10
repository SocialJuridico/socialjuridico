import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { deriveAcademicIfApproved } from "@/lib/oraculo/radarAcademic/radarAcademicCaseGeneration";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_STATUS = new Set([
  "pendente",
  "aprovado",
  "rejeitado",
  "arquivado",
]);
const ALLOWED_URGENCY = new Set(["baixa", "media", "alta"]);

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function normalizeInteger(value, fallback, min, max) {
  const number = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isInteger(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function normalizeUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function mapSourceType(source, originalUrl) {
  const value = `${source || ""} ${originalUrl || ""}`.toLowerCase();

  if (value.includes("facebook")) return "Facebook";
  if (value.includes("instagram")) return "Instagram";
  if (value.includes("reddit")) return "Reddit";
  if (value.includes("twitter") || value.includes("x.com")) return "X";
  if (value.includes("jusbrasil")) return "JusBrasil";
  if (value.includes("brave")) return "Outros";
  return "Outros";
}

async function requireAdmin() {
  const auth = await getAuthenticatedAdmin();

  if (!auth.ok) {
    return {
      ok: false,
      response: json({ success: false, message: auth.message }, auth.status),
    };
  }

  if (!supabaseAdmin) {
    return {
      ok: false,
      response: json(
        {
          success: false,
          message: "Serviço administrativo indisponível no servidor.",
        },
        503,
      ),
    };
  }

  return { ok: true, auth, db: supabaseAdmin };
}

async function attachClicks(db, opportunities) {
  const ids = opportunities.map((item) => item.id).filter(Boolean);
  if (!ids.length) return opportunities;

  const { data: clicks, error: clicksError } = await db
    .from("radar_cliques")
    .select("id, radar_oportunidade_id, advogado_id, criado_em")
    .in("radar_oportunidade_id", ids)
    .order("criado_em", { ascending: false });

  if (clicksError) {
    console.warn(
      "[Admin/Radar][GET] Cliques indisponíveis; listando oportunidades sem detalhes:",
      clicksError.message,
    );
    return opportunities.map((item) => ({ ...item, cliques: [] }));
  }

  const lawyerIds = [
    ...new Set((clicks || []).map((click) => click.advogado_id).filter(Boolean)),
  ];
  let lawyerMap = new Map();

  if (lawyerIds.length) {
    const { data: lawyers, error: lawyersError } = await db
      .from("advogados")
      .select("id, name, email")
      .in("id", lawyerIds);

    if (lawyersError) {
      console.warn(
        "[Admin/Radar][GET] Advogados dos cliques indisponíveis:",
        lawyersError.message,
      );
    } else {
      lawyerMap = new Map((lawyers || []).map((lawyer) => [lawyer.id, lawyer]));
    }
  }

  const clicksByOpportunity = new Map();

  for (const click of clicks || []) {
    const current = clicksByOpportunity.get(click.radar_oportunidade_id) || [];
    current.push({
      id: click.id,
      criado_em: click.criado_em,
      advogado_id: click.advogado_id,
      advogados: lawyerMap.get(click.advogado_id) || null,
    });
    clicksByOpportunity.set(click.radar_oportunidade_id, current);
  }

  return opportunities.map((item) => ({
    ...item,
    cliques: clicksByOpportunity.get(item.id) || [],
  }));
}

export async function GET(request) {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const status = String(searchParams.get("status") || "").trim();
    const category = String(searchParams.get("categoria") || "").trim();
    const source = String(searchParams.get("fonte") || "").trim();
    const sourceType = String(searchParams.get("fonte_tipo") || "").trim();
    const reported = searchParams.get("reportado") === "true";
    const page = normalizeInteger(searchParams.get("page"), 1, 1, 100000);
    const limit = normalizeInteger(searchParams.get("limit"), 10, 1, 50);

    if (status && !ALLOWED_STATUS.has(status)) {
      return json({ success: false, message: "Status inválido." }, 400);
    }

    let query = access.db
      .from("radar_oportunidades")
      .select("*", { count: "exact" });

    if (status) query = query.eq("status", status);
    if (category) query = query.eq("categoria", category);
    if (source) query = query.eq("fonte", source);
    if (sourceType) query = query.eq("fonte_tipo", sourceType);
    if (reported) query = query.eq("reportado", true);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query
      .order("criado_em", { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(`Falha ao consultar oportunidades: ${error.message}`);
    }

    const opportunities = await attachClicks(access.db, data || []);
    const total = Number(count || 0);

    return json({
      success: true,
      data: opportunities,
      pagination: {
        total,
        page,
        limit,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("[Admin/Radar][GET] Erro:", error);
    return json(
      {
        success: false,
        message: "Não foi possível carregar as oportunidades do Radar.",
      },
      500,
    );
  }
}

export async function POST(request) {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const title = String(body?.titulo || "").trim();
    const category = String(body?.categoria || "").trim();
    const source = String(body?.fonte || "").trim();
    const originalUrl = normalizeUrl(body?.url_original);
    const excerpt = String(body?.trecho_publico || "").trim();
    const city = String(body?.cidade || "").trim();
    const state = String(body?.estado || "").trim().toUpperCase();
    const summary = String(body?.resumo_ia || "").trim();
    const score = normalizeInteger(body?.score_intencao, 0, 0, 100);
    const urgency = String(body?.urgencia || "media").toLowerCase();
    const status = String(body?.status || "pendente").toLowerCase();

    if (!title || !category || !source || !originalUrl) {
      return json(
        {
          success: false,
          message: "Título, categoria, fonte e URL original são obrigatórios.",
        },
        400,
      );
    }

    if (excerpt.length > 500) {
      return json(
        {
          success: false,
          message: "O trecho público não pode exceder 500 caracteres.",
        },
        400,
      );
    }

    if (!ALLOWED_URGENCY.has(urgency)) {
      return json({ success: false, message: "Urgência inválida." }, 400);
    }

    if (!ALLOWED_STATUS.has(status)) {
      return json({ success: false, message: "Status inválido." }, 400);
    }

    const now = new Date().toISOString();
    const { data, error } = await access.db
      .from("radar_oportunidades")
      .insert([
        {
          titulo: title.slice(0, 240),
          categoria: category.slice(0, 100),
          fonte: source.slice(0, 100),
          url_original: originalUrl,
          trecho_publico: excerpt || null,
          cidade: city ? city.slice(0, 120) : null,
          estado: state ? state.slice(0, 2) : null,
          score_intencao: score,
          urgencia: urgency,
          resumo_ia: summary ? summary.slice(0, 2000) : null,
          status,
          aprovado_por:
            status === "aprovado" ? access.auth.user.id : null,
          publicado_em: status === "aprovado" ? now : null,
          fonte_tipo: mapSourceType(source, originalUrl),
          detectado_em: now,
          criado_em: now,
          origem_automatica: false,
          raw_fonte: source,
        },
      ])
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return json(
          {
            success: false,
            message: "Esta URL já está cadastrada no Radar.",
            isDuplicate: true,
          },
          409,
        );
      }

      throw new Error(`Falha ao criar oportunidade: ${error.message}`);
    }

    // Oportunidade já criada aprovada deriva o caso acadêmico (não-fatal).
    const academicDerived = await deriveAcademicIfApproved(data);

    return json(
      {
        success: true,
        data,
        academicDerived,
        message: "Oportunidade cadastrada com sucesso.",
      },
      201,
    );
  } catch (error) {
    console.error("[Admin/Radar][POST] Erro:", error);
    return json(
      {
        success: false,
        message: "Não foi possível cadastrar a oportunidade.",
      },
      500,
    );
  }
}
