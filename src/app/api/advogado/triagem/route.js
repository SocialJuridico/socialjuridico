import crypto from "node:crypto";

import OpenAI from "openai";

import { getAuthenticatedUser } from "@/lib/authServerUtils";
import { getUserPlanLimits, incrementUsage } from "@/lib/planUtils";
import { supabaseAdmin } from "@/lib/supabase";
import {
  getRequestIpHash,
  getRequestUserAgent,
  hasValidMutationOrigin,
} from "@/lib/lawyerOpportunities/opportunityServerUtils";
import { isClientUuid } from "@/lib/lawyerClients/clientValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ELIGIBLE_PLANS = new Set([
  "START",
  "PRO",
  "ENTERPRISE_START",
  "ENTERPRISE_PRO",
  "ENTERPRISE_PRO_PLUS",
]);

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL })
  : null;

const TRIAGEM_RESPONSE_SCHEMA = {
  name: "triagem_juridica_socialjuridico",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "area",
      "secondaryAreas",
      "urgency",
      "estimatedComplexity",
      "riskLevel",
      "executiveSummary",
      "suggestedAction",
      "nextSteps",
      "requiredDocuments",
      "missingInformation",
      "deadlineAlerts",
      "estimatedValue",
      "viability",
      "disclaimer",
    ],
    properties: {
      area: { type: "string" },
      secondaryAreas: {
        type: "array",
        items: { type: "string" },
      },
      urgency: { type: "string", enum: ["Baixa", "Média", "Alta"] },
      estimatedComplexity: {
        type: "string",
        enum: ["Baixa", "Média", "Complexa"],
      },
      riskLevel: { type: "string", enum: ["Baixo", "Médio", "Alto"] },
      executiveSummary: { type: "string" },
      suggestedAction: { type: "string" },
      nextSteps: {
        type: "array",
        items: { type: "string" },
      },
      requiredDocuments: {
        type: "array",
        items: { type: "string" },
      },
      missingInformation: {
        type: "array",
        items: { type: "string" },
      },
      deadlineAlerts: {
        type: "array",
        items: { type: "string" },
      },
      estimatedValue: {
        type: "object",
        additionalProperties: false,
        required: ["range", "potential", "caveat"],
        properties: {
          range: { type: "string" },
          potential: { type: "string" },
          caveat: { type: "string" },
        },
      },
      viability: {
        type: "object",
        additionalProperties: false,
        required: ["level", "reasoning", "risks", "opportunities"],
        properties: {
          level: { type: "string", enum: ["Baixa", "Média", "Alta"] },
          reasoning: { type: "string" },
          risks: {
            type: "array",
            items: { type: "string" },
          },
          opportunities: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
      disclaimer: { type: "string" },
    },
  },
};

