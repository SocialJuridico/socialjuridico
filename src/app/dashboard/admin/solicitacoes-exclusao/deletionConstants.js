export const STATUS_META = {
  PENDENTE: { label: "Pendente", tone: "pending" },
  EM_ANALISE: { label: "Em análise", tone: "review" },
  AGUARDANDO_USUARIO: { label: "Aguardando titular", tone: "waiting" },
  APROVADA: { label: "Aprovada", tone: "approved" },
  REJEITADA: { label: "Rejeitada", tone: "rejected" },
  CANCELADA: { label: "Cancelada", tone: "cancelled" },
  PROCESSANDO: { label: "Processando", tone: "processing" },
  CONCLUIDA: { label: "Concluída", tone: "completed" },
  FALHA: { label: "Falha", tone: "failed" },
};

export const STATUS_FILTERS = [
  ["all", "Todas"],
  ["PENDENTE", "Pendentes"],
  ["EM_ANALISE", "Em análise"],
  ["AGUARDANDO_USUARIO", "Aguardando"],
  ["APROVADA", "Aprovadas"],
  ["PROCESSANDO", "Processando"],
  ["CONCLUIDA", "Concluídas"],
  ["FALHA", "Com falha"],
  ["REJEITADA", "Rejeitadas"],
];

export const DETAIL_PURPOSE_OPTIONS = [
  ["ANALISE_LGPD", "Análise do pedido LGPD"],
  ["VALIDACAO_IDENTIDADE", "Validação da identidade do titular"],
  ["CONTATO_TITULAR", "Contato com o titular"],
  ["PROCESSAMENTO_EXCLUSAO", "Preparação do processamento definitivo"],
];

export const LEGAL_BASIS_OPTIONS = [
  ["LGPD_ART_18", "Atendimento ao direito do titular — LGPD, art. 18"],
  ["VALIDACAO_IDENTIDADE", "Identidade confirmada para atendimento seguro"],
  ["OBRIGACAO_LEGAL_RETENCAO", "Retenção parcial por obrigação legal"],
  ["EXERCICIO_REGULAR_DIREITOS", "Exercício regular de direitos"],
  ["SOLICITACAO_INCOMPLETA", "Solicitação incompleta ou não comprovada"],
];

export const ACTION_META = {
  START_REVIEW: {
    title: "Iniciar análise",
    description: "Assumir a solicitação e registrar o início da avaliação.",
    requiresReason: false,
    requiresLegalBasis: false,
  },
  REQUEST_INFORMATION: {
    title: "Solicitar complementação",
    description: "Pausar a decisão até que o titular forneça informações adicionais.",
    requiresReason: true,
    requiresLegalBasis: false,
  },
  APPROVE: {
    title: "Aprovar solicitação",
    description: "Autorizar o pedido para a etapa de processamento definitivo.",
    requiresReason: true,
    requiresLegalBasis: true,
  },
  REJECT: {
    title: "Rejeitar solicitação",
    description: "Encerrar o pedido com fundamento e justificativa registrados.",
    requiresReason: true,
    requiresLegalBasis: true,
  },
  REOPEN: {
    title: "Reabrir análise",
    description: "Retornar o pedido para análise após falha ou nova informação.",
    requiresReason: true,
    requiresLegalBasis: false,
  },
};

export const PROFILE_LABELS = {
  LAWYER: "Advogado",
  CLIENT: "Cliente",
  UNKNOWN: "Perfil não identificado",
};

export const AUDIT_LABELS = {
  REQUEST_CREATED: "Solicitação criada",
  VIEW_DETAILS: "Dados protegidos consultados",
  START_REVIEW: "Análise iniciada",
  REQUEST_INFORMATION: "Complementação solicitada",
  APPROVE: "Solicitação aprovada",
  REJECT: "Solicitação rejeitada",
  REOPEN: "Análise reaberta",
  PROCESS_START: "Processamento iniciado",
  PROCESS_SUCCESS: "Exclusão concluída",
  PROCESS_FAILURE: "Falha no processamento",
  EMAIL_SENT: "Confirmação enviada",
  EMAIL_FAILURE: "Falha no e-mail de confirmação",
};
