import OpenAI from "openai";

import { auditChatAction } from "./chatServer";
import {
  isChatUuid,
  normalizeAiScope,
  normalizeChatRequestId,
  parseLegacyMediaContent,
} from "./chatValidation";
import { conversationQuery } from "./messageServer";

const MODEL = process.env.CHAT_AI_MODEL || process.env.OPENAI_MODEL || "gpt-4.1-mini";
const GLOBAL_CACHE_MINUTES = 10;
const HOURLY_REQUEST_LIMIT = 30;
const CONTEXT_MESSAGE_LIMIT = 40;

function openAiClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL });
}

function cacheQuery(db, access, scope, messageId = null) {
  let query = db
    .from("mensagens_analise_ia")
    .select(
      "id, caso_id, interest_id, mensagem_id, destinatario_role, analise_texto, request_id, requested_by, model, created_at, updated_at",
    )
    .eq("caso_id", access.caseId)
    .eq("destinatario_role", access.role)
    .order("created_at", { ascending: false })
    .limit(1);

  query = access.interestId
    ? query.eq("interest_id", access.interestId)
    : query.is("interest_id", null);

  if (scope === "MESSAGE") return query.eq("mensagem_id", messageId);
  return query.is("mensagem_id", null);
}

function serializeAnalysis(row, scope, cached) {
  return {
    id: row.id,
    scope,
    targetMessageId: row.mensagem_id || null,
    text: row.analise_texto || "",
    model: row.model || MODEL,
    createdAt: row.created_at,
    cached,
  };
}

async function enforceRateLimit(access) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await access.db
    .from("chat_audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", access.user.id)
    .eq("action", "AI_REQUESTED")
    .gte("created_at", since);

  if (error) throw error;
  return Number(count || 0) < HOURLY_REQUEST_LIMIT;
}

function describeMessage(message, currentUserId) {
  const sender =
    String(message.sender_id) === String(currentUserId) ? "Você" : "Outra parte";
  const type = String(message.message_type || "TEXT").toUpperCase();

  if (type === "ATTACHMENT") {
    return `${sender}: [Arquivo enviado: ${message.content || "anexo"}]`;
  }
  if (type === "VIDEO_INVITE") {
    return `${sender}: [Convite para videochamada]`;
  }

  const legacy = parseLegacyMediaContent(message.content);
  if (legacy) {
    return `${sender}: [${legacy.kind}: ${legacy.name}]`;
  }

  return `${sender}: ${String(message.content || "").slice(0, 5000)}`;
}

function buildSystemPrompt(role, scope) {
  if (role === "CLIENT") {
    return scope === "GLOBAL"
      ? `Você é o Anjo Jurídico, um assistente privado de apoio ao cliente dentro de uma conversa com advogado. Analise o histórico sem substituir o profissional responsável e sem apresentar conclusões como certeza jurídica. Responda em português do Brasil, de forma curta e clara, com: 1) resumo do que foi tratado; 2) pontos que merecem confirmação; 3) sinais de transparência, risco ou possível mal-entendido; 4) perguntas e próximos passos prudentes. Não prometa resultados, não incentive conflito e não revele dados que não estejam no histórico.`
      : `Você é o Anjo Jurídico, assistente privado do cliente. Analise a mensagem destacada dentro do histórico, sem substituir aconselhamento jurídico profissional. Explique em português claro: o que a mensagem significa, o que deve ser confirmado, possíveis riscos ou ambiguidades e uma sugestão respeitosa de pergunta ao advogado. Evite afirmações absolutas e promessas de resultado.`;
  }

  return scope === "GLOBAL"
    ? `Você é o Assistente Estratégico privado do advogado. Analise a conversa de forma ética e profissional, respeitando as regras da OAB e sem sugerir promessa de resultado, pressão indevida ou captação irregular. Responda em português do Brasil com: 1) estágio do atendimento; 2) necessidades e objeções do cliente; 3) riscos de comunicação; 4) próximos passos; 5) uma sugestão curta de resposta profissional.`
    : `Você é o Assistente Estratégico privado do advogado. Analise a mensagem destacada do cliente no contexto da conversa. Identifique necessidade, dúvida, objeção e risco de interpretação. Sugira duas respostas curtas, éticas e profissionais, sem prometer resultado, sem pressionar e sem criar informação jurídica não presente no histórico.`;
}