function triagemJson(payload, status = 200) {
  return Response.json(payload, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
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

function normalizeRole(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizePlan(profile) {
  const raw = String(profile?.plan_type || "FREE").trim().toUpperCase();
  if (profile?.is_premium === true && raw === "FREE") return "PRO";
  return raw;
}

function normalizeLongText(value, maxLength = 15000) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{5,}/g, "\n\n\n")
    .trim()
    .slice(0, maxLength);
}

function normalizeChoice(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function normalizeArray(value, maxItems = 8, fallback = []) {
  if (!Array.isArray(value)) return fallback;
  return value
    .map((item) => normalizeLongText(item, 280))
    .filter(Boolean)
    .slice(0, maxItems);
}

function pick(source, ...keys) {
  for (const key of keys) {
    if (source && source[key] !== undefined && source[key] !== null) {
      return source[key];
    }
  }
  return undefined;
}

function serializeUsage(planLimits) {
  const used = Number(planLimits.usedTriagem || 0);
  const limit = Number.isFinite(planLimits.maxTriagem)
    ? Number(planLimits.maxTriagem)
    : null;
  const remaining = limit === null ? null : Math.max(limit - used, 0);
  return {
    used,
    limit,
    remaining,
    percentage: limit ? Math.min(100, Math.round((used / limit) * 100)) : 0,
  };
}

function isEnterprisePlan(planType) {
  return String(planType || "").startsWith("ENTERPRISE_");
}

async function loadOfficeContext(profile) {
  if (!profile.escritorio_id) return null;

  const [{ data: office, error: officeError }, { data: members, error: membersError }] =
    await Promise.all([
      supabaseAdmin
        .from("escritorios")
        .select("id, plano, limites")
        .eq("id", profile.escritorio_id)
        .maybeSingle(),
      supabaseAdmin
        .from("advogados")
        .select("id, name, cargo, oab_verification_status")
        .eq("escritorio_id", profile.escritorio_id),
    ]);

  if (officeError) throw officeError;
  if (membersError) throw membersError;

  const officePlan = String(office?.plano || "").toLowerCase();
  let planType = normalizePlan(profile);
  if (officePlan.startsWith("pro_plus")) planType = "ENTERPRISE_PRO_PLUS";
  else if (officePlan.startsWith("pro")) planType = "ENTERPRISE_PRO";
  else if (officePlan.startsWith("start")) planType = "ENTERPRISE_START";

  const activeMembers = (members || []).filter(
    (member) => member.id && member.oab_verification_status !== "ERROR",
  );
  if (!activeMembers.some((member) => member.id === profile.id)) {
    activeMembers.push({
      id: profile.id,
      name: profile.name,
      cargo: profile.cargo,
    });
  }

  return {
    id: office?.id || profile.escritorio_id,
    planType,
    members: activeMembers,
    limits: office?.limites || {},
  };
}

async function requireTriagemAccess(request) {
  const user = await getAuthenticatedUser(request);
  if (!user || !supabaseAdmin) {
    return {
      ok: false,
      response: triagemJson({ success: false, message: "Não autorizado." }, 401),
    };
  }

  const { data: profile, error } = await supabaseAdmin
    .from("advogados")
    .select(
      "id, name, email, cargo, permissoes, is_premium, plan_type, escritorio_id, oab_verification_status, uso_triagem, extra_triagem",
    )
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!profile) {
    return {
      ok: false,
      response: triagemJson(
        { success: false, message: "Acesso exclusivo para advogados." },
        403,
      ),
    };
  }
  if (profile.oab_verification_status === "ERROR") {
    return {
      ok: false,
      response: triagemJson(
        {
          success: false,
          blocked: true,
          message: "Acesso suspenso por inconsistências na verificação da OAB.",
        },
        403,
      ),
    };
  }

  const role = normalizeRole(profile.cargo);
  const permissions = readPermissions(profile.permissoes);
  if (role === "estagiario" && permissions.ferr_triagem !== true) {
    return {
      ok: false,
      response: triagemJson(
        {
          success: false,
          permissionDenied: true,
          message: "A Triagem IA foi bloqueada pelo gestor do escritório.",
        },
        403,
      ),
    };
  }

  const office = await loadOfficeContext(profile);
  const planType = office?.planType || normalizePlan(profile);
  if (!ELIGIBLE_PLANS.has(planType)) {
    return {
      ok: false,
      response: triagemJson(
        {
          success: false,
          upgradeRequired: true,
          message: "A Triagem IA está disponível nos planos START, PRO e Enterprise.",
        },
        403,
      ),
    };
  }

  const planLimits = await getUserPlanLimits(supabaseAdmin, profile.id);
  const enterpriseLimit = Number(office?.limits?.osint || office?.limits?.creditos_ia || 999999);
  const effectiveLimits = isEnterprisePlan(planType)
    ? {
        planType,
        maxTriagem: enterpriseLimit,
        usedTriagem: Number(profile.uso_triagem || 0),
        canUseTriagem() {
          return this.usedTriagem < this.maxTriagem;
        },
      }
    : planLimits;

  if (!effectiveLimits) {
    return {
      ok: false,
      response: triagemJson(
        { success: false, message: "Não foi possível ler os limites do plano." },
        400,
      ),
    };
  }

  return {
    ok: true,
    db: supabaseAdmin,
    user,
    profile: { ...profile, email: user.email || profile.email || "", plan_type: planType },
    planType,
    planLimits: effectiveLimits,
    officeId: office?.id || null,
  };
}

function validatePayload(body) {
  const requestId = String(body?.requestId || "");
  const report = normalizeLongText(body?.report, 15000);

  if (!isClientUuid(requestId)) {
    return { valid: false, message: "Identificador da solicitação inválido." };
  }
  if (report.length < 60) {
    return { valid: false, message: "Inclua mais detalhes do relato do cliente." };
  }

  return { valid: true, data: { requestId, report } };
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
    console.warn("[TriagemIA/Auditoria] Registro ignorado:", {
      code: error?.code,
      message: error?.message,
      action,
    });
  }
}

