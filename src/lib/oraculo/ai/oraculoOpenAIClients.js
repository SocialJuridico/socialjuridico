import {
  AI_MODEL,
  getAIClientOrNull,
  isAIAvailable,
  normalizeResponseFormat,
} from "@/lib/ai/aiProvider";

// Migração temporária OpenAI -> Groq.
//
// Originalmente havia separação absoluta de credenciais entre o Cliente
// Simulado e o Anjo Acadêmico. Durante a migração para a Groq (chave única
// GROQ_API_KEY), ambos passam a usar o mesmo provedor/credencial, mantendo
// porém a separação lógica de responsabilidades (funções, prompts, schemas e
// versões distintas). A separação por chave pode ser restaurada quando a
// OpenAI voltar (AI_PROVIDER=openai).

export const ORACULO_CLIENT_MODEL = AI_MODEL;
export const ORACULO_ANGEL_MODEL = AI_MODEL;

// Versões de prompt/schema por responsabilidade (rastreabilidade).
export const PROMPT_VERSIONS = {
  SIMULATED_CLIENT: "SIMULATED_CLIENT_PROMPT_V2",
  CONDUCT_GUARD: "ACADEMIC_CONDUCT_GUARD_V1",
  INTENT_DETECTOR: "CLIENT_INTENT_DETECTOR_V1",
  GROUNDING_GUARD: "SIMULATED_CLIENT_GROUNDING_GUARD_V2",
  WINDOW_EVALUATOR: "INTERVIEW_WINDOW_EVALUATOR_V1",
  FINAL_EVALUATOR: "INTERVIEW_FINAL_EVALUATOR_V1",
  CANON_BUILDER: "SIMULATION_CANON_BUILDER_V1",
  CANON_VALIDATOR: "SIMULATION_CANON_VALIDATOR_V1",
  PROFESSIONAL_SIMULATION_MONITOR: "PROFESSIONAL_SIMULATION_ETHICS_MONITOR_V1",
  PROFESSIONAL_SIMULATION_EVALUATOR: "PROFESSIONAL_SIMULATION_FINAL_EVALUATOR_V1",
};

export const SCHEMA_VERSION = "V1";

// Feature tags de uso (contabilização por chave/função).
export const AI_FEATURES = {
  SIMULATED_CLIENT_RESPONSE: "SIMULATED_CLIENT_RESPONSE",
  ACADEMIC_ANGEL_CONDUCT_GUARD: "ACADEMIC_ANGEL_CONDUCT_GUARD",
  ACADEMIC_ANGEL_CLIENT_INTENT: "ACADEMIC_ANGEL_CLIENT_INTENT",
  ACADEMIC_ANGEL_GROUNDING: "ACADEMIC_ANGEL_GROUNDING",
  ACADEMIC_ANGEL_WINDOW_EVALUATION: "ACADEMIC_ANGEL_WINDOW_EVALUATION",
  ACADEMIC_ANGEL_FINAL_EVALUATION: "ACADEMIC_ANGEL_FINAL_EVALUATION",
  ACADEMIC_ANGEL_SIMULATION_CANON_BUILDER: "ACADEMIC_ANGEL_SIMULATION_CANON_BUILDER",
  ACADEMIC_ANGEL_SIMULATION_CANON_VALIDATOR: "ACADEMIC_ANGEL_SIMULATION_CANON_VALIDATOR",
  ACADEMIC_ANGEL_PROFESSIONAL_SIMULATION_MONITOR: "ACADEMIC_ANGEL_PROFESSIONAL_SIMULATION_MONITOR",
  ACADEMIC_ANGEL_PROFESSIONAL_SIMULATION_EVALUATION: "ACADEMIC_ANGEL_PROFESSIONAL_SIMULATION_EVALUATION",
};

export function isClientAvailable() {
  return isAIAvailable();
}

export function isAngelAvailable() {
  return isAIAvailable();
}

/**
 * Cliente de IA do Cliente Simulado. Durante a migração, usa o provedor
 * central (Groq). Lança se a chave não estiver configurada. Não loga a chave.
 */
export function getOraculoClientOpenAI() {
  const client = getAIClientOrNull();
  if (!client) throw new Error("ORACULO_AI_NOT_CONFIGURED");
  return client;
}

/**
 * Cliente de IA do Anjo Acadêmico. Durante a migração, usa o provedor central
 * (Groq). Lança se a chave não estiver configurada.
 */
export function getOraculoAngelOpenAI() {
  const client = getAIClientOrNull();
  if (!client) throw new Error("ORACULO_ANGEL_AI_NOT_CONFIGURED");
  return client;
}

function extractUsage(completion, model) {
  const u = completion?.usage || {};
  return {
    model,
    modelSnapshot: completion?.model || model,
    inputTokens: u.prompt_tokens ?? null,
    cachedInputTokens: u.prompt_tokens_details?.cached_tokens ?? null,
    outputTokens: u.completion_tokens ?? null,
    requestId: completion?._request_id || completion?.id || null,
  };
}

async function callJson({ openai, model, system, user, schema, temperature = 0.3, maxTokens }) {
  try {
    const completion = await openai.chat.completions.create({
      model,
      temperature,
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: normalizeResponseFormat(
        { type: "json_schema", json_schema: schema },
        model,
      ),
    });
    const raw = completion.choices?.[0]?.message?.content || "{}";
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, error: "AI_INVALID_JSON", usage: extractUsage(completion, model) };
    }
    return { ok: true, data: parsed, usage: extractUsage(completion, model) };
  } catch (error) {
    // Nunca incluir a chave na exceção/log.
    console.error("[OraculoAI] Falha não fatal:", {
      status: error?.status,
      message: error?.message,
    });
    return { ok: false, error: "AI_REQUEST_FAILED" };
  }
}

/**
 * Chamada JSON pelo Cliente Simulado (chave ORACULO).
 */
export async function callClientJson(args) {
  if (!isClientAvailable()) return { ok: false, error: "CLIENT_UNAVAILABLE" };
  return callJson({ openai: getOraculoClientOpenAI(), model: ORACULO_CLIENT_MODEL, ...args });
}

/**
 * Chamada JSON pelo Anjo Acadêmico (chave ANJO).
 */
export async function callAngelJson(args) {
  if (!isAngelAvailable()) return { ok: false, error: "ANGEL_UNAVAILABLE" };
  return callJson({ openai: getOraculoAngelOpenAI(), model: ORACULO_ANGEL_MODEL, ...args });
}
