// Helpers puros da Biblioteca Jurídica (sem dependência de servidor).
// Podem ser importados por componentes client.

export const LEGAL_CATEGORY_LABELS = {
  CONSTITUTIONAL: "Direito Constitucional",
  CIVIL: "Direito Civil",
  CIVIL_PROCEDURE: "Processo Civil",
  CRIMINAL: "Direito Penal",
  CRIMINAL_PROCEDURE: "Processo Penal",
  CONSUMER: "Direito do Consumidor",
  LABOR: "Direito do Trabalho",
  TAX: "Direito Tributário",
  CHILDREN_AND_YOUTH: "Criança e Adolescente",
  ELDERLY: "Pessoa Idosa",
  WOMEN_PROTECTION: "Proteção à Mulher",
  REAL_ESTATE: "Direito Imobiliário",
  DATA_PROTECTION: "Proteção de Dados",
  LEGAL_PROFESSION: "Advocacia e OAB",
  SMALL_CLAIMS: "Juizados Especiais",
  OTHER: "Legislação",
};

// Cores de destaque por accent do cover_config (identidade editorial própria).
export const LEGAL_ACCENTS = {
  GOLD: "#c8a24a",
  EMERALD: "#2f7d5b",
  AMBER: "#d08a1e",
  TEAL: "#2b7a78",
  CRIMSON: "#9b2d3a",
  INDIGO: "#4b4f8f",
  SLATE: "#4a5568",
  SKY: "#3d7ea6",
  ROSE: "#a8476a",
  PURPLE: "#6b3f8f",
  STONE: "#6b6255",
  CYAN: "#2c7a8c",
};

export function legalAccentColor(coverConfig) {
  const accent = coverConfig?.accent;
  return LEGAL_ACCENTS[accent] || LEGAL_ACCENTS.GOLD;
}

const LEGAL_UNIT_TYPE_LABELS = {
  PREAMBLE: "Preâmbulo",
  TITLE: "Título",
  BOOK: "Livro",
  PART: "Parte",
  CHAPTER: "Capítulo",
  SECTION: "Seção",
  SUBSECTION: "Subseção",
  ARTICLE: "Artigo",
  PARAGRAPH: "Parágrafo",
  SOLE_PARAGRAPH: "Parágrafo único",
  ITEM: "Inciso",
  SUBITEM: "Alínea",
  LETTER: "Alínea",
  ANNEX: "Anexo",
  OTHER: "Dispositivo",
};

export function legalUnitTypeLabel(unitType) {
  return LEGAL_UNIT_TYPE_LABELS[unitType] || "Dispositivo";
}

/**
 * Referência jurídica consistente (ABNT-like) do dispositivo.
 * Ex.: BRASIL. Lei nº 8.078, de 11 de setembro de 1990. Código de Defesa do
 * Consumidor. Art. 14.
 */
export function buildLegalCitation({ officialTitle, documentShortName, unitLabel }) {
  const parts = ["BRASIL."];
  if (officialTitle) parts.push(`${officialTitle}.`);
  // Inclui o nome (não a sigla) do documento quando houver.
  if (documentShortName && /\s/.test(documentShortName)) {
    parts.push(`${documentShortName}.`);
  }
  if (unitLabel) parts.push(`${unitLabel}.`);
  return parts.join(" ");
}
