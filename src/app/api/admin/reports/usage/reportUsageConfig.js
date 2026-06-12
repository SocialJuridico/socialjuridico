export const ADVOCATE_SURVEY_COLUMNS = [
  "q1_velocidade",
  "q2_marketplace",
  "q3_ia_redator",
  "q4_ia_personalidade",
  "q5_seguranca",
  "q6_prazos",
  "q7_crm",
  "q8_smartdocs",
  "q9_suporte",
  "q10_roi",
];

export const CLIENT_SURVEY_COLUMNS = [
  "q1_cadastro",
  "q2_clareza",
  "q3_velocidade",
  "q4_confianca",
  "q5_qualidade",
  "q6_chat",
  "q7_transparencia",
  "q8_seguranca",
  "q9_pwa",
  "q10_recomendacao",
];

export const DEFAULT_REPORT_OPTIONS = {
  period: 7,
  includeLawyers: true,
  includeClients: true,
  includeDbTotals: true,
  includeSatisfaction: true,
  includePremiumUsage: true,
};

const VALID_PERIODS = new Set([7, 15, 30]);

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return String(value).toLowerCase() === "true";
}

export function normalizeReportOptions(input = {}) {
  const requestedPeriod = Number(input.period);
  const options = {
    period: VALID_PERIODS.has(requestedPeriod)
      ? requestedPeriod
      : DEFAULT_REPORT_OPTIONS.period,
    includeLawyers: parseBoolean(
      input.includeLawyers,
      DEFAULT_REPORT_OPTIONS.includeLawyers,
    ),
    includeClients: parseBoolean(
      input.includeClients,
      DEFAULT_REPORT_OPTIONS.includeClients,
    ),
    includeDbTotals: parseBoolean(
      input.includeDbTotals,
      DEFAULT_REPORT_OPTIONS.includeDbTotals,
    ),
    includeSatisfaction: parseBoolean(
      input.includeSatisfaction,
      DEFAULT_REPORT_OPTIONS.includeSatisfaction,
    ),
    includePremiumUsage: parseBoolean(
      input.includePremiumUsage,
      DEFAULT_REPORT_OPTIONS.includePremiumUsage,
    ),
  };

  if (!options.includeLawyers && !options.includeClients) {
    const error = new Error("Selecione pelo menos Advogados ou Clientes.");
    error.status = 400;
    throw error;
  }

  if (!options.includeLawyers) options.includePremiumUsage = false;

  return options;
}