export async function generateChatAnalysis(access, request, body) {
  const requestId = normalizeChatRequestId(body?.requestId);
  const scope = normalizeAiScope(body?.scope);
  const messageId = String(body?.messageId || "").trim() || null;

  if (!requestId || !scope) {
    return {
      ok: false,
      status: 400,
      message: "Solicitação de análise inválida.",
    };
  }
  if (scope === "MESSAGE" && !isChatUuid(messageId)) {
    return {
      ok: false,
      status: 400,
      message: "Mensagem para análise inválida.",
    };
  }

  const { data: idempotent, error: idempotentError } = await access.db
    .from("mensagens_analise_ia")
    .select(
      "id, mensagem_id, analise_texto, model, created_at, requested_by",
    )
    .eq("request_id", requestId)
    .maybeSingle();
  if (idempotentError) throw idempotentError;

  if (idempotent) {
    if (String(idempotent.requested_by) !== String(access.user.id)) {
      return { ok: false, status: 409, message: "Identificador já utilizado." };
    }
    return {
      ok: true,
      analysis: serializeAnalysis(idempotent, scope, true),
      alreadyProcessed: true,
    };
  }

  const { data: cachedRows, error: cacheError } = await cacheQuery(
    access.db,
    access,
    scope,
    messageId,
  );
  if (cacheError) throw cacheError;
  const cached = cachedRows?.[0] || null;

  if (cached) {
    const ageMinutes =
      (Date.now() - new Date(cached.created_at).getTime()) / 60000;
    if (scope === "MESSAGE" || ageMinutes < GLOBAL_CACHE_MINUTES) {
      await auditChatAction(access, request, {
        action: "AI_REQUESTED",
        requestId,
        messageId: messageId || null,
        metadata: { scope, model: cached.model || MODEL, cached: true },
      });
      return {
        ok: true,
        analysis: serializeAnalysis(cached, scope, true),
        alreadyProcessed: false,
      };
    }
  }

  if (!(await enforceRateLimit(access))) {
    return {
      ok: false,
      status: 429,
      message: "Limite temporário de análises atingido. Tente novamente mais tarde.",
    };
  }

  let query = access.db
    .from("mensagens")
    .select("id, sender_id, content, message_type, created_at")
    .eq("caso_id", access.caseId)
    .order("created_at", { ascending: true });
  query = conversationQuery(query, access.interestId);
  const { data: messages, error: messageError } = await query;
  if (messageError) throw messageError;

  const history = messages || [];
  if (!history.length) {
    return {
      ok: false,
      status: 409,
      message: "Ainda não há mensagens suficientes para análise.",
    };
  }

  let contextMessages;
  if (scope === "MESSAGE") {
    const targetIndex = history.findIndex((item) => item.id === messageId);
    if (targetIndex < 0) {
      return { ok: false, status: 404, message: "Mensagem não encontrada." };
    }
    if (String(history[targetIndex].sender_id) === String(access.user.id)) {
      return {
        ok: false,
        status: 400,
        message: "Selecione uma mensagem enviada pela outra parte.",
      };
    }
    contextMessages = history.slice(
      Math.max(0, targetIndex - (CONTEXT_MESSAGE_LIMIT - 1)),
      targetIndex + 1,
    );
  } else {
    contextMessages = history.slice(-CONTEXT_MESSAGE_LIMIT);
  }

  const client = openAiClient();
  if (!client) {
    return {
      ok: false,
      status: 503,
      message: "O assistente de IA não está configurado no servidor.",
    };
  }

  const formattedHistory = contextMessages
    .map((message) => describeMessage(message, access.user.id))
    .join("\n");
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: buildSystemPrompt(access.role, scope) },
      {
        role: "user",
        content: `${scope === "MESSAGE" ? "A última mensagem é o foco principal." : "Analise o histórico recente."}\n\n${formattedHistory}`,
      },
    ],
    temperature: 0.45,
    max_tokens: 900,
  });

  const text = completion.choices?.[0]?.message?.content?.trim();
  if (!text) {
    return {
      ok: false,
      status: 502,
      message: "A IA não retornou uma análise válida.",
    };
  }

  const now = new Date().toISOString();
  const insertData = {
    caso_id: access.caseId,
    interest_id: access.interestId,
    mensagem_id: scope === "MESSAGE" ? messageId : null,
    destinatario_role: access.role,
    analise_texto: text,
    request_id: requestId,
    requested_by: access.user.id,
    model: MODEL,
    created_at: now,
    updated_at: now,
  };
  const { data: analysis, error: insertError } = await access.db
    .from("mensagens_analise_ia")
    .insert([insertData])
    .select(
      "id, mensagem_id, analise_texto, model, created_at",
    )
    .single();
  if (insertError) throw insertError;

  await auditChatAction(access, request, {
    action: "AI_REQUESTED",
    requestId,
    messageId: messageId || null,
    metadata: { scope, model: MODEL, cached: false },
  });

  return {
    ok: true,
    analysis: serializeAnalysis(analysis, scope, false),
    alreadyProcessed: false,
  };
}
