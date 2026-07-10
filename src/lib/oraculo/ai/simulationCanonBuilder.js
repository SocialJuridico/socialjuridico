import {
  AI_FEATURES,
  PROMPT_VERSIONS,
  SCHEMA_VERSION,
  callAngelJson,
} from "./oraculoOpenAIClients";

// SIMULATION_CANON_BUILDER — transforma o caso de origem (Radar) em um Caso de
// Estudo COMPLETO e coerente ANTES da entrevista. Chave ANJO.
// "O Anjo pode completar a realidade acadêmica antes da entrevista.
//  O Cliente nunca cria fatos durante a conversa."

const PROVENANCE = [
  "SOURCE_EXPLICIT",
  "SOURCE_NORMALIZED",
  "SYNTHETIC_CANON",
  "UNAVAILABLE_BY_DESIGN",
];

const ACCESS_MODE = [
  "REMEMBERED_EXACT",
  "REMEMBERED_APPROXIMATE",
  "CONSULTABLE_NOW",
  "KNOWN_BUT_NOT_AT_HAND",
  "DOES_NOT_REMEMBER",
  "UNKNOWN",
  "UNAVAILABLE",
  "NOT_APPLICABLE",
];

const COMPLETENESS_LEVEL = ["COMPLETE", "PARTIAL", "INTENTIONALLY_MISSING", "MISSING"];

const CANON_SCHEMA = {
  name: "oraculo_simulation_canon_v1",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "academic_case_title",
      "academic_narrative",
      "legal_area",
      "simulation_persona",
      "canonical_facts",
      "documents",
      "timeline",
      "available_evidence",
      "missing_evidence",
      "open_questions",
      "professional_intent",
      "completeness",
      "canon_generation_notes",
    ],
    properties: {
      academic_case_title: { type: "string" },
      academic_narrative: { type: "string" },
      legal_area: { type: "string" },
      simulation_persona: {
        type: "object",
        additionalProperties: false,
        required: [
          "communication_style",
          "verbosity",
          "emotional_tone",
          "legal_knowledge_level",
        ],
        properties: {
          communication_style: { type: "string" },
          verbosity: { type: "string" },
          emotional_tone: { type: "string" },
          legal_knowledge_level: { type: "string" },
        },
      },
      canonical_facts: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "key",
            "label",
            "value",
            "value_type",
            "precision",
            "provenance",
            "access_mode",
            "access_source",
            "reveal_conditions",
            "legal_relevance",
            "student_should_discover",
          ],
          properties: {
            key: { type: "string" },
            label: { type: "string" },
            value: { type: "string" },
            value_type: {
              type: "string",
              enum: [
                "TEXT",
                "DATE",
                "TIME",
                "NUMBER",
                "MONEY",
                "BOOLEAN",
                "LOCATION",
                "DOCUMENT_ID",
                "OTHER",
              ],
            },
            precision: {
              type: "string",
              enum: ["EXACT", "APPROXIMATE", "RANGE", "NONE"],
            },
            provenance: { type: "string", enum: PROVENANCE },
            access_mode: { type: "string", enum: ACCESS_MODE },
            access_source: { type: "string" },
            reveal_conditions: { type: "array", items: { type: "string" } },
            legal_relevance: {
              type: "string",
              enum: ["HIGH", "MEDIUM", "LOW"],
            },
            student_should_discover: { type: "boolean" },
          },
        },
      },
      documents: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "status", "access_mode", "detail"],
          properties: {
            name: { type: "string" },
            status: {
              type: "string",
              enum: [
                "AVAILABLE",
                "EXISTS_NOT_AT_HAND",
                "MENTIONED_UNCONFIRMED",
                "UNAVAILABLE",
              ],
            },
            access_mode: { type: "string", enum: ACCESS_MODE },
            detail: { type: "string" },
          },
        },
      },
      timeline: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["when", "event"],
          properties: {
            when: { type: "string" },
            event: { type: "string" },
          },
        },
      },
      available_evidence: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "detail"],
          properties: {
            name: { type: "string" },
            detail: { type: "string" },
          },
        },
      },
      missing_evidence: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "reason"],
          properties: {
            name: { type: "string" },
            reason: { type: "string" },
          },
        },
      },
      open_questions: { type: "array", items: { type: "string" } },
      professional_intent: {
        type: "string",
        enum: ["NONE", "UNCERTAIN", "POSSIBLE", "EXPLICIT"],
      },
      completeness: {
        type: "object",
        additionalProperties: false,
        required: [
          "main_event",
          "event_date_or_period",
          "actors",
          "chronology",
          "current_status",
          "prior_actions",
          "documents",
          "available_evidence",
          "missing_evidence",
          "open_questions",
          "professional_intent",
        ],
        properties: {
          main_event: { type: "string", enum: COMPLETENESS_LEVEL },
          event_date_or_period: { type: "string", enum: COMPLETENESS_LEVEL },
          actors: { type: "string", enum: COMPLETENESS_LEVEL },
          chronology: { type: "string", enum: COMPLETENESS_LEVEL },
          current_status: { type: "string", enum: COMPLETENESS_LEVEL },
          prior_actions: { type: "string", enum: COMPLETENESS_LEVEL },
          documents: { type: "string", enum: COMPLETENESS_LEVEL },
          available_evidence: { type: "string", enum: COMPLETENESS_LEVEL },
          missing_evidence: { type: "string", enum: COMPLETENESS_LEVEL },
          open_questions: { type: "string", enum: COMPLETENESS_LEVEL },
          professional_intent: { type: "string", enum: COMPLETENESS_LEVEL },
        },
      },
      canon_generation_notes: { type: "array", items: { type: "string" } },
    },
  },
};

