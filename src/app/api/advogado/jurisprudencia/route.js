import crypto from "node:crypto";

import OpenAI from "openai";

import { getAuthenticatedUser } from "@/lib/authServerUtils";
import { getUserPlanLimits } from "@/lib/planUtils";
import { supabaseAdmin } from "@/lib/supabase";
import {
  getRequestIpHash,
  getRequestUserAgent,
  hasValidMutationOrigin,
} from "@/lib/lawyerOpportunities/opportunityServerUtils";
import { isClientUuid } from "@/lib/lawyerClients/clientValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL })
  : null;

const PRO_PLANS = new Set(["PRO", "ENTERPRISE_PRO", "ENTERPRISE_PRO_PLUS"]);

const RESPONSE_SCHEMA = {
  name: "jurisprudencia_socialjuridico",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "topic",
      "area",
      "courtFocus",
      "executiveSummary",
      "trend",
      "confidence",
      "theses",
      "precedents",
      "risks",
      "counterArguments",
      "searchTerms",
      "strategy",
      "disclaimer",
    ],
    properties: {
      topic: { type: "string" },
      area: { type: "string" },
      courtFocus: { type: "string" },
      executiveSummary: { type: "string" },
      trend: { type: "string", enum: ["Favorável", "Neutra", "Desfavorável", "Controvertida"] },
      confidence: { type: "string", enum: ["Baixa", "Média", "Alta"] },
      theses: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "summary", "useCase"],
          properties: {
            title: { type: "string" },
            summary: { type: "string" },
            useCase: { type: "string" },
          },
        },
      },
      precedents: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["court", "orientation", "summary", "howToSearch"],
          properties: {
            court: { type: "string" },
            orientation: { type: "string" },
            summary: { type: "string" },
            howToSearch: { type: "string" },
          },
        },
      },
      risks: { type: "array", items: { type: "string" } },
      counterArguments: { type: "array", items: { type: "string" } },
      searchTerms: { type: "array", items: { type: "string" } },
      strategy: { type: "array", items: { type: "string" } },
      disclaimer: { type: "string" },
    },
  },
};

function json(payload, status = 200) {
  return Response.json(payload, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
}

function normalizeText(value, max = 3000) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim()
    .slice(0, max);
}

