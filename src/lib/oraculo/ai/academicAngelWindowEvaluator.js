import {
  AI_FEATURES,
  PROMPT_VERSIONS,
  SCHEMA_VERSION,
  callAngelJson,
} from "./oraculoOpenAIClients";

// INTERVIEW_WINDOW_EVALUATOR — avalia blocos da entrevista (ex: a cada 10
// mensagens). Gera indicadores/evidências, não nota final. Chave ANJO.

export const WINDOW_EVAL_EVERY = 10;

const SCHEMA = {
  name: "oraculo_window_evaluator_v1",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "clarity_score",
      "fact_collection_score",
      "interview_structure_score",
      "legal_caution_score",
      "accessible_language_score",
      "conduct_score",
      "flags",
      "evidence",
      "window_summary",
    ],
    properties: {
      clarity_score: { type: "integer", minimum: 0, maximum: 100 },
      fact_collection_score: { type: "integer", minimum: 0, maximum: 100 },
      interview_structure_score: { type: "integer", minimum: 0, maximum: 100 },
      legal_caution_score: { type: "integer", minimum: 0, maximum: 100 },
      accessible_language_score: { type: "integer", minimum: 0, maximum: 100 },
      conduct_score: { type: "integer", minimum: 0, maximum: 100 },
      flags: { type: "array", items: { type: "string" } },
      evidence: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["indicator", "summary"],
          properties: {
            indicator: { type: "string" },
            summary: { type: "string" },
          },
        },
      },
      window_summary: { type: "string" },
    },
  },
};

const SYSTEM_PROMPT = `Você é o módulo INTERVIEW_WINDOW_EVALUATOR do Anjo Acadêmico.
Analise uma janela de entrevista acadêmica e gere indicadores (0-100) de
comunicação e coleta. Você NÃO atribui nota final nem decide aprovação. Produz
evidências para acompanhamento humano.

CLARITY: comunicação compreensível? FACT_COLLECTION: as perguntas coletam
informações relevantes disponíveis? INTERVIEW_STRUCTURE: sequência compreensível
ou desorganizada? LEGAL_CAUTION: evita certezas/promessas/conclusões prematuras?
ACCESSIBLE_LANGUAGE: adequada a leigo? COMMUNICATION_CONDUCT: postura respeitosa
e compatível.

Use apenas evidências presentes na janela. Não invente comportamento. Não
penalize por não ter concluído a entrevista numa janela intermediária. Retorne
somente o schema.`;

function transcript(messages) {
  return (messages || [])
    .filter((m) => m.sender_type !== "SYSTEM")
    .map((m) => `${m.sender_type === "STUDENT" ? "ESTUDANTE" : "CLIENTE"}: ${m.content}`)
    .join("\n");
}

/**
 * Avalia uma janela de mensagens (chave ANJO). Nunca lança.
 */
export async function evaluateWindow(messages) {
  const text = transcript(messages);
  if (!text) return { ok: false, error: "EMPTY_WINDOW" };

  const result = await callAngelJson({
    system: SYSTEM_PROMPT,
    user: `JANELA DA ENTREVISTA:\n${text.slice(0, 6000)}`,
    schema: SCHEMA,
    temperature: 0.2,
    maxTokens: 600,
  });

  if (!result.ok) return { ok: false, error: result.error };
  return {
    ok: true,
    data: result.data,
    usage: result.usage,
    feature: AI_FEATURES.ACADEMIC_ANGEL_WINDOW_EVALUATION,
    promptVersion: PROMPT_VERSIONS.WINDOW_EVALUATOR,
    schemaVersion: SCHEMA_VERSION,
  };
}