const SYSTEM_PROMPT = `Você é o SIMULATION_CANON_BUILDER do Anjo Acadêmico.

Sua função é transformar uma situação identificada pelo Radar Jurídico em um Caso
de Estudo completo e coerente para entrevista acadêmica simulada.

IMPORTANTE
Você não está reconstruindo a vida real do autor da publicação. Você cria uma
realidade acadêmica própria, inspirada no núcleo factual identificado. O
resultado será usado por um Cliente Simulado por IA.

PRESERVE O NÚCLEO
Fatos explicitamente presentes na origem devem ser preservados
(provenance=SOURCE_EXPLICIT). Fatos apenas normalizados: SOURCE_NORMALIZED.

COMPLETE O CASO
Quando a origem possuir lacunas que tornariam a entrevista artificial, impossível
ou repetidamente inconclusiva, crie fatos sintéticos plausíveis
(provenance=SYNTHETIC_CANON): datas, períodos, horários, valores, sequência
cronológica, protocolos fictícios, documentos simulados, ações administrativas,
canais de contato, respostas recebidas, motivos administrativos, evidências,
detalhes contextuais.

NÃO CONTRADIGA A ORIGEM
Nunca altere um fato explícito. Nunca mude a natureza central do caso. Nunca
troque a área jurídica sem fundamento. Nunca reutilize CPF, telefone, e-mail,
endereço exato ou identificador real (use dados fictícios).

COERÊNCIA TEMPORAL
Datas compatíveis. Um recurso não pode ser apresentado antes do fato que o gerou.
Uma decisão não ocorre antes do protocolo. O boletim respeita a cronologia do
conhecimento do evento.

ANCORAGEM TEMPORAL (OBRIGATÓRIA — REGRA DURA)
DATA_DE_REFERENCIA é o "hoje" da simulação (data em que o caso foi cadastrado).
JANELA PERMITIDA para TODA data do Cânone: de DATA_MINIMA (piso) até
DATA_DE_REFERENCIA (teto), inclusive.
- NUNCA gere data DEPOIS de DATA_DE_REFERENCIA. Não existe futuro na simulação:
  nada de audiências, prazos ou decisões marcadas para depois de hoje.
- NUNCA gere data ANTES de DATA_MINIMA.
O caso é RECENTE e está EM ANDAMENTO: o evento principal costuma cair poucas
semanas a poucos meses antes da DATA_DE_REFERENCIA, e as ações posteriores (BO,
recurso, decisão) vêm depois dele, mas ainda ANTES ou IGUAL a DATA_DE_REFERENCIA.
Ao normalizar expressões vagas ("faz uns meses"), calcule a partir da
DATA_DE_REFERENCIA. Se uma etapa esperada ainda não teria acontecido dentro dessa
janela, trate-a como pendente/aguardando (sem inventar data futura).

COERÊNCIA DOCUMENTAL
Se a pessoa protocolou recurso, defina coerentemente protocolo/comprovante/e-mail/
portal. Se algo é consultável durante a entrevista, use access_mode=CONSULTABLE_NOW
com access_source.

CONTROLE DE ACESSO HUMANO (access_mode por fato)
REMEMBERED_EXACT, REMEMBERED_APPROXIMATE, CONSULTABLE_NOW, KNOWN_BUT_NOT_AT_HAND,
DOES_NOT_REMEMBER, UNKNOWN, UNAVAILABLE, NOT_APPLICABLE.
Não marque datas documentais importantes como UNKNOWN só porque a postagem não as
informou. Quando a pessoa normalmente poderia consultar uma data em aplicativo,
documento, e-mail ou portal, prefira criar um valor canônico coerente e usar
CONSULTABLE_NOW. Preencha value com o valor canônico mesmo em CONSULTABLE_NOW,
KNOWN_BUT_NOT_AT_HAND e REMEMBERED_*. Deixe value vazio apenas em UNKNOWN,
UNAVAILABLE, DOES_NOT_REMEMBER e NOT_APPLICABLE.

PRESERVE LACUNAS ACADÊMICAS
Não complete tudo. O estudante ainda precisa identificar informações e provas
ausentes. Misture: fatos disponíveis, consultáveis, aproximados; documentos
existentes e não disponíveis; evidências disponíveis e ausentes; questões abertas.

COMPLETUDE DA ENTREVISTA
O caso precisa permitir uma entrevista funcional. Garanta informação suficiente
sobre: evento principal, período/data, atores, cronologia, situação atual, ações
tomadas, documentos, evidências, lacunas, intenção profissional. NÃO publique uma
simulação em que a maioria das perguntas factuais básicas resulte em "não sei" ou
"não foi informado".

Retorne somente o objeto estruturado solicitado, em português do Brasil.`;

