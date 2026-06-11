export const LAWYER_QUESTIONS = [
  { key: "q1_velocidade", label: "Velocidade e estabilidade" },
  { key: "q2_marketplace", label: "Marketplace de casos" },
  { key: "q3_ia_redator", label: "Redator com IA" },
  { key: "q4_ia_personalidade", label: "Personalidade da IA" },
  { key: "q5_seguranca", label: "Segurança de dados" },
  { key: "q6_prazos", label: "Controle de prazos" },
  { key: "q7_crm", label: "CRM de clientes" },
  { key: "q8_smartdocs", label: "Organização de documentos" },
  { key: "q9_suporte", label: "Suporte da plataforma" },
  { key: "q10_roi", label: "Retorno sobre investimento" },
];

export const CLIENT_QUESTIONS = [
  { key: "q1_cadastro", label: "Facilidade de cadastro" },
  { key: "q2_clareza", label: "Clareza das informações" },
  { key: "q3_velocidade", label: "Velocidade de resposta" },
  { key: "q4_confianca", label: "Confiança nos profissionais" },
  { key: "q5_qualidade", label: "Qualidade do atendimento" },
  { key: "q6_chat", label: "Uso do chat integrado" },
  { key: "q7_transparencia", label: "Transparência de custos" },
  { key: "q8_seguranca", label: "Segurança de dados" },
  { key: "q9_pwa", label: "Acesso pelo celular" },
  { key: "q10_recomendacao", label: "Recomendaria a um amigo?" },
];

export function getSurveyQuestions(type) {
  return type === "clientes" ? CLIENT_QUESTIONS : LAWYER_QUESTIONS;
}

export function getSurveyUser(item, type) {
  return type === "clientes" ? item.clientes : item.advogados;
}

export function calculateSurveyAverage(item, questions) {
  if (!questions.length) return 0;
  const total = questions.reduce(
    (sum, question) => sum + Number(item?.[question.key] || 0),
    0,
  );
  return Number((total / questions.length).toFixed(1));
}

export function calculateSurveyStats(data) {
  const lawyers = data?.advogados || [];
  const clients = data?.clientes || [];

  const lawyerTotal = lawyers.reduce(
    (sum, item) => sum + calculateSurveyAverage(item, LAWYER_QUESTIONS),
    0,
  );
  const clientTotal = clients.reduce(
    (sum, item) => sum + calculateSurveyAverage(item, CLIENT_QUESTIONS),
    0,
  );
  const totalCount = lawyers.length + clients.length;

  return {
    lawyerCount: lawyers.length,
    clientCount: clients.length,
    totalCount,
    lawyerAverage: lawyers.length
      ? Number((lawyerTotal / lawyers.length).toFixed(1))
      : 0,
    clientAverage: clients.length
      ? Number((clientTotal / clients.length).toFixed(1))
      : 0,
    overallAverage: totalCount
      ? Number(((lawyerTotal + clientTotal) / totalCount).toFixed(1))
      : 0,
    withFeedback: [...lawyers, ...clients].filter((item) =>
      String(item.feedback || "").trim(),
    ).length,
  };
}

export function formatSurveyDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("pt-BR");
}
