export const ORACULO_INSTITUTION_STATUSES = [
  "RASCUNHO",
  "PENDENTE_DOCUMENTOS",
  "EM_ANALISE_ACADEMICA",
  "EM_ANALISE_JURIDICA",
  "PENDENTE_CONTRATO",
  "PENDENTE_LGPD",
  "PENDENTE_OAB",
  "APROVADA",
  "ATIVA",
  "SUSPENSA",
  "CONTRATO_EXPIRADO",
  "ENCERRADA",
];

export const ORACULO_INSTITUTION_STATUS_LABELS = {
  RASCUNHO: "Rascunho",
  PENDENTE_DOCUMENTOS: "Pendente de documentos",
  EM_ANALISE_ACADEMICA: "Em análise acadêmica",
  EM_ANALISE_JURIDICA: "Em análise jurídica",
  PENDENTE_CONTRATO: "Pendente de contrato",
  PENDENTE_LGPD: "Pendente de LGPD",
  PENDENTE_OAB: "Pendente de OAB",
  APROVADA: "Aprovada",
  ATIVA: "Ativa",
  SUSPENSA: "Suspensa",
  CONTRATO_EXPIRADO: "Contrato expirado",
  ENCERRADA: "Encerrada",
};

export const ORACULO_PARTNERSHIP_MODALITIES = [
  "PRATICA_NPJ",
  "ESTAGIO_OBRIGATORIO",
  "ESTAGIO_NAO_OBRIGATORIO",
  "ESTAGIO_OAB",
];

export const ORACULO_PARTNERSHIP_MODALITY_LABELS = {
  PRATICA_NPJ: "Prática Jurídica Supervisionada / NPJ",
  ESTAGIO_OBRIGATORIO: "Estágio obrigatório",
  ESTAGIO_NAO_OBRIGATORIO: "Estágio não obrigatório",
  ESTAGIO_OAB: "Estágio profissional de advocacia - OAB",
};

export const ORACULO_ALLOWED_STATUS_TRANSITIONS = {
  RASCUNHO: ["PENDENTE_DOCUMENTOS", "EM_ANALISE_ACADEMICA", "ENCERRADA"],
  PENDENTE_DOCUMENTOS: ["EM_ANALISE_ACADEMICA", "RASCUNHO", "ENCERRADA"],
  EM_ANALISE_ACADEMICA: [
    "EM_ANALISE_JURIDICA",
    "PENDENTE_DOCUMENTOS",
    "ENCERRADA",
  ],
  EM_ANALISE_JURIDICA: [
    "PENDENTE_CONTRATO",
    "PENDENTE_LGPD",
    "PENDENTE_OAB",
    "APROVADA",
    "PENDENTE_DOCUMENTOS",
    "ENCERRADA",
  ],
  PENDENTE_CONTRATO: ["APROVADA", "EM_ANALISE_JURIDICA", "ENCERRADA"],
  PENDENTE_LGPD: ["APROVADA", "EM_ANALISE_JURIDICA", "ENCERRADA"],
  PENDENTE_OAB: ["APROVADA", "EM_ANALISE_JURIDICA", "ENCERRADA"],
  APROVADA: ["ATIVA", "PENDENTE_CONTRATO", "PENDENTE_LGPD", "PENDENTE_OAB"],
  ATIVA: ["SUSPENSA", "CONTRATO_EXPIRADO", "ENCERRADA"],
  SUSPENSA: ["ATIVA", "ENCERRADA"],
  CONTRATO_EXPIRADO: ["ATIVA", "ENCERRADA"],
  ENCERRADA: [],
};