function buildPrompt(report) {
  return `Você é um ADVOGADO TRIAGISTA SÊNIOR do SocialJurídico, especialista em transformar relatos brutos de clientes em diagnóstico jurídico inicial para outro advogado.

OBJETIVO
Ler atentamente o relato do cliente, inferir a área jurídica provável, separar fatos juridicamente relevantes, apontar urgências e entregar uma triagem realmente útil para o primeiro atendimento.

COMO ANALISAR
1. Extraia fatos, datas, partes envolvidas, vínculo jurídico, dano alegado, provas existentes e objetivo do cliente.
2. Classifique a área jurídica principal com base no conteúdo, mesmo que o cliente use linguagem leiga.
3. Aponte áreas secundárias quando houver reflexos, por exemplo consumidor + dano moral, família + patrimonial, trabalhista + previdenciário.
4. Defina urgência por risco de prazo, prescrição, decadência, audiência, prova perecível, negativação, bloqueio, violência, saúde, verba alimentar ou dano continuado.
5. Avalie complexidade pelo número de partes, necessidade de perícia, prova documental, prova testemunhal, valor, tutela de urgência e controvérsia jurídica.
6. Diferencie riscos processuais, probatórios, financeiros e estratégicos.
7. Sugira próximos passos concretos e ordenados para o advogado executar.
8. Liste documentos específicos para o caso narrado. Não use lista genérica se o relato permite algo melhor.
9. Liste perguntas pendentes que mudariam a estratégia.
10. Se informação essencial estiver ausente, diga exatamente o que falta, mas ainda assim faça uma análise preliminar útil.

REGRAS DE RESPOSTA
1. Responda somente JSON no schema solicitado pela ferramenta.
2. Não use markdown, crases, comentários ou texto fora do JSON.
3. Não devolva "A apurar" como área se houver qualquer indício razoável no relato.
4. executiveSummary deve ter 3 a 5 frases com diagnóstico real do caso.
5. suggestedAction deve ser uma orientação prática, específica e imediata.
6. requiredDocuments, nextSteps, risks, opportunities e missingInformation devem ter conteúdo específico do relato.
7. Não prometa resultado. Use linguagem prudente e profissional.

RELATO DO CLIENTE
${report}`;
}

function normalizeDiagnosis(value) {
  const source = value && typeof value === "object" ? value : {};
  const viabilitySource = pick(source, "viability", "viabilidade");
  const viability = viabilitySource && typeof viabilitySource === "object"
    ? viabilitySource
    : {};
  const estimatedValue =
    pick(source, "estimatedValue", "valorEstimado", "valor_estimado") &&
    typeof pick(source, "estimatedValue", "valorEstimado", "valor_estimado") === "object"
      ? pick(source, "estimatedValue", "valorEstimado", "valor_estimado")
      : {};
  const area = pick(source, "area", "areaJuridica", "área", "area_juridica");
  const urgency = pick(source, "urgency", "urgencia", "urgência");
  const complexity = pick(
    source,
    "estimatedComplexity",
    "complexidade",
    "complexidadeEstimada",
    "estimated_complexity",
  );
  const risk = pick(source, "riskLevel", "risco", "nivelRisco", "risk_level");

  return {
    area: normalizeLongText(area, 120) || "A apurar",
    secondaryAreas: normalizeArray(
      pick(source, "secondaryAreas", "areasSecundarias", "áreasSecundárias"),
      4,
    ),
    urgency: normalizeChoice(urgency, ["Baixa", "Média", "Alta"], "Média"),
    estimatedComplexity: normalizeChoice(
      complexity,
      ["Baixa", "Média", "Complexa"],
      "Média",
    ),
    riskLevel: normalizeChoice(risk, ["Baixo", "Médio", "Alto"], "Médio"),
    executiveSummary: normalizeLongText(
      pick(source, "executiveSummary", "resumoExecutivo", "summary"),
      900,
    ),
    suggestedAction: normalizeLongText(
      pick(source, "suggestedAction", "acaoRecomendada", "açãoRecomendada"),
      700,
    ),
    nextSteps: normalizeArray(pick(source, "nextSteps", "proximosPassos"), 8),
    requiredDocuments: normalizeArray(
      pick(source, "requiredDocuments", "documentosNecessarios"),
      10,
    ),
    missingInformation: normalizeArray(
      pick(source, "missingInformation", "informacoesPendentes", "perguntasPendentes"),
      8,
    ),
    deadlineAlerts: normalizeArray(
      pick(source, "deadlineAlerts", "alertasPrazo", "alertasDePrazo"),
      6,
    ),
    estimatedValue: {
      range:
        normalizeLongText(pick(estimatedValue, "range", "faixa", "valor"), 100) ||
        "A apurar",
      potential:
        normalizeLongText(pick(estimatedValue, "potential", "potencial"), 260) ||
        "A avaliar",
      caveat:
        normalizeLongText(pick(estimatedValue, "caveat", "ressalva"), 260) ||
        "Estimativa preliminar dependente de documentos, provas e estratégia.",
    },
    viability: {
      level: normalizeChoice(
        pick(viability, "level", "nivel", "nível"),
        ["Baixa", "Média", "Alta"],
        "Média",
      ),
      reasoning: normalizeLongText(
        pick(viability, "reasoning", "justificativa", "fundamentacao"),
        900,
      ),
      risks: normalizeArray(pick(viability, "risks", "riscos"), 8),
      opportunities: normalizeArray(
        pick(viability, "opportunities", "oportunidades"),
        8,
      ),
    },
    disclaimer:
      normalizeLongText(source.disclaimer, 360) ||
      "Triagem inicial gerada por IA e sujeita à revisão profissional.",
  };
}

