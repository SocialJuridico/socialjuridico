export const CASE_VIEWS = {
  PIPELINE: "PIPELINE",
  LIST: "LIST",
  EMAIL_FUNNEL: "EMAIL_FUNNEL",
};

export const CASE_STAGES = [
  {
    value: "NEW",
    label: "Novos",
    shortLabel: "Novos",
    description: "Casos publicados ainda sem manifestação de interesse.",
  },
  {
    value: "MATCHING",
    label: "Com interesses",
    shortLabel: "Interesses",
    description: "Casos que já atraíram advogados.",
  },
  {
    value: "WAITING_CLIENT",
    label: "Aguardando cliente",
    shortLabel: "Aguardando",
    description: "Existem interesses pendentes de resposta do cliente.",
  },
  {
    value: "NEGOTIATING",
    label: "Em negociação",
    shortLabel: "Negociação",
    description: "Cliente e advogado avançaram para negociação.",
  },
  {
    value: "HIRED",
    label: "Contratados",
    shortLabel: "Contratados",
    description: "Casos que resultaram em contratação.",
  },
  {
    value: "CLOSED",
    label: "Encerrados",
    shortLabel: "Encerrados",
    description: "Casos finalizados sem pendência operacional.",
  },
  {
    value: "ARCHIVED",
    label: "Arquivados",
    shortLabel: "Arquivados",
    description: "Casos retirados do fluxo ativo sem exclusão destrutiva.",
  },
];

export const CASE_STAGE_MAP = Object.fromEntries(
  CASE_STAGES.map((stage) => [stage.value, stage]),
);

export const CASE_RISK_LEVELS = [
  {
    value: "STANDARD",
    label: "Padrão",
    description: "Sem mídia, anexos ou indicador especial de sensibilidade.",
  },
  {
    value: "ELEVATED",
    label: "Elevado",
    description: "Área jurídica potencialmente sensível ou atenção operacional adicional.",
  },
  {
    value: "RESTRICTED",
    label: "Restrito",
    description: "Caso com anexos ou mídia. Acesso deve ser estritamente necessário.",
  },
];

export const CASE_RISK_MAP = Object.fromEntries(
  CASE_RISK_LEVELS.map((level) => [level.value, level]),
);

export const SENSITIVE_ACCESS_PURPOSES = [
  { value: "SUPPORT", label: "Suporte ao usuário" },
  { value: "FRAUD_PREVENTION", label: "Prevenção de fraude ou abuso" },
  { value: "LEGAL_REQUEST", label: "Obrigação ou solicitação jurídica" },
  { value: "DATA_SUBJECT_REQUEST", label: "Solicitação do titular de dados" },
  { value: "INCIDENT_RESPONSE", label: "Resposta a incidente de segurança" },
  { value: "OTHER", label: "Outra finalidade legítima" },
];

export const EMAIL_JOURNEY_STEPS = [
  { value: "SENT", label: "Enviado" },
  { value: "OPENED", label: "Aberto" },
  { value: "CLICKED", label: "Clicou" },
  { value: "LOGGED_IN", label: "Entrou" },
  { value: "VIEWED_INTERESTS", label: "Visualizou" },
  { value: "RESPONDED", label: "Respondeu" },
];

export function getStageLabel(stage) {
  return CASE_STAGE_MAP[stage]?.label || stage || "Não definido";
}

export function getRiskLabel(risk) {
  return CASE_RISK_MAP[risk]?.label || risk || "Não definido";
}

export function getEmailStepIndex(step) {
  return EMAIL_JOURNEY_STEPS.findIndex((item) => item.value === step);
}
