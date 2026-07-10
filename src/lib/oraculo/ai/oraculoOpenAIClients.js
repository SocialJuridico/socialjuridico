import OpenAI from "openai";

// Separação absoluta de credenciais:
//   OPENAI_API_KEY_ORACULO       -> Cliente Simulado (representa a pessoa)
//   OPENAI_API_KEY_ORACULO_ANJO  -> Anjo Acadêmico (observa, valida, protege)
// NUNCA usar OPENAI_API_KEY como fallback silencioso nessas funções.

export const ORACULO_CLIENT_MODEL =
  process.env.OPENAI_MODEL_ORACULO || process.env.OPENAI_MODEL || "gpt-4.1-mini";
export const ORACULO_ANGEL_MODEL =
  process.env.OPENAI_MODEL_ORACULO_ANJO ||
  process.env.OPENAI_MODEL ||
  "gpt-4.1-mini";

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
};

let clientInstance = null;
let angelInstance = null;

function clientKey() {
  const key = process.env.OPENAI_API_KEY_ORACULO;
  return key && key.trim() ? key : null;
}

function angelKey() {
  const key = process.env.OPENAI_API_KEY_ORACULO_ANJO;
  return key && key.trim() ? key : null;
}

export function isClientAvailable() {
  return Boolean(clientKey());
}

export function isAngelAvailable() {
  return Boolean(angelKey());
}

/**
 * Cliente OpenAI do Cliente Simulado. Lança se a chave não estiver configurada
 * (sem fallback). Não retorna nem loga a chave.
 */
export function getOraculoClientOpenAI() {
  const key = clientKey();
  if (!key) throw new Error("OPENAI_API_KEY_ORACULO_NOT_CONFIGURED");
  if (!clientInstance) {
    clientInstance = new OpenAI({
      apiKey: key,
      baseURL: process.env.OPENAI_BASE_URL,
    });
  }
  return clientInstance;
}

/**
 * Cliente OpenAI do Anjo Acadêmico. Lança se a chave não estiver configurada.
 */
export function getOraculoAngelOpenAI() {
  const key = angelKey();
  if (!key) throw new Error("OPENAI_API_KEY_ORACULO_ANJO_NOT_CONFIGURED");
  if (!angelInstance) {
    angelInstance = new OpenAI({
      apiKey: key,
      baseURL: process.env.OPENAI_BASE_URL,
    });
  }
  return angelInstance;
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
      response_format: { type: "json_schema", json_schema: schema },
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
