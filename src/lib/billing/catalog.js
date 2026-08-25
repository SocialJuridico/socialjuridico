export const JURIS_PACKAGES = Object.freeze({
  10: { amount: 10, cents: 990 },
  20: { amount: 20, cents: 1690 },
  50: { amount: 50, cents: 3990 },
});

export const AI_CREDIT_PACKAGES = Object.freeze({
  10: { amount: 10, cents: 1000 },
  20: { amount: 20, cents: 1850 },
  50: { amount: 50, cents: 4500 },
});

export const LAWYER_PLAN_PRICING = Object.freeze({
  START: {
    id: "START",
    juris: 7,
    promoCents: 1099,
    prices: {
      AVULSO: { cents: 4990, days: 30, recurring: false },
      MONTHLY: { cents: 4099, days: 30, recurring: true },
      ANNUAL: { cents: 43188, days: 365, recurring: true },
    },
  },
  PRO: {
    id: "PRO",
    juris: 20,
    promoCents: 3999,
    prices: {
      AVULSO: { cents: 21000, days: 30, recurring: false },
      MONTHLY: { cents: 15000, days: 30, recurring: true },
      ANNUAL: { cents: 144000, days: 365, recurring: true },
    },
  },
});

export function getJurisPackage(amount) {
  return JURIS_PACKAGES[Number(amount)] || null;
}

export function getAiCreditPackage(amount) {
  return AI_CREDIT_PACKAGES[Number(amount)] || null;
}

export function getLawyerPlan(planType) {
  return LAWYER_PLAN_PRICING[String(planType || "").trim().toUpperCase()] || null;
}

export function getLawyerPlanPrice(planType, billingCycle) {
  const plan = getLawyerPlan(planType);
  if (!plan) return null;
  return plan.prices[String(billingCycle || "").trim().toUpperCase()] || null;
}

export function centsToBRL(cents) {
  return Number(cents || 0) / 100;
}

export function subscriptionFrequencyFor(billingCycle) {
  const cycle = String(billingCycle || "").toUpperCase();
  if (cycle === "MONTHLY") return { frequency: 1, frequency_type: "months" };
  if (cycle === "ANNUAL") return { frequency: 12, frequency_type: "months" };
  return null;
}
