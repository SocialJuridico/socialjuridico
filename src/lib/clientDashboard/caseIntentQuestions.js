export const TRIAGE_QUESTIONS = [
  {
    id: "objetivo",
    question: "O que você busca agora?",
    options: [
      {
        value: "CONDUZIR",
        label: "Quero encontrar um advogado para conduzir minha situação.",
        points: 30,
      },
      {
        value: "ANALISAR",
        label: "Quero que um advogado analise meu caso antes de decidir.",
        points: 20,
      },
      {
        value: "URGENCIA",
        label: "Preciso de atendimento com urgência.",
        points: 25,
      },
      {
        value: "INFORMACAO",
        label: "Estou apenas buscando informações sobre meus direitos.",
        points: 0,
      },
    ],
  },
  {
    id: "prazo",
    question: "Quando pretende dar andamento à situação?",
    options: [
      { value: "AGORA", label: "Quero resolver isso agora.", points: 25 },
      { value: "DIAS", label: "Nos próximos dias.", points: 15 },
      {
        value: "AVALIANDO",
        label: "Ainda estou avaliando o que fazer.",
        points: 5,
      },
      {
        value: "NAO_PRETENDE",
        label: "Não pretendo contratar um advogado neste momento.",
        points: 0,
      },
    ],
  },
  {
    id: "advogadoAtual",
    question: "Você já possui um advogado cuidando desta mesma situação?",
    options: [
      { value: "NAO", label: "Não.", points: 20 },
      {
        value: "BUSCANDO_OUTRO",
        label: "Sim, mas estou buscando outro profissional.",
        points: 15,
      },
      {
        value: "CONVERSANDO",
        label: "Estou conversando com um advogado, mas ainda não contratei.",
        points: 8,
      },
      {
        value: "JA_CONTRATADO",
        label: "Sim, já tenho advogado contratado.",
        points: 0,
      },
    ],
  },
  {
    id: "disponibilidade",
    question:
      "Se um advogado demonstrar interesse hoje, você está disponível para conversar?",
    options: [
      { value: "HOJE", label: "Sim, posso conversar hoje.", points: 25 },
      { value: "48H", label: "Sim, nas próximas 48 horas.", points: 18 },
      { value: "DIAS", label: "Somente nos próximos dias.", points: 8 },
      {
        value: "NAO_PRONTO",
        label: "Ainda não estou pronto para conversar.",
        points: 0,
      },
    ],
  },
];

export function computeFallbackIntentScore(respostas) {
  const answers = respostas && typeof respostas === "object" ? respostas : {};

  const total = TRIAGE_QUESTIONS.reduce((sum, question) => {
    const chosen = answers[question.id];
    const option = question.options.find((item) => item.value === chosen);
    return sum + (option ? option.points : 0);
  }, 0);

  return Math.max(0, Math.min(100, total));
}

// Mesmas faixas usadas na RPC list_lawyer_opportunities (ver migration
// 20260706_opportunities_intent_tiers.sql) — mantidas em um único lugar
// aqui para reuso em templates de email e futura UI.
export const INTENT_TIER_LABELS = {
  ALTA: "Alta intenção",
  MEDIA: "Média intenção",
  ORACULO: "Oráculos",
  LEGADO: "Sem triagem",
};

export function getIntentTier(intencaoFechamento) {
  if (intencaoFechamento === null || intencaoFechamento === undefined) {
    return "LEGADO";
  }
  if (intencaoFechamento >= 80) return "ALTA";
  if (intencaoFechamento >= 60) return "MEDIA";
  return "ORACULO";
}
