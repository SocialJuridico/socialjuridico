import { profileHasPlanHistory } from "@/lib/billing/planEligibility";

export const BILLING_CYCLES = [
  { id: "AVULSO", label: "Avulso" },
  { id: "MONTHLY", label: "Mensal" },
  { id: "ANNUAL", label: "Anual" },
];

const BLOCKED_SUBSCRIPTION_STATUSES = new Set([
  "CANCELED",
  "CANCELLED",
  "UNPAID",
  "BLOCKED",
]);

export const LAWYER_PLANS = {
  START: {
    id: "START",
    name: "START",
    tag: "Essencial",
    description: "Para advogados autônomos e profissionais em crescimento.",
    juris: 7,
    accent: "blue",
    features: [
      { text: "CRM para até 10 clientes", included: true },
      { text: "500 MB para documentos", included: true },
      { text: "20 minutas por mês no Redator IA", included: true },
      { text: "30 registros mensais na agenda", included: true },
      { text: "10 diagnósticos mensais na Triagem IA", included: true },
      { text: "Calculadoras jurídicas", included: false },
      { text: "Análise de jurisprudência", included: false },
    ],
    prices: {
      AVULSO: { value: 49.9 },
      MONTHLY: { value: 40.99 },
      ANNUAL: { value: 431.88, monthly: 35.99 },
    },
  },
  PRO: {
    id: "PRO",
    name: "PRO",
    tag: "Profissional",
    description: "Recursos avançados para uma operação jurídica completa.",
    juris: 20,
    accent: "gold",
    recommended: true,
    features: [
      { text: "CRM com clientes ilimitados", included: true },
      { text: "10 GB para documentos", included: true },
      { text: "200 minutas por mês no Redator IA", included: true },
      { text: "Agenda ilimitada", included: true },
      { text: "200 diagnósticos mensais na Triagem IA", included: true },
      { text: "Calculadoras ilimitadas", included: true },
      { text: "Jurisprudência ilimitada", included: true },
      { text: "Baixar até 20 processos", included: true },
      { text: "Monitoramento de até 10 processos", included: true },
      { text: "Monitoramento de Diário Oficial", included: true },
      { text: "Cadastramento automático de partes no CRM", included: true },
    ],
    prices: {
      AVULSO: { value: 210.0 },
      MONTHLY: { value: 150.0 },
      ANNUAL: { value: 1440.0, monthly: 120.0 },
    },
  },
};

export function getActiveLawyerPlan(profile) {
  const planType = String(profile?.plan_type || "FREE").toUpperCase();
  const subscriptionStatus = String(
    profile?.subscription_status || "",
  ).toUpperCase();

  if (!new Set(["START", "PRO"]).has(planType)) return null;
  if (BLOCKED_SUBSCRIPTION_STATUSES.has(subscriptionStatus)) return null;
  return planType;
}

export function isIntroPromotionEligible(planId, billingCycle, profile) {
  const normalizedPlan = String(planId || "").trim().toUpperCase();
  if (!["START", "PRO"].includes(normalizedPlan)) return false;
  if (String(billingCycle || "").toUpperCase() !== "MONTHLY") return false;

  // Regra comercial: a promoção existe apenas para quem NUNCA teve START nem
  // PRO. Se o advogado já teve qualquer um dos planos, as duas promoções ficam
  // indisponíveis — inclusive em upgrade START -> PRO.
  return !profileHasPlanHistory(profile);
}

export function getIntroPromotionCoupon(planId) {
  if (planId === "START") {
    return {
      status: "preview",
      id: null,
      code: "START_MES1_1099",
      percent_off: 0,
      amount_off: 3000,
      promotional: true,
    };
  }

  if (planId === "PRO") {
    return {
      status: "preview",
      id: null,
      code: "PRO_MES1_3999",
      percent_off: 0,
      amount_off: 11001,
      promotional: true,
    };
  }

  return null;
}

export function calculateAnnualSavings(plan) {
  const monthlyValue = Number(plan?.prices?.MONTHLY?.value || 0);
  const annualValue = Number(plan?.prices?.ANNUAL?.value || 0);
  if (!monthlyValue || !annualValue) return 0;

  return Math.max(
    0,
    Math.round((1 - annualValue / (monthlyValue * 12)) * 100),
  );
}

export function applyCouponToPrice(priceInfo, billingCycle, coupon) {
  const rawTotal = Number(priceInfo?.value || 0);
  let total = rawTotal;

  if (coupon?.percent_off) {
    total = rawTotal * (1 - Number(coupon.percent_off) / 100);
  } else if (coupon?.amount_off) {
    total = Math.max(0, rawTotal - Number(coupon.amount_off) / 100);
  }

  const display = billingCycle === "ANNUAL" ? total / 12 : total;

  return {
    rawTotal,
    total,
    display,
  };
}

export function formatBRL(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}
