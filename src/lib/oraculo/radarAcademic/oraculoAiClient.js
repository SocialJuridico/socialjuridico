import OpenAI from "openai";

// Mesma IA do Social Jurídico: OpenAI gpt-4.1-mini (configurável por env).
export const ORACULO_AI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
export const ORACULO_AI_MODEL_VERSION = ORACULO_AI_MODEL;

// Versões dos prompts (rastreabilidade — persistidas nas mensagens/casos).
export const RADAR_GENERATION_PROMPT_VERSION = "radar-gen-v1";
export const SIMULATED_CLIENT_PROMPT_VERSION = "sim-client-v1";
export const SIMULATED_FEEDBACK_PROMPT_VERSION = "sim-feedback-v1";
export const RADAR_GENERATION_VERSION = "gen-v1";

export const oraculoAi = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
    })
  : null;

export function isOraculoAiAvailable() {
  return Boolean(oraculoAi);
}

/**
 * Chamada de conveniência a chat.completions com json_schema. Nunca lança:
 * retorna { ok, data } ou { ok: false, error }. O caller decide o fallback.
 */
export async function callOraculoJson({
  system,
  user,
  schema,
  temperature = 0.3,
  maxTokens,
}) {
  if (!oraculoAi) {
    return { ok: false, error: "AI_UNAVAILABLE" };
  }

  try {
    const completion = await oraculoAi.chat.completions.create({
      model: ORACULO_AI_MODEL,
      temperature,
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: {
        type: "json_schema",
        json_schema: schema,
      },
    });

    const raw = completion.choices?.[0]?.message?.content || "{}";
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, error: "AI_INVALID_JSON" };
    }
    return { ok: true, data: parsed };
  } catch (error) {
    console.error("[OraculoAI] Falha não fatal:", {
      status: error?.status,
      message: error?.message,
    });
    return { ok: false, error: "AI_REQUEST_FAILED" };
  }
}

/**
 * Chamada de texto livre (não-JSON). Nunca lança.
 */
export async function callOraculoText({
  system,
  messages,
  temperature = 0.5,
  maxTokens = 400,
}) {
  if (!oraculoAi) {
    return { ok: false, error: "AI_UNAVAILABLE" };
  }

  try {
    const completion = await oraculoAi.chat.completions.create({
      model: ORACULO_AI_MODEL,
      temperature,
      max_tokens: maxTokens,
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        ...messages,
      ],
    });
    const text = completion.choices?.[0]?.message?.content || "";
    return { ok: true, data: text.trim() };
  } catch (error) {
    console.error("[OraculoAI] Falha de texto não fatal:", {
      status: error?.status,
      message: error?.message,
    });
    return { ok: false, error: "AI_REQUEST_FAILED" };
  }
}
