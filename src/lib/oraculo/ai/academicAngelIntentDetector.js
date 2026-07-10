import {
  AI_FEATURES,
  PROMPT_VERSIONS,
  SCHEMA_VERSION,
  callAngelJson,
} from "./oraculoOpenAIClients";

// CLIENT_INTENT_DETECTOR — analisa mensagens do CLIENTE REAL na entrevista
// supervisionada. NÃO usar como gatilho de encaminhamento real em casos do
// Radar (cliente simulado). Chave ANJO.

const SCHEMA = {
  name: "oraculo_client_intent_v1",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["intent_level", "confidence", "evidence_excerpt", "recommended_action", "reason"],
    properties: {
      intent_level: { type: "string", enum: ["NONE", "POSSIBLE", "PROBABLE", "EXPLICIT"] },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      evidence_excerpt: { type: "string" },
      recommended_action: {
        type: "string",
        enum: ["CONTINUE", "REGISTER_FLAG", "PAUSE_AND_CONFIRM", "BLOCK_AND_CONFIRM"],
      },
      reason: { type: "string" },
    },
  },
};

const SYSTEM_PROMPT = `Você é o módulo CLIENT_INTENT_DETECTOR do Anjo Acadêmico.
Analise a comunicação de um CLIENTE REAL numa entrevista jurídica supervisionada
conduzida por um estudante. Você NÃO responde ao cliente, NÃO aconselha e NÃO
decide contratação. Identifique apenas a intenção expressa/inferível na mensagem
e no contexto recente.

NONE: sem sinal de desejo de falar com/contratar advogado.
POSSIBLE: sinal fraco, hipotético ou futuro.
PROBABLE: desejo provável de conversar com advogado/continuidade profissional.
EXPLICIT: afirma claramente querer falar com/contratar advogado ou continuar
profissionalmente.

NÃO aumente a classificação porque o caso parece grave. NÃO confunda necessidade
jurídica com intenção de contratação. Sustente pela comunicação do cliente e
retorne a evidência textual. Retorne somente o schema.`;

const ACTION_BY_LEVEL = {
  NONE: "CONTINUE",
  POSSIBLE: "REGISTER_FLAG",
  PROBABLE: "PAUSE_AND_CONFIRM",
  EXPLICIT: "BLOCK_AND_CONFIRM",
};

/**
 * Detecta intenção profissional do cliente real (chave ANJO). Nunca lança.
 */
export async function detectClientIntent({ clientMessage, recentMessages }) {
  const recent = (recentMessages || [])
    .slice(-6)
    .map((m) => `${m.sender_type === "STUDENT" ? "ESTUDANTE" : "CLIENTE"}: ${m.content}`)
    .join("\n");

  const result = await callAngelJson({
    system: SYSTEM_PROMPT,
    user: `CONTEXTO RECENTE:\n${recent}\n\nMENSAGEM DO CLIENTE:\n${clientMessage || ""}`,
    schema: SCHEMA,
    temperature: 0,
    maxTokens: 260,
  });

  if (!result.ok) return { ok: false, error: result.error };

  const level = result.data.intent_level || "NONE";
  return {
    ok: true,
    intentLevel: level,
    confidence: result.data.confidence ?? 0,
    evidenceExcerpt: result.data.evidence_excerpt || "",
    recommendedAction: result.data.recommended_action || ACTION_BY_LEVEL[level],
    reason: result.data.reason || "",
    usage: result.usage,
    feature: AI_FEATURES.ACADEMIC_ANGEL_CLIENT_INTENT,
    promptVersion: PROMPT_VERSIONS.INTENT_DETECTOR,
    schemaVersion: SCHEMA_VERSION,
  };
}