function buildUserPrompt(sourceCase, referenceDate, minDate) {
  return `CASO DE ESTUDO ACADÊMICO — MATERIAL DE ORIGEM (não copie identificadores):

DATA_DE_REFERENCIA (teto — hoje da simulação, nenhuma data pode ultrapassá-la): ${referenceDate}
DATA_MINIMA (piso — nenhuma data pode ser anterior): ${minDate}

TÍTULO: ${sourceCase?.title || "não informado"}
ÁREA JURÍDICA: ${sourceCase?.legal_area || "não informada"}

RELATO ACADÊMICO (SOURCE_CASE):
${sourceCase?.academic_full_case_content || sourceCase?.academic_summary || "não informado"}

FATOS DISPONÍVEIS NA ORIGEM:
${JSON.stringify(sourceCase?.available_facts || [], null, 0)}

INFORMAÇÕES FALTANTES SINALIZADAS:
${JSON.stringify(sourceCase?.missing_information || [], null, 0)}

DOCUMENTOS MENCIONADOS:
${JSON.stringify(sourceCase?.mentioned_documents || [], null, 0)}

CRONOLOGIA CONHECIDA:
${JSON.stringify(sourceCase?.known_timeline || [], null, 0)}

QUESTÕES ABERTAS:
${JSON.stringify(sourceCase?.open_questions || [], null, 0)}

Construa o CÂNONE DA SIMULAÇÃO completo e coerente conforme o schema.`;
}

/**
 * Constrói o Cânone da Simulação a partir do caso de origem (chave ANJO).
 * Nunca lança. Retorna { ok, data, usage, feature, promptVersion, schemaVersion }.
 */
// Piso temporal absoluto do produto: nada antes de 2026-01-01.
const CANON_MIN_DATE = "2026-01-01";

const ISO_DATE_RE = /\b(\d{4})-(\d{2})-(\d{2})\b/;

// Rede de segurança determinística: nenhuma data ISO (YYYY-MM-DD) em fatos DATE
// pode passar do teto (ref) nem ficar antes do piso (min). Comparação lexical de
// ISO = comparação cronológica. Só ajusta valores claramente fora da janela.
function clampCanonDates(data, ref, min) {
  const facts = Array.isArray(data?.canonical_facts) ? data.canonical_facts : [];
  for (const f of facts) {
    if (!f || f.value_type !== "DATE" || typeof f.value !== "string") continue;
    const m = f.value.match(ISO_DATE_RE);
    if (!m) continue;
    const iso = m[0];
    if (iso > ref) f.value = ref;
    else if (iso < min) f.value = min;
  }
}

export async function buildSimulationCanon(sourceCase, { referenceDate } = {}) {
  const todayIso = new Date().toISOString().slice(0, 10);
  // Teto = data de cadastro do caso (nunca depois de hoje). Nunca antes do piso.
  let ref = (referenceDate || todayIso).slice(0, 10);
  if (ref > todayIso) ref = todayIso;
  if (ref < CANON_MIN_DATE) ref = todayIso;

  const result = await callAngelJson({
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(sourceCase, ref, CANON_MIN_DATE),
    schema: CANON_SCHEMA,
    temperature: 0.5,
    maxTokens: 3200,
  });

  if (!result.ok || !result.data?.academic_case_title) {
    return { ok: false, error: result.error || "CANON_BUILD_FAILED" };
  }

  clampCanonDates(result.data, ref, CANON_MIN_DATE);

  return {
    ok: true,
    data: result.data,
    usage: result.usage,
    feature: AI_FEATURES.ACADEMIC_ANGEL_SIMULATION_CANON_BUILDER,
    promptVersion: PROMPT_VERSIONS.CANON_BUILDER,
    schemaVersion: SCHEMA_VERSION,
  };
}
