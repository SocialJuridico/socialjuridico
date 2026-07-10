import {
  AI_FEATURES,
  PROMPT_VERSIONS,
  SCHEMA_VERSION,
  callAngelJson,
} from "./oraculoOpenAIClients";

// INTERVIEW_FINAL_EVALUATOR — análise final da condução da entrevista.
// Feedback baseado em evidências. NÃO atribui nota final. Chave ANJO.

const SCHEMA = {
  name: "oraculo_final_evaluator_v1",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "indicators",
      "facts_explored",
      "missing_information_explored",
      "documents_explored",
      "strengths",
      "development_points",
      "communication_cautions",
      "summary",
    ],
    properties: {
      indicators: {
        type: "object",
        additionalProperties: false,
        required: [
          "clarity",
          "fact_collection",
          "interview_structure",
          "legal_caution",
          "accessible_language",
          "communication_conduct",
        ],
        properties: {
          clarity: { type: "integer", minimum: 0, maximum: 100 },
          fact_collection: { type: "integer", minimum: 0, maximum: 100 },
          interview_structure: { type: "integer", minimum: 0, maximum: 100 },
          legal_caution: { type: "integer", minimum: 0, maximum: 100 },
          accessible_language: { type: "integer", minimum: 0, maximum: 100 },
          communication_conduct: { type: "integer", minimum: 0, maximum: 100 },
        },
      },
      facts_explored: { type: "array", items: { type: "string" } },
      missing_information_explored: { type: "array", items: { type: "string" } },
      documents_explored: { type: "array", items: { type: "string" } },
      strengths: { type: "array", items: { type: "string" } },
      development_points: { type: "array", items: { type: "string" } },
      communication_cautions: { type: "array", items: { type: "string" } },
      summary: { type: "string" },
    },
  },
};

const SYSTEM_PROMPT = `Você é o módulo INTERVIEW_FINAL_EVALUATOR do Anjo Acadêmico.
Gere a análise final da CONDUÇÃO de uma entrevista feita por um estudante. Você
NÃO atribui nota final, NÃO aprova/reprova e NÃO emite parecer jurídico.

Considere: clareza; coleta de informações; estrutura; exploração cronológica;
exploração documental; identificação de lacunas; cautela jurídica; linguagem
acessível; conduta comunicacional; capacidade de identificar encaminhamento
quando aplicável.

Feedback baseado em evidências. Não diga que o aluno "deveria ter descoberto" um
fato indisponível. Não premie quantidade de mensagens nem duração. Não invente
comportamento. Diferencie strengths (positivos sustentados), development_points
(melhorias sustentadas) e communication_cautions (alertas de limites). Retorne
somente o schema, em português.`;

function transcript(messages) {
  return (messages || [])
    .filter((m) => m.sender_type !== "SYSTEM")
    .map((m) => `${m.sender_type === "STUDENT" ? "ESTUDANTE" : "CLIENTE SIMULADO"}: ${m.content}`)
    .join("\n");
}

/**
 * Gera a avaliação final da entrevista (chave ANJO). Nunca lança.
 */
export async function generateFinalEvaluation(messages) {
  const text = transcript(messages);
  if (!text) return { ok: false, error: "EMPTY" };

  const result = await callAngelJson({
    system: SYSTEM_PROMPT,
    user: `CONVERSA DA ENTREVISTA:\n${text.slice(0, 7000)}`,
    schema: SCHEMA,
    temperature: 0.2,
    maxTokens: 900,
  });

  if (!result.ok) return { ok: false, error: result.error };
  return {
    ok: true,
    data: result.data,
    usage: result.usage,
    feature: AI_FEATURES.ACADEMIC_ANGEL_FINAL_EVALUATION,
    promptVersion: PROMPT_VERSIONS.FINAL_EVALUATOR,
    schemaVersion: SCHEMA_VERSION,
  };
}
