// Constantes e helpers isomórficos da classificação social/prioridade dos casos.
// Usado tanto no servidor (classificador + persistência) quanto na UI (badges).

export const PRIORITY_CODES = ["URGENTE", "PREFERENCIAL", "NORMAL"];

export const SOCIAL_TYPE_CODES = [
  "DIREITO_RACIAL",
  "DIREITO_IDOSO",
  "DIREITO_INFANTIL",
  "DIREITO_MULHER",
  "DIREITO_LGBTQIA",
  "TRABALHO_ESCRAVO",
  "NENHUM",
];

export const PRIORITY_LABELS = {
  URGENTE: "Urgente",
  PREFERENCIAL: "Preferencial",
  NORMAL: "Normal",
};

export const SOCIAL_TYPE_LABELS = {
  DIREITO_RACIAL: "Direito Racial",
  DIREITO_IDOSO: "Direito do Idoso",
  DIREITO_INFANTIL: "Direito Infantil",
  DIREITO_MULHER: "Direito da Mulher",
  DIREITO_LGBTQIA: "Direito LGBTQIA+",
  TRABALHO_ESCRAVO: "Trabalho Escravo",
  NENHUM: "",
};

// Descrições jurídicas de referência (injetadas no prompt da IA).
export const SOCIAL_TYPE_GUIDE = {
  DIREITO_RACIAL:
    "Proteção contra discriminação e promoção da igualdade étnico-racial (racismo como crime inafiançável e imprescritível; Estatuto da Igualdade Racial, Lei 12.288/2010).",
  DIREITO_IDOSO:
    "Pessoas com 60 anos ou mais. Estatuto da Pessoa Idosa (Lei 10.741/2003): prioridade absoluta, amparo contra violência e negligência.",
  DIREITO_INFANTIL:
    "Menores de 18 anos. Proteção integral e prioridade absoluta (Art. 227 CF e ECA): vida, saúde, educação, proteção contra negligência e violência.",
  DIREITO_MULHER:
    "Violência de gênero, doméstica ou familiar contra a mulher (física, psicológica, moral, patrimonial ou sexual) — Lei Maria da Penha (Lei 11.340/2006).",
  DIREITO_LGBTQIA:
    "Direitos da comunidade LGBTQIA+ (STF): união equiparada, criminalização da homotransfobia (equiparada ao racismo), retificação de nome e gênero.",
  TRABALHO_ESCRAVO:
    "Trabalho forçado, jornada exaustiva, condições degradantes ou servidão por dívida (Art. 149 CP; Lei 15.455/26 de proteção e acolhimento).",
};

export function normalizePriority(value) {
  const upper = String(value || "").trim().toUpperCase();
  return PRIORITY_CODES.includes(upper) ? upper : "NORMAL";
}

export function normalizeSocialType(value) {
  const upper = String(value || "").trim().toUpperCase();
  return SOCIAL_TYPE_CODES.includes(upper) ? upper : "NENHUM";
}

export function isSocialCase(tipoSocial) {
  const code = normalizeSocialType(tipoSocial);
  return code !== "NENHUM";
}

export function priorityLabel(value) {
  return PRIORITY_LABELS[normalizePriority(value)];
}

export function socialTypeLabel(value) {
  return SOCIAL_TYPE_LABELS[normalizeSocialType(value)] || "";
}
