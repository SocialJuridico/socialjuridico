export const EMPTY_SUMMARY = {
  totalReferrals: 0,
  uniqueAffiliates: 0,
  commissionedCount: 0,
  eligibleCount: 0,
  reviewCount: 0,
  alertCount: 0,
  creditedJuris: 0,
  lawyerLeads: 0,
  conversionRate: 0,
  byEligibility: {},
};

export const ELIGIBILITY_LABELS = {
  COMMISSIONED: "Comissionada",
  ELIGIBLE: "Elegível",
  REVIEW: "Revisão necessária",
  WAITING_PAYMENT: "Aguardando assinatura",
  WAITING_REGISTRATION: "Cadastro não localizado",
  CLIENT_LEAD: "Indicação de cliente",
  INVALID: "Inválida",
};

export const PROVIDER_LABELS = {
  STRIPE_CHECKOUT: "Stripe Checkout",
  STRIPE_PAYMENT_INTENT: "Stripe PaymentIntent",
  INFINITEPAY: "InfinitePay",
  MANUAL: "Operação manual",
  UNKNOWN: "Origem não identificada",
};

export const REVIEW_STATUS_LABELS = {
  PENDING: "Pendente",
  REVIEW: "Em revisão",
  CLEARED: "Revisada",
  INVALID: "Inválida",
};

export const RISK_LABELS = {
  STANDARD: "Padrão",
  ELEVATED: "Elevado",
  RESTRICTED: "Restrito",
};

export function formatDate(value) {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return "Data indisponível";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function formatCurrency(value, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency || "BRL",
  }).format(Number(value || 0));
}
