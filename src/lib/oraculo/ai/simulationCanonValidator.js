import {
  AI_FEATURES,
  PROMPT_VERSIONS,
  SCHEMA_VERSION,
  callAngelJson,
} from "./oraculoOpenAIClients";

// SIMULATION_CANON_VALIDATOR — valida o Cânone antes de congelar. Chave ANJO.
// Valida o Canon Builder contra a ORIGEM (não valida o Cliente — isso é o
// Grounding Guard contra o Cânone).

const VALIDATION_SCHEMA = {
  name: "oraculo_canon_validator_v1",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["valid", "violations", "blocking", "notes"],
    properties: {
      valid: { type: "boolean" },
      violations: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["code", "severity", "detail"],
          properties: {
            code: {
              type: "string",
              enum: [
                "CONTRADICTS_SOURCE",
                "IMPOSSIBLE_CHRONOLOGY",
                "INCOMPATIBLE_DOCUMENT",
                "INCOHERENT_VALUE",
                "DUPLICATE_CONFLICTING_FACT",
                "INCOMPATIBLE_ACCESS_MODE",
                "TOO_MANY_GAPS",
                "TOO_MANY_READY_FACTS",
                "REAL_PERSONAL_DATA",
                "REAL_IDENTIFIER",
                "ACADEMICALLY_UNVIABLE",
                "OTHER",
              ],
            },
            severity: { type: "string", enum: ["BLOCKING", "WARNING"] },
            detail: { type: "string" },
          },
        },
      },
      blocking: { type: "boolean" },
      notes: { type: "string" },
    },
  },
};

const SYSTEM_PROMPT = `Você é o SIMULATION_CANON_VALIDATOR do Anjo Acadêmico.

Recebe o material de ORIGEM e um CÂNONE DA SIMULAÇÃO proposto. Verifique se o
Cânone é utilizável para uma entrevista acadêmica simulada.

REPROVE (severity=BLOCKING) quando houver:
- CONTRADICTS_SOURCE: contradiz um fato explícito da origem;
- IMPOSSIBLE_CHRONOLOGY: cronologia impossível (efeito antes da causa);
- INCOMPATIBLE_DOCUMENT: documento incompatível com os fatos;
- INCOHERENT_VALUE: valor matematicamente/factualmente incoerente;
- DUPLICATE_CONFLICTING_FACT: fatos duplicados conflitantes;
- INCOMPATIBLE_ACCESS_MODE: access_mode incompatível (ex.: value preenchido mas
  UNKNOWN; ou CONSULTABLE_NOW sem valor canônico);
- TOO_MANY_GAPS: excesso de lacunas — a maioria das perguntas básicas resultaria
  em "não sei";
- REAL_PERSONAL_DATA / REAL_IDENTIFIER: CPF, telefone, e-mail, endereço ou perfil
  reais;
- ACADEMICALLY_UNVIABLE: caso inviável para prática.

WARNING (não bloqueia): TOO_MANY_READY_FACTS (fácil demais, poucas lacunas) e
imperfeições menores.

valid=true somente se não houver violação BLOCKING. blocking=true se existir ao
menos uma violação BLOCKING. Seja rigoroso com integridade factual e coerência,
mas não reprove por diferença de estilo. Retorne somente o schema, em português.`;

function buildUserPrompt({ sourceCase, canon }) {
  return `MATERIAL DE ORIGEM (SOURCE_CASE):
TÍTULO: ${sourceCase?.title || ""}
ÁREA: ${sourceCase?.legal_area || ""}
RELATO: ${sourceCase?.academic_full_case_content || sourceCase?.academic_summary || ""}
FATOS DA ORIGEM: ${JSON.stringify(sourceCase?.available_facts || [], null, 0)}

CÂNONE PROPOSTO:
${JSON.stringify(canon || {}, null, 0)}

Valide o Cânone contra a origem e a coerência interna.`;
}

/**
 * Valida o Cânone proposto (chave ANJO). Nunca lança.
 * Retorna { ok, valid, blocking, violations, notes, usage } ou { ok:false }.
 */
export async function validateSimulationCanon(params) {
  const result = await callAngelJson({
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(params),
    schema: VALIDATION_SCHEMA,
    temperature: 0,
    maxTokens: 900,
  });

  if (!result.ok) return { ok: false, error: result.error };

  const violations = result.data.violations || [];
  const blocking =
    Boolean(result.data.blocking) ||
    violations.some((v) => v.severity === "BLOCKING");

  return {
    ok: true,
    valid: result.data.valid !== false && !blocking,
    blocking,
    violations,
    notes: result.data.notes || "",
    usage: result.usage,
    feature: AI_FEATURES.ACADEMIC_ANGEL_SIMULATION_CANON_VALIDATOR,
    promptVersion: PROMPT_VERSIONS.CANON_VALIDATOR,
    schemaVersion: SCHEMA_VERSION,
  };
}
