export const SITE_PROJECTS = {
  LANDING_PAGE: {
    title: "Página Express de Captação",
    priceLabel: "A partir de R$ 450",
    description:
      "Página estratégica para captar contatos pelo WhatsApp, com SEO inicial e entrega rápida.",
    highlights: [
      "Entrega estimada em até 72h",
      "Hospedagem gratuita",
      "Botão de WhatsApp e formulário",
      "Suporte por 30 dias",
    ],
  },
  SITE_INSTITUCIONAL: {
    title: "Site Institucional Premium",
    priceLabel: "A partir de R$ 1.500",
    description:
      "Site completo para escritório ou advogado construir autoridade e apresentar seus serviços.",
    highlights: [
      "Home, sobre, serviços e contato",
      "Design responsivo e profissional",
      "SEO inicial e Google Maps",
      "Suporte por 30 dias",
    ],
  },
  SISTEMA_SOB_MEDIDA: {
    title: "Sistema Jurídico Sob Medida",
    priceLabel: "A partir de R$ 6.000",
    description:
      "Plataforma web com login, painel, banco de dados, automações e integrações personalizadas.",
    highlights: [
      "Painel administrativo",
      "Área do cliente e permissões",
      "Automações e relatórios",
      "Deploy e código organizado",
    ],
  },
  PRODUTO_COMPLETO: {
    title: "Produto Digital Completo",
    priceLabel: "A partir de R$ 9.000",
    description:
      "Site, banco de dados, painel de controle e aplicativo Android em um projeto integrado.",
    highlights: [
      "Site e painel administrativo",
      "Banco de dados e autenticação",
      "Aplicativo Android",
      "Arquitetura preparada para evolução",
    ],
  },
  OUTRO: {
    title: "Projeto Personalizado",
    priceLabel: "Orçamento sob análise",
    description:
      "Para necessidades específicas que não se encaixam nos formatos apresentados.",
    highlights: [
      "Escopo personalizado",
      "Análise técnica",
      "Proposta detalhada",
      "Cronograma sob medida",
    ],
  },
};

export const SITE_FEATURE_OPTIONS = [
  "WHATSAPP",
  "CONTACT_FORM",
  "BLOG",
  "CLIENT_AREA",
  "ONLINE_SCHEDULING",
  "PAYMENTS",
  "ADMIN_PANEL",
  "MOBILE_APP",
  "SEO",
  "OTHER",
];

const PROJECT_TYPES = new Set(Object.keys(SITE_PROJECTS));
const DOMAIN_STATUSES = new Set(["HAS_DOMAIN", "NEEDS_DOMAIN", "UNSURE"]);
const DEADLINES = new Set([
  "UP_TO_7_DAYS",
  "UP_TO_30_DAYS",
  "UP_TO_60_DAYS",
  "FLEXIBLE",
]);
const BUDGETS = new Set([
  "UP_TO_500",
  "FROM_500_TO_1500",
  "FROM_1500_TO_6000",
  "ABOVE_6000",
  "TO_DEFINE",
]);
const CONTACT_METHODS = new Set(["WHATSAPP", "EMAIL"]);

export function normalizeSiteRequestText(value, maxLength = 1000) {
  return String(value || "")
    .replace(/[\u0000\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, maxLength);
}

export function normalizeSiteRequestPhone(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 15);
}

export function isValidSiteRequestPhone(value) {
  const digits = normalizeSiteRequestPhone(value);
  return digits.length >= 10 && digits.length <= 15;
}

export function normalizeSiteRequestEmail(value) {
  return String(value || "").trim().toLowerCase().slice(0, 180);
}

export function isValidSiteRequestEmail(value) {
  const email = normalizeSiteRequestEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function normalizeSiteFeatureList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item || "").toUpperCase()))]
    .filter((item) => SITE_FEATURE_OPTIONS.includes(item))
    .slice(0, 10);
}