function normalizeRole(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function readPermissions(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function normalizePlan(profile) {
  const raw = String(profile?.plan_type || "FREE").trim().toUpperCase();
  if (profile?.is_premium === true && raw === "FREE") return "PRO";
  return raw;
}

async function loadOfficePlan(profile) {
  if (!profile.escritorio_id) return null;
  const { data, error } = await supabaseAdmin
    .from("escritorios")
    .select("plano")
    .eq("id", profile.escritorio_id)
    .maybeSingle();
  if (error) throw error;
  const plan = String(data?.plano || "").toLowerCase();
  if (plan.startsWith("pro_plus")) return "ENTERPRISE_PRO_PLUS";
  if (plan.startsWith("pro")) return "ENTERPRISE_PRO";
  return "ENTERPRISE_START";
}

async function requireJurisAccess(request) {
  const user = await getAuthenticatedUser(request);
  if (!user || !supabaseAdmin) {
    return { ok: false, response: json({ success: false, message: "Não autorizado." }, 401) };
  }

  const { data: profile, error } = await supabaseAdmin
    .from("advogados")
    .select("id, name, email, cargo, permissoes, is_premium, plan_type, escritorio_id, oab_verification_status")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!profile) {
    return { ok: false, response: json({ success: false, message: "Acesso exclusivo para advogados." }, 403) };
  }
  if (profile.oab_verification_status === "ERROR") {
    return {
      ok: false,
      response: json({ success: false, blocked: true, message: "Acesso suspenso por inconsistências na OAB." }, 403),
    };
  }

  const role = normalizeRole(profile.cargo);
  const permissions = readPermissions(profile.permissoes);
  if (role === "secretaria") {
    return {
      ok: false,
      response: json({ success: false, permissionDenied: true, message: "Acesso restrito para este perfil." }, 403),
    };
  }
  if (role === "estagiario" && permissions.ferr_jurisprudencia !== true) {
    return {
      ok: false,
      response: json({ success: false, permissionDenied: true, message: "A Jurisprudência IA foi bloqueada pelo gestor." }, 403),
    };
  }

  const officePlan = await loadOfficePlan(profile);
  const planType = officePlan || normalizePlan(profile);
  const planLimits = await getUserPlanLimits(supabaseAdmin, profile.id);
  if (!PRO_PLANS.has(planType) && !planLimits?.hasJurisprudencia) {
    return {
      ok: false,
      response: json(
        { success: false, upgradeRequired: true, message: "Jurisprudência IA está disponível no Plano PRO." },
        403,
      ),
    };
  }

  return {
    ok: true,
    db: supabaseAdmin,
    user,
    profile: { ...profile, email: user.email || profile.email || "", plan_type: planType },
    planType,
  };
}

function validatePayload(body) {
  const requestId = String(body?.requestId || "");
  const query = normalizeText(body?.query, 2500);
  const area = normalizeText(body?.area || "Geral", 80);
  const court = normalizeText(body?.court || "Todos", 80);
  const perspective = normalizeText(body?.perspective || "Autor/Requerente", 80);

  if (!isClientUuid(requestId)) return { valid: false, message: "Identificador inválido." };
  if (query.length < 12) return { valid: false, message: "Descreva melhor o tema pesquisado." };
  return { valid: true, data: { requestId, query, area, court, perspective } };
}

async function recordAudit(access, request, { requestId, action, metadata }) {
  try {
    const { error } = await access.db.from("lawyer_client_audit_logs").insert([
      {
        request_id: requestId,
        client_id: null,
        actor_id: access.user.id,
        lawyer_id: access.profile.id,
        action,
        metadata,
        ip_hash: getRequestIpHash(request),
        user_agent: getRequestUserAgent(request),
        created_at: new Date().toISOString(),
      },
    ]);
    if (error && error.code !== "23505") throw error;
  } catch (error) {
    console.warn("[JurisprudenciaIA/Auditoria] Registro ignorado:", {
      code: error?.code,
      message: error?.message,
      action,
    });
  }
}

function buildPrompt(payload) {
  return `Você é um analista sênior de jurisprudência brasileira para advogados.

IMPORTANTE
Você não possui consulta em tempo real a Diários, e-SAJ, PJe, JusBrasil, STJ ou STF nesta chamada. Portanto, não invente número de processo, relator, data de julgamento, ementa literal ou estatística de win rate. Entregue análise jurisprudencial orientativa, termos de busca e caminhos de conferência.

TEMA
${payload.query}

ÁREA INFORMADA
${payload.area}

TRIBUNAL/FOCO
${payload.court}

PERSPECTIVA DO ADVOGADO
${payload.perspective}

O QUE ENTREGAR
1. Diagnóstico jurisprudencial realista do tema.
2. Teses favoráveis e forma de uso.
3. Orientações prováveis em STJ/STF/TJ/TRT conforme o tema, sem inventar citações.
4. Distinções, riscos e argumentos contrários.
5. Termos de pesquisa prontos para bases oficiais.
6. Estratégia prática para petição, contestação ou recurso.
7. Linguagem técnica, objetiva e prudente.

Responda somente no JSON do schema.`;
}

function normalizeArray(value, maxItems = 8) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxItems);
}