function parseAiJson(content) {
  try {
    return JSON.parse(content || "{}");
  } catch {
    const match = String(content || "").match(/\{[\s\S]*\}/);
    if (!match) return {};
    try {
      return JSON.parse(match[0]);
    } catch {
      return {};
    }
  }
}

export async function GET(request) {
  try {
    const access = await requireTriagemAccess(request);
    if (!access.ok) return access.response;

    return triagemJson({
      success: true,
      permissions: {
        canUse: access.planLimits.canUseTriagem(),
        permissionDenied: false,
      },
      plan: { type: access.planType },
      usage: serializeUsage(access.planLimits),
    });
  } catch (error) {
    console.error("[Advogado/TriagemIA][GET] Erro:", error);
    return triagemJson(
      { success: false, message: "Não foi possível carregar a Triagem IA." },
      500,
    );
  }
}

export async function POST(request) {
  try {
    if (!hasValidMutationOrigin(request)) {
      return triagemJson(
        { success: false, message: "Origem da requisição não autorizada." },
        403,
      );
    }

    const access = await requireTriagemAccess(request);
    if (!access.ok) return access.response;

    if (!access.planLimits.canUseTriagem()) {
      return triagemJson(
        {
          success: false,
          upgradeRequired: true,
          quotaExceeded: true,
          message: "Você atingiu o limite mensal da Triagem IA.",
        },
        403,
      );
    }

    if (!openai) {
      return triagemJson(
        { success: false, message: "A chave da IA não está configurada." },
        503,
      );
    }

    const validation = validatePayload(await request.json());
    if (!validation.valid) {
      return triagemJson({ success: false, message: validation.message }, 400);
    }
    const payload = validation.data;

    await recordAudit(access, request, {
      requestId: payload.requestId,
      action: "TRIAGEM_IA_REQUEST",
      metadata: {
        reportHash: crypto.createHash("sha256").update(payload.report).digest("hex"),
        reportLength: payload.report.length,
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
              "Você responde somente JSON válido para triagem jurídica brasileira. Seja técnico, prudente e objetivo.",
          },
          { role: "user", content: buildPrompt(payload.report) },
        ],
        response_format: {
          type: "json_schema",
          json_schema: TRIAGEM_RESPONSE_SCHEMA,
        },
        temperature: 0.25,
      });
    } catch (aiError) {
      console.error("[Advogado/TriagemIA][OpenAI] Erro:", {
        status: aiError?.status,
        code: aiError?.code,
        type: aiError?.type,
        message: aiError?.message,
      });
      return triagemJson(
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

    const diagnosis = normalizeDiagnosis(
      parseAiJson(completion.choices[0]?.message?.content || "{}"),
    );

    if (
      diagnosis.area === "A apurar" ||
      !diagnosis.executiveSummary ||
      !diagnosis.suggestedAction
    ) {
      console.error("[Advogado/TriagemIA] Diagnóstico insuficiente:", {
        area: diagnosis.area,
        hasSummary: Boolean(diagnosis.executiveSummary),
        hasAction: Boolean(diagnosis.suggestedAction),
      });
      return triagemJson(
        {
          success: false,
          message:
            "A IA não conseguiu produzir uma triagem útil. Reescreva o relato com mais fatos, datas e objetivo do cliente.",
        },
        502,
      );
    }

    await incrementUsage(access.db, access.profile.id, "uso_triagem", 1);
    const updatedLimits = await getUserPlanLimits(access.db, access.profile.id);
    const finalLimits = isEnterprisePlan(access.planType)
      ? {
          ...access.planLimits,
          usedTriagem: Number(access.planLimits.usedTriagem || 0) + 1,
        }
      : updatedLimits || access.planLimits;

    await recordAudit(access, request, {
      requestId: payload.requestId,
      action: "TRIAGEM_IA_SUCCESS",
      metadata: {
        area: diagnosis.area,
        urgency: diagnosis.urgency,
        riskLevel: diagnosis.riskLevel,
      },
    });

    return triagemJson({
      success: true,
      diagnosis,
      usage: serializeUsage(finalLimits),
    });
  } catch (error) {
    console.error("[Advogado/TriagemIA][POST] Erro:", error);
    return triagemJson(
      { success: false, message: "Não foi possível processar a triagem." },
      500,
    );
  }
}