export function normalizeSiteRequestPayload(body = {}) {
  const projectType = String(body.projectType || "").toUpperCase();
  const domainStatus = String(body.domainStatus || "").toUpperCase();
  const deadline = String(body.deadline || "").toUpperCase();
  const budgetRange = String(body.budgetRange || "").toUpperCase();
  const preferredContact = String(body.preferredContact || "").toUpperCase();

  return {
    requestId: normalizeSiteRequestText(body.requestId, 36),
    projectType: PROJECT_TYPES.has(projectType) ? projectType : null,
    officeName: normalizeSiteRequestText(body.officeName, 140),
    objective: normalizeSiteRequestText(body.objective, 1600),
    desiredFeatures: normalizeSiteFeatureList(body.desiredFeatures),
    domainStatus: DOMAIN_STATUSES.has(domainStatus) ? domainStatus : null,
    currentDomain: normalizeSiteRequestText(body.currentDomain, 180),
    deadline: DEADLINES.has(deadline) ? deadline : null,
    budgetRange: BUDGETS.has(budgetRange) ? budgetRange : null,
    preferredContact: CONTACT_METHODS.has(preferredContact)
      ? preferredContact
      : null,
    contactPhone: normalizeSiteRequestPhone(body.contactPhone),
    contactEmail: normalizeSiteRequestEmail(body.contactEmail),
    notes: normalizeSiteRequestText(body.notes, 1600),
    consent: body.consent === true,
  };
}

export function validateSiteRequestPayload(payload) {
  const errors = {};

  if (!payload.requestId) errors.requestId = "Identificador inválido.";
  if (!payload.projectType) errors.projectType = "Selecione o tipo de projeto.";
  if (payload.officeName.length < 2) {
    errors.officeName = "Informe o nome profissional ou do escritório.";
  }
  if (payload.objective.length < 20) {
    errors.objective = "Explique o objetivo do projeto com pelo menos 20 caracteres.";
  }
  if (!payload.domainStatus) errors.domainStatus = "Informe a situação do domínio.";
  if (payload.domainStatus === "HAS_DOMAIN" && !payload.currentDomain) {
    errors.currentDomain = "Informe o domínio atual.";
  }
  if (!payload.deadline) errors.deadline = "Selecione um prazo.";
  if (!payload.budgetRange) errors.budgetRange = "Selecione uma faixa de investimento.";
  if (!payload.preferredContact) {
    errors.preferredContact = "Selecione o contato preferencial.";
  }
  if (
    payload.preferredContact === "WHATSAPP" &&
    !isValidSiteRequestPhone(payload.contactPhone)
  ) {
    errors.contactPhone = "Informe um WhatsApp válido com DDD.";
  }
  if (
    payload.preferredContact === "EMAIL" &&
    !isValidSiteRequestEmail(payload.contactEmail)
  ) {
    errors.contactEmail = "Informe um e-mail válido.";
  }
  if (!payload.consent) {
    errors.consent = "Confirme o envio dos dados para análise comercial.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function serializeSiteProject(projectType) {
  const normalizedType = PROJECT_TYPES.has(projectType) ? projectType : "OUTRO";
  const project = SITE_PROJECTS[normalizedType];
  return { projectType: normalizedType, ...project };
}

export function normalizeSalesWhatsAppPhone(value) {
  const digits = normalizeSiteRequestPhone(value);
  if (!isValidSiteRequestPhone(digits)) return null;
  return digits.length <= 11 ? `55${digits}` : digits;
}

export function buildSiteSalesWhatsAppUrl(phone, request) {
  const normalizedPhone = normalizeSalesWhatsAppPhone(phone);
  if (!normalizedPhone) return null;

  const requestProjectType =
    request?.projectType || request?.project_type || "OUTRO";
  const project = SITE_PROJECTS[requestProjectType] || SITE_PROJECTS.OUTRO;
  const reference = String(request?.id || "").slice(0, 8).toUpperCase();
  const message = [
    "Olá, Saulo! Enviei uma solicitação pelo Social Jurídico.",
    `Projeto: ${project.title}.`,
    reference ? `Referência: ${reference}.` : "",
    "Gostaria de conversar sobre os próximos passos.",
  ]
    .filter(Boolean)
    .join(" ");

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}
