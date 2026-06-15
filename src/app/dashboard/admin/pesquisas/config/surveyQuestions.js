export const SURVEY_TABS = {
  LAWYERS: "advogados",
  CLIENTS: "clientes",
  PLATFORM_UPDATE: "atualizacao",
};

export const LAWYER_QUESTIONS = [
  { key: "q1_velocidade", label: "Velocidade/Estabilidade" },
  { key: "q2_marketplace", label: "Marketplace de Casos" },
  { key: "q3_ia_redator", label: "Redator IA" },
  { key: "q4_ia_personalidade", label: "Personalidade IA" },
  { key: "q5_seguranca", label: "Segurança de Dados" },
  { key: "q6_prazos", label: "Controle de Prazos" },
  { key: "q7_crm", label: "CRM de Clientes" },
  { key: "q8_smartdocs", label: "Organização de Docs" },
  { key: "q9_suporte", label: "Suporte da Plataforma" },
  { key: "q10_roi", label: "Retorno sobre Investimento" },
];

export const CLIENT_QUESTIONS = [
  { key: "q1_cadastro", label: "Facilidade de Cadastro" },
  { key: "q2_clareza", label: "Clareza das Informações" },
  { key: "q3_velocidade", label: "Velocidade de Resposta" },
  { key: "q4_confianca", label: "Confiança nos Profissionais" },
  { key: "q5_qualidade", label: "Qualidade do Atendimento" },
  { key: "q6_chat", label: "Uso do Chat Integrado" },
  { key: "q7_transparencia", label: "Transparência de Custos" },
  { key: "q8_seguranca", label: "Segurança de Dados" },
  { key: "q9_pwa", label: "Acesso via Celular" },
  { key: "q10_recomendacao", label: "Recomendaria a um amigo?" },
];

export const PLATFORM_UPDATE_QUESTIONS = [
  { key: "q1_design", label: "Design visual" },
  { key: "q2_facilidade_uso", label: "Facilidade de uso" },
  { key: "q3_velocidade", label: "Velocidade" },
  { key: "q4_estabilidade", label: "Estabilidade" },
  { key: "q5_seguranca", label: "Seguranca" },
  { key: "q6_qualidade_geral", label: "Qualidade geral" },
  { key: "q7_qualidade_ia", label: "Qualidade da IA" },
  { key: "q8_cartao_digital", label: "Cartao digital" },
  { key: "q9_organizacao_rotas", label: "Organizacao das rotas" },
  { key: "q10_confianca_recomendar", label: "Recomendacao" },
];

export function getQuestionsByTab(tab) {
  if (tab === SURVEY_TABS.LAWYERS) return LAWYER_QUESTIONS;
  if (tab === SURVEY_TABS.PLATFORM_UPDATE) return PLATFORM_UPDATE_QUESTIONS;
  return CLIENT_QUESTIONS;
}
