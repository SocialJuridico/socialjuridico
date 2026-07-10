// Minimização/pseudonimização do conteúdo acadêmico do Radar.
//
// A geração por IA já produz uma versão minimizada, mas aplicamos uma camada
// de defesa: campos de origem nunca saem para o estudante e um scrub leve
// remove identificadores óbvios que porventura escapem.

// Campos de origem que NUNCA podem ser expostos ao estudante.
export const FORBIDDEN_SOURCE_FIELDS = [
  "radar_source_id",
  "source_url",
  "url_original",
  "source_platform",
  "source_collected_at",
  "source_content_hash",
  "source_snapshot_reference",
  "fonte",
  "fonte_tipo",
];

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/gi;
const PHONE_RE = /(\+?55\s?)?(\(?\d{2}\)?\s?)?\d{4,5}[-\s]?\d{4}/g;
const URL_RE = /https?:\/\/\S+/gi;
const CPF_RE = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;

/**
 * Remove identificadores diretos de um texto acadêmico (defesa em profundidade).
 */
export function scrubIdentifiers(text) {
  if (!text || typeof text !== "string") return text;
  return text
    .replace(EMAIL_RE, "[e-mail removido]")
    .replace(URL_RE, "[link removido]")
    .replace(CPF_RE, "[documento removido]")
    .replace(PHONE_RE, "[telefone removido]")
    .trim();
}

function scrubList(list) {
  if (!Array.isArray(list)) return [];
  return list.map((item) =>
    typeof item === "string" ? scrubIdentifiers(item) : item,
  );
}

/**
 * Serializa um caso acadêmico para o estudante, removendo campos de origem e
 * o fact_state interno (o Cliente Simulado usa o fact_state apenas no servidor).
 */
export function serializeAcademicCaseForStudent(caso) {
  if (!caso) return null;
  return {
    id: caso.id,
    title: scrubIdentifiers(caso.title),
    legalArea: caso.legal_area || "Área não informada",
    academicSummary: scrubIdentifiers(caso.academic_summary),
    academicFullContent: scrubIdentifiers(caso.academic_full_case_content),
    availableFacts: scrubList(caso.available_facts),
    missingInformation: scrubList(caso.missing_information),
    mentionedDocuments: Array.isArray(caso.mentioned_documents)
      ? caso.mentioned_documents
      : [],
    knownTimeline: Array.isArray(caso.known_timeline)
      ? caso.known_timeline
      : [],
    openQuestions: scrubList(caso.open_questions),
    status: caso.status,
    createdAt: caso.created_at,
  };
}

/**
 * Versão resumida para os cards da listagem.
 */
export function serializeAcademicCaseCard(caso) {
  if (!caso) return null;
  // Entrevista disponível somente com Cânone congelado (READY).
  const hasInterview =
    caso.canon_status === "READY" &&
    caso.fact_state &&
    Object.keys(caso.fact_state || {}).length > 0;
  return {
    id: caso.id,
    title: scrubIdentifiers(caso.title),
    legalArea: caso.legal_area || "Área não informada",
    academicSummary: scrubIdentifiers(caso.academic_summary),
    hasSimulatedInterview: Boolean(hasInterview),
    createdAt: caso.created_at,
  };
}