export const ORACULO_CHECKLIST_ITEMS = [
  {
    key: "emec_instituicao_validada",
    label: "Instituição validada no e-MEC",
  },
  { key: "emec_curso_validado", label: "Curso de Direito validado" },
  {
    key: "documentacao_regulatoria_conferida",
    label: "Documentação regulatória conferida",
  },
  { key: "representante_validado", label: "Representante legal validado" },
  {
    key: "poderes_assinatura_conferidos",
    label: "Poderes de assinatura conferidos",
  },
  { key: "contrato_assinado", label: "Contrato assinado" },
  { key: "convenio_assinado", label: "Convênio assinado" },
  { key: "modalidade_definida", label: "Modalidade acadêmica definida" },
  { key: "ppc_regulamento_conferido", label: "PPC/regulamento conferido" },
  {
    key: "professor_orientador_designado",
    label: "Professor orientador designado",
  },
  {
    key: "supervisor_formal_validado",
    label: "Supervisor jurídico formal validado",
  },
  { key: "oab_supervisor_validada", label: "OAB do supervisor validada" },
  { key: "plano_atividades_aprovado", label: "Plano de atividades aprovado" },
  { key: "modelo_relatorio_aprovado", label: "Modelo de relatório aprovado" },
  { key: "seguro_validado", label: "Seguro validado, quando aplicável" },
  { key: "tce_aprovado", label: "TCE aprovado, quando aplicável" },
  { key: "anexo_lgpd_assinado", label: "Anexo LGPD assinado" },
  {
    key: "oab_seccional_validada",
    label: "OAB/Seccional validada, quando aplicável",
  },
  {
    key: "pronta_para_ativacao",
    label: "Instituição pronta para ativação",
  },
];

export function getRequiredChecklistKeys(modality) {
  return ORACULO_CHECKLIST_ITEMS.filter((item) => {
    if (item.key === "oab_seccional_validada") {
      return modality === "ESTAGIO_OAB";
    }
    if (item.key === "seguro_validado") {
      return modality !== "PRATICA_NPJ";
    }
    return true;
  }).map((item) => item.key);
}

export function validateInstitutionStatusTransition(fromStatus, toStatus) {
  if (!ORACULO_INSTITUTION_STATUSES.includes(toStatus)) {
    return "Status inválido.";
  }
  if (!fromStatus || fromStatus === toStatus) {
    return null;
  }
  const allowed = ORACULO_ALLOWED_STATUS_TRANSITIONS[fromStatus] || [];
  if (!allowed.includes(toStatus)) {
    return `Transição de ${fromStatus} para ${toStatus} não permitida.`;
  }
  return null;
}

export function validateInstitutionDossier(dossier) {
  const errors = [];
  const modality = dossier?.modalidade_parceria;
  const academic = dossier?.estrutura_academica || {};
  const instruments = dossier?.instrumentos || {};
  const supervisor = dossier?.supervisor_principal || {};
  const checklist = dossier?.checklist_ativacao || {};

  if (
    modality &&
    !ORACULO_PARTNERSHIP_MODALITIES.includes(String(modality).toUpperCase())
  ) {
    errors.push("Modalidade da parceria inválida.");
  }

  const reportMonths = Number(academic.periodicidade_relatorio_meses || 0);
  if (reportMonths && reportMonths > 6) {
    errors.push("A periodicidade do relatório não pode passar de 6 meses.");
  }

  const dailyHours = Number(instruments.horas_dia || 0);
  if (dailyHours && dailyHours > 6) {
    errors.push("A jornada diária não pode passar de 6 horas.");
  }

  const weeklyHours = Number(instruments.horas_semana || 0);
  if (weeklyHours && weeklyHours > 30) {
    errors.push("A jornada semanal não pode passar de 30 horas.");
  }

  const examReduction = Number(instruments.reducao_percent || 0);
  if (instruments.reduz_avaliacao && examReduction < 50) {
    errors.push("A redução em avaliações deve ser de pelo menos 50%.");
  }

  const maxSupervised = Number(supervisor.max_estudantes || 0);
  if (
    ["ESTAGIO_OBRIGATORIO", "ESTAGIO_NAO_OBRIGATORIO"].includes(modality) &&
    maxSupervised &&
    maxSupervised > 10
  ) {
    errors.push("Na regra padrão da Lei 11.788, o supervisor não pode passar de 10 estudantes.");
  }

  if (modality === "ESTAGIO_OAB") {
    const oabYears = Number(
      supervisor.oab_anos_experiencia ||
        supervisor.poderes?.oab_anos_experiencia ||
        0,
    );
    if (oabYears && oabYears <= 5) {
      errors.push("No estágio profissional OAB, o supervisor principal precisa ter mais de 5 anos de OAB.");
    }
  }

  const status = dossier?.status;
  if (status === "ATIVA") {
    const missing = getRequiredChecklistKeys(modality).filter(
      (key) => !checklist[key],
    );
    if (missing.length) {
      errors.push("A ativação exige concluir o checklist administrativo obrigatório.");
    }
  }

  return errors;
}
