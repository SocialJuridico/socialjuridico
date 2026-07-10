import {
  AI_FEATURES,
  PROMPT_VERSIONS,
  SCHEMA_VERSION,
  callAngelJson,
} from "./oraculoOpenAIClients";

// SIMULATED_CLIENT_GROUNDING_GUARD — valida a resposta do Cliente Simulado
// antes de exibir ao estudante (chave ANJO).

const SCHEMA = {
  name: "oraculo_grounding_guard_v1",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "valid",
      "violations",
      "unsupported_excerpt",
      "regeneration_required",
      "safe_fallback_type",
      "reason",
    ],
    properties: {
      valid: { type: "boolean" },
      violations: { type: "array", items: { type: "string" } },
      unsupported_excerpt: { type: "string" },
      regeneration_required: { type: "boolean" },
      safe_fallback_type: {
        type: "string",
        enum: ["NONE", "UNKNOWN_FACT", "NOT_PROVIDED", "CONFUSED_QUESTION", "GENERIC_SAFE"],
      },
      reason: { type: "string" },
    },
  },
};

const SYSTEM_PROMPT = `Você é o módulo SIMULATED_CLIENT_GROUNDING_GUARD do Anjo Acadêmico.
Valide uma resposta proposta pelo Cliente Simulado antes de exibi-la ao
estudante. Você NÃO interpreta o cliente nem gera nova conversa.

FONTE DE VERDADE: valide SOMENTE contra o FACT_STATE (o CÂNONE DA SIMULAÇÃO), que
é a realidade congelada deste Caso de Estudo. NÃO valide contra a postagem
original. Um fato com provenance=SYNTHETIC_CANON é VÁLIDO — não reprove um valor
(data, protocolo, motivo) só porque ele não aparecia no relato de origem; se ele
existe no FACT_STATE, é verdadeiro na simulação.

REPROVE (valid=false) quando houver:
- fato ENTREGUE que NÃO existe no FACT_STATE (inventado);
- valor entregue de um fato cujo access_mode é KNOWN_BUT_NOT_AT_HAND, UNKNOWN,
  UNAVAILABLE ou DOES_NOT_REMEMBER (não deveria ter sido entregue);
- fato REMEMBERED_APPROXIMATE apresentado como valor exato/certeza;
- valor divergente do FACT_STATE (data/valor/documento/protocolo/motivo trocados);
- intenção profissional alterada em relação ao FACT_STATE;
- contradição com fatos já revelados; quebra relevante de persona;
- ensino jurídico ao estudante; sugestão da próxima pergunta; avaliação do aluno.

NÃO reprove: consulta simulada natural (ex.: "deixa eu olhar aqui...") quando o
fato é CONSULTABLE_NOW; diferença apenas de estilo; recusa correta de entregar um
valor KNOWN_BUT_NOT_AT_HAND.

Priorize integridade factual. Se reprovar, defina regeneration_required=true e,
se aplicável, um safe_fallback_type. Retorne somente o schema.`;

function buildUser({
  factState,
  persona,
  studentMessage,
  proposedResponse,
  factKeysUsed,
  accessModeUsed,
  simulatedLookup,
  simulationCanon,
}) {
  return `<SIMULATION_CANON_META>
CANON_ID: ${simulationCanon?.id || ""}
CANON_VERSION: ${simulationCanon?.version || ""}
</SIMULATION_CANON_META>

<FACT_STATE>
${JSON.stringify(factState || {}, null, 0)}
</FACT_STATE>

<PERSONA>
${JSON.stringify(persona || {}, null, 0)}
</PERSONA>

MENSAGEM DO ESTUDANTE:
${studentMessage || ""}

RESPOSTA PROPOSTA DO CLIENTE:
${proposedResponse || ""}

FACT_KEYS_USED (declaradas pelo cliente):
${JSON.stringify(factKeysUsed || [], null, 0)}

ACCESS_MODE_USED (declarado pelo cliente): ${accessModeUsed || "NONE"}
SIMULATED_LOOKUP (declarado pelo cliente): ${simulatedLookup ? "true" : "false"}`;
}

/**
 * Valida grounding da resposta do Cliente (chave ANJO). Nunca lança.
 * Retorna { ok, valid, regenerationRequired, safeFallbackType, violations, usage }.
 * ok=false => Anjo indisponível/falha (o caller decide política).
 */
export async function validateGrounding(params) {
  const result = await callAngelJson({
    system: SYSTEM_PROMPT,
    user: buildUser(params),
    schema: SCHEMA,
    temperature: 0,
    maxTokens: 320,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return {
    ok: true,
    valid: result.data.valid !== false,
    violations: result.data.violations || [],
    unsupportedExcerpt: result.data.unsupported_excerpt || "",
    regenerationRequired: Boolean(result.data.regeneration_required),
    safeFallbackType: result.data.safe_fallback_type || "NONE",
    reason: result.data.reason || "",
    usage: result.usage,
    feature: AI_FEATURES.ACADEMIC_ANGEL_GROUNDING,
    promptVersion: PROMPT_VERSIONS.GROUNDING_GUARD,
    schemaVersion: SCHEMA_VERSION,
  };
}