function normalizeAnalysis(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    topic: normalizeText(source.topic, 180) || "Tema jurisprudencial",
    area: normalizeText(source.area, 100) || "Geral",
    courtFocus: normalizeText(source.courtFocus, 120) || "Tribunais brasileiros",
    executiveSummary: normalizeText(source.executiveSummary, 1200),
    trend: ["Favorável", "Neutra", "Desfavorável", "Controvertida"].includes(source.trend) ? source.trend : "Controvertida",
    confidence: ["Baixa", "Média", "Alta"].includes(source.confidence) ? source.confidence : "Média",
    theses: normalizeArray(source.theses, 6),
    precedents: normalizeArray(source.precedents, 6),
    risks: normalizeArray(source.risks, 8).map((item) => normalizeText(item, 320)),
    counterArguments: normalizeArray(source.counterArguments, 8).map((item) => normalizeText(item, 320)),
    searchTerms: normalizeArray(source.searchTerms, 10).map((item) => normalizeText(item, 180)),
    strategy: normalizeArray(source.strategy, 8).map((item) => normalizeText(item, 320)),
    disclaimer:
      normalizeText(source.disclaimer, 360) ||
      "Análise gerada por IA, sem consulta em tempo real. Confira precedentes em bases oficiais antes de citar.",
  };
}

export async function GET(request) {
  try {
    const access = await requireJurisAccess(request);
    if (!access.ok) return access.response;
    return json({
      success: true,
      permissions: { canUse: true, permissionDenied: false },
      plan: { type: access.planType },
    });
  } catch (error) {
    console.error("[Advogado/JurisprudenciaIA][GET] Erro:", error);
    return json({ success: false, message: "Não foi possível carregar a Jurisprudência IA." }, 500);
  }
}

export async function POST(request) {
  try {
    if (!hasValidMutationOrigin(request)) {
      return json({ success: false, message: "Origem da requisição não autorizada." }, 403);
    }
    const access = await requireJurisAccess(request);
    if (!access.ok) return access.response;
    if (!openai) {
      return json({ success: false, message: "A chave da IA não está configurada." }, 503);
    }

    const validation = validatePayload(await request.json());
    if (!validation.valid) return json({ success: false, message: validation.message }, 400);
    const payload = validation.data;

    await recordAudit(access, request, {
      requestId: payload.requestId,
      action: "JURISPRUDENCIA_IA_REQUEST",
      metadata: {
        queryHash: crypto.createHash("sha256").update(payload.query).digest("hex"),
        area: payload.area,
        court: payload.court,
      },
    });

    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content:
              "Você produz análise jurisprudencial brasileira estruturada para advogados. Não invente precedentes específicos, números de processo ou estatísticas.",
          },
          { role: "user", content: buildPrompt(payload) },
        ],
        response_format: { type: "json_schema", json_schema: RESPONSE_SCHEMA },
        temperature: 0.2,
      });
    } catch (aiError) {
      console.error("[Advogado/JurisprudenciaIA][OpenAI] Erro:", {
        status: aiError?.status,
        code: aiError?.code,
        message: aiError?.message,
      });
      return json(
        {
          success: false,
          message:
            aiError?.status === 401
              ? "A chave da IA está inválida ou expirada."
              : "A IA não respondeu agora. Tente novamente em alguns instantes.",
        },
        aiError?.status === 401 ? 503 : 502,
      );
    }

    const analysis = normalizeAnalysis(
      JSON.parse(completion.choices[0]?.message?.content || "{}"),
    );

    if (!analysis.executiveSummary || analysis.theses.length === 0) {
      return json(
        { success: false, message: "A IA não gerou uma análise jurisprudencial útil. Descreva o tema com mais contexto." },
        502,
      );
    }

    await recordAudit(access, request, {
      requestId: payload.requestId,
      action: "JURISPRUDENCIA_IA_SUCCESS",
      metadata: {
        area: analysis.area,
        trend: analysis.trend,
        confidence: analysis.confidence,
      },
    });

    return json({ success: true, analysis });
  } catch (error) {
    console.error("[Advogado/JurisprudenciaIA][POST] Erro:", error);
    return json({ success: false, message: "Não foi possível analisar jurisprudência." }, 500);
  }
}
