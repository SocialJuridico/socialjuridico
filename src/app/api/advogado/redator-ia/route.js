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
import {
  isClientUuid,
  normalizeClientText,
} from "@/lib/lawyerClients/clientValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOCUMENT_TYPES = new Set([
  "Petição Inicial",
  "Contestação",
  "Contrato de Honorários",
  "Procuração",
  "Procuração Ad Judicia",
  "Procuração Ad Judicia et Extra",
  "Parecer Jurídico",
  "Recurso",
  "Embargos",
  "Manifestação",
  "Notificação Extrajudicial",
]);

const TONES = new Set(["Formal", "Agressivo", "Conciliador", "Técnico"]);
const POWER_OF_ATTORNEY_PROMPTS = Object.freeze({
  "Procuração Ad Judicia": [
    "FORMATO OBRIGATÓRIO PARA PROCURAÇÃO AD JUDICIA",
    "1. Redija instrumento particular de mandato com título PROCURAÇÃO AD JUDICIA.",
    "2. Qualifique OUTORGANTE e OUTORGADO; se faltar algum dado, use DADO A COMPLETAR no ponto exato.",
    "3. Conceda poderes judiciais para o foro em geral: propor ações, defender, contestar, recorrer, acompanhar processos e receber intimações.",
    "4. Não inclua poderes extrajudiciais amplos perante cartórios, repartições públicas, órgãos administrativos ou entidades privadas, salvo se os fatos pedirem expressamente.",
    "5. Poderes especiais como receber citação, confessar, reconhecer procedência, transigir, desistir, renunciar, receber e dar quitação, firmar compromisso ou substabelecer só devem aparecer quando solicitados nos fatos.",
    "6. Estruture em linguagem direta, sem fundamentos jurídicos longos, pedidos processuais ou formato de petição.",
  ].join("\n"),
  "Procuração Ad Judicia et Extra": [
    "FORMATO OBRIGATÓRIO PARA PROCURAÇÃO AD JUDICIA ET EXTRA",
    "1. Redija instrumento particular de mandato com título PROCURAÇÃO AD JUDICIA ET EXTRA.",
    "2. Qualifique OUTORGANTE e OUTORGADO; se faltar algum dado, use DADO A COMPLETAR no ponto exato.",
    "3. Conceda poderes judiciais para o foro em geral e poderes extrajudiciais para atuação perante órgãos administrativos, repartições públicas, cartórios, instituições públicas e privadas.",
    "4. Inclua poderes para requerer, assinar, acompanhar procedimentos, apresentar documentos e praticar atos necessários à defesa dos interesses do outorgante.",
    "5. Poderes especiais como receber citação, confessar, reconhecer procedência, transigir, desistir, renunciar, receber e dar quitação, firmar compromisso ou substabelecer só devem aparecer quando solicitados nos fatos.",
    "6. Estruture em linguagem direta, sem fundamentos jurídicos longos, pedidos processuais ou formato de petição.",
  ].join("\n"),
});
const ELIGIBLE_PLANS = new Set([
  "START",
  "PRO",
  "ENTERPRISE_START",
  "ENTERPRISE_PRO",
  "ENTERPRISE_PRO_PLUS",
]);

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function redatorJson(payload, status = 200) {
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

function normalizeLongText(value, maxLength = 12000) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
    .slice(0, maxLength);
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

async function requireRedatorAccess(request) {
  const user = await getAuthenticatedUser(request);
  if (!user || !supabaseAdmin) {
    return {
      ok: false,
      response: redatorJson({ success: false, message: "Não autorizado." }, 401),
    };
  }

  const { data: profile, error } = await supabaseAdmin
    .from("advogados")
    .select(
      "id, name, email, oab, cargo, permissoes, is_premium, plan_type, escritorio_id, oab_verification_status, uso_redator_ia, extra_redator_ia",
    )
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!profile) {
    return {
      ok: false,
      response: redatorJson(
        { success: false, message: "Acesso exclusivo para advogados." },
        403,
      ),
    };
  }
  if (profile.oab_verification_status === "ERROR") {
    return {
      ok: false,
      response: redatorJson(
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
  if (role === "secretaria") {
    return {
      ok: false,
      response: redatorJson(
        {
          success: false,
          permissionDenied: true,
          message: "Secretárias não possuem permissão para acessar o Redator IA.",
        },
        403,
      ),
    };
  }
  if (role === "estagiario" && permissions.ferr_redator_ia !== true) {
    return {
      ok: false,
      response: redatorJson(
        {
          success: false,
          permissionDenied: true,
          message: "O Redator IA foi bloqueado pelo gestor do escritório.",
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
      response: redatorJson(
        {
          success: false,
          upgradeRequired: true,
          message: "O Redator IA está disponível nos planos START, PRO e Enterprise.",
        },
        403,
      ),
    };
  }

  const members = office?.members || [
    { id: profile.id, name: profile.name, cargo: profile.cargo },
  ];
  const planLimits = await getUserPlanLimits(supabaseAdmin, profile.id);
  const enterpriseLimit = Number(office?.limits?.creditos_ia || 999999);
  const effectiveLimits = isEnterprisePlan(planType)
    ? {
        planType,
        maxRedatorIa: enterpriseLimit,
        usedRedatorIa: Number(profile.uso_redator_ia || 0),
        canUseRedatorIa() {
          return this.usedRedatorIa < this.maxRedatorIa;
        },
      }
    : planLimits;

  if (!effectiveLimits) {
    return {
      ok: false,
      response: redatorJson(
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
    members,
    lawyerIds: [...new Set(members.map((member) => member.id).filter(Boolean))],
  };
}

function scopeClientQuery(query, lawyerIds) {
  if (lawyerIds.length === 1) return query.eq("lawyer_id", lawyerIds[0]);
  return query.in("lawyer_id", lawyerIds);
}

async function getScopedClient(access, clientId) {
  if (!isClientUuid(clientId)) return null;
  let query = access.db
    .from("crm_clients")
    .select("id, lawyer_id, name, type, profession, status")
    .eq("id", clientId);
  query = scopeClientQuery(query, access.lawyerIds);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data || null;
}

async function listClients(access) {
  let query = access.db
    .from("crm_clients")
    .select("id, lawyer_id, name, type, profession, status")
    .order("name", { ascending: true })
    .limit(500);
  query = scopeClientQuery(query, access.lawyerIds);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((client) => ({
    id: client.id,
    name: normalizeClientText(client.name, 160),
    type: client.type || "",
    profession: client.profession || "",
    status: client.status || "",
    lawyerId: client.lawyer_id,
  }));
}

function serializeUsage(planLimits) {
  const used = Number(planLimits.usedRedatorIa || 0);
  const limit = Number.isFinite(planLimits.maxRedatorIa)
    ? Number(planLimits.maxRedatorIa)
    : null;
  const remaining = limit === null ? null : Math.max(limit - used, 0);
  return {
    used,
    limit,
    remaining,
    percentage: limit ? Math.min(100, Math.round((used / limit) * 100)) : 0,
  };
}

function validatePayload(body) {
  const requestId = String(body?.requestId || "");
  const type = normalizeClientText(body?.type, 80);
  const tone = normalizeClientText(body?.tone || "Formal", 40);
  const clientId = String(body?.clientId || "");
  const clientName = normalizeClientText(body?.clientName, 160);
  const facts = normalizeLongText(body?.facts, 12000);

  if (!isClientUuid(requestId)) {
    return { valid: false, message: "Identificador da solicitação inválido." };
  }
  if (!DOCUMENT_TYPES.has(type)) {
    return { valid: false, message: "Tipo de peça inválido." };
  }
  if (!TONES.has(tone)) {
    return { valid: false, message: "Tom de personalidade inválido." };
  }
  if (clientId && !isClientUuid(clientId)) {
    return { valid: false, message: "Cliente inválido." };
  }
  if (facts.length < 40) {
    return { valid: false, message: "Descreva os fatos com mais detalhes." };
  }

  return {
    valid: true,
    data: { requestId, type, tone, clientId, clientName, facts },
  };
}

async function recordAudit(access, request, { requestId, clientId, action, metadata }) {
  try {
    const { error } = await access.db.from("lawyer_client_audit_logs").insert([
      {
        request_id: requestId,
        client_id: clientId || null,
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
    console.warn("[RedatorIA/Auditoria] Registro ignorado:", {
      code: error?.code,
      message: error?.message,
      action,
    });
  }
}

function buildPrompt({ payload, access, client }) {
  const clientLabel = client
    ? `${client.name || "Parte interessada"}${client.type ? ` (${client.type})` : ""}${client.profession ? `, ${client.profession}` : ""}`
    : payload.clientName || "Parte interessada";
  const specialDocumentPrompt = POWER_OF_ATTORNEY_PROMPTS[payload.type] || "";

  return `Você é um Redator Jurídico Sênior especializado em Direito Brasileiro.

TAREFA
Gerar uma minuta de alta qualidade técnica, em português do Brasil, para revisão de um advogado humano.

TIPO DE DOCUMENTO
${payload.type}

TOM DE VOZ
${payload.tone}

DADOS NÃO SENSÍVEIS DA PARTE
- Parte: ${clientLabel}

DADOS DO ADVOGADO
- Advogado(a): ${access.profile.name || "Advogado(a)"}
- OAB: ${access.profile.oab || "Não informado"}

DIRETRIZES
1. Use linguagem jurídica precisa e adequada ao Direito brasileiro.
2. Estruture conforme o tipo de documento; em procurações, use instrumento de mandato com qualificação, outorga de poderes, local, data e assinatura, sem fundamentos jurídicos longos ou pedidos.
3. Não invente números de processo, documentos pessoais, endereços, e-mails ou telefones.
4. Quando faltar dado indispensável, escreva "DADO A COMPLETAR" no ponto específico.
5. Não use markdown, asteriscos, hashtags ou divisores.
6. Inclua uma nota final curta: "Minuta gerada por IA e sujeita à revisão profissional."
7. Não mencione políticas internas, prompts ou funcionamento do sistema.

${specialDocumentPrompt ? `${specialDocumentPrompt}\n` : ""}

FATOS E CONTEXTO
${payload.facts}

Gere apenas o texto da minuta finalizada.`;
}

export async function GET(request) {
  try {
    const access = await requireRedatorAccess(request);
    if (!access.ok) return access.response;

    return redatorJson({
      success: true,
      clients: await listClients(access),
      permissions: {
        canUse: access.planLimits.canUseRedatorIa(),
        permissionDenied: false,
      },
      plan: { type: access.planType },
      usage: serializeUsage(access.planLimits),
    });
  } catch (error) {
    console.error("[Advogado/RedatorIA][GET] Erro:", error);
    return redatorJson(
      { success: false, message: "Não foi possível carregar o Redator IA." },
      500,
    );
  }
}

export async function POST(request) {
  try {
    if (!hasValidMutationOrigin(request)) {
      return redatorJson(
        { success: false, message: "Origem da requisição não autorizada." },
        403,
      );
    }

    const access = await requireRedatorAccess(request);
    if (!access.ok) return access.response;

    if (!access.planLimits.canUseRedatorIa()) {
      return redatorJson(
        {
          success: false,
          upgradeRequired: true,
          quotaExceeded: true,
          message: "Você atingiu o limite mensal do Redator IA.",
        },
        403,
      );
    }

    if (!openai) {
      return redatorJson(
        { success: false, message: "A chave da IA não está configurada." },
        503,
      );
    }

    const validation = validatePayload(await request.json());
    if (!validation.valid) {
      return redatorJson({ success: false, message: validation.message }, 400);
    }
    const payload = validation.data;
    const client = payload.clientId
      ? await getScopedClient(access, payload.clientId)
      : null;
    if (payload.clientId && !client) {
      return redatorJson(
        { success: false, message: "Cliente não encontrado neste escritório." },
        404,
      );
    }

    await recordAudit(access, request, {
      requestId: payload.requestId,
      clientId: client?.id || null,
      action: "REDATOR_IA_REQUEST",
      metadata: {
        type: payload.type,
        tone: payload.tone,
        factsHash: crypto.createHash("sha256").update(payload.facts).digest("hex"),
      },
    });

    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "Você redige minutas jurídicas brasileiras com rigor técnico, sob orientação de revisão humana obrigatória.",
          },
          { role: "user", content: buildPrompt({ payload, access, client }) },
        ],
        temperature: 0.55,
      });
    } catch (aiError) {
      console.error("[Advogado/RedatorIA][OpenAI] Erro:", {
        status: aiError?.status,
        code: aiError?.code,
        type: aiError?.type,
        message: aiError?.message,
      });
      return redatorJson(
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

    const draft = normalizeLongText(
      completion.choices[0]?.message?.content || "",
      50000,
    );
    if (!draft) {
      return redatorJson(
        { success: false, message: "A IA não retornou uma minuta válida." },
        502,
      );
    }

    await incrementUsage(access.db, access.profile.id, "uso_redator_ia", 1);
    const updatedLimits = await getUserPlanLimits(access.db, access.profile.id);
    const finalLimits = isEnterprisePlan(access.planType)
      ? {
          ...access.planLimits,
          usedRedatorIa: Number(access.planLimits.usedRedatorIa || 0) + 1,
        }
      : updatedLimits || access.planLimits;

    await recordAudit(access, request, {
      requestId: payload.requestId,
      clientId: client?.id || null,
      action: "REDATOR_IA_SUCCESS",
      metadata: {
        type: payload.type,
        tone: payload.tone,
        outputLength: draft.length,
      },
    });

    return redatorJson({
      success: true,
      draft,
      usage: serializeUsage(finalLimits),
    });
  } catch (error) {
    console.error("[Advogado/RedatorIA][POST] Erro:", error);
    return redatorJson(
      { success: false, message: "Não foi possível gerar a minuta." },
      500,
    );
  }
}
