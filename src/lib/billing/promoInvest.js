import { getLawyerPlan, getLawyerPlanPrice } from "./catalog";

// Promoção "Quer Investir Quanto?": o advogado escolhe quanto pagar via Pix por
// 30 dias de PRO. Vale por até 3 meses (compras avulsas); do 4º mês em diante
// o plano volta ao preço cheio.
export const PROMO_INVEST_TYPE = "PROMO_INVEST";
export const PROMO_INVEST_NAME = "Quer Investir Quanto?";
export const PROMO_INVEST_MAX_PURCHASES = 3;
// Valor livre: de R$ 0,01 a R$ 10.000.000.000,00 (em centavos).
export const PROMO_INVEST_MIN_CENTS = 1;
export const PROMO_INVEST_MAX_CENTS = 1_000_000_000_000;

// Desliga a promoção com PROMO_QUER_INVESTIR_QUANTO_ENABLED=false (servidor).
export function promoInvestEnabled(env = process.env) {
  return String(env.PROMO_QUER_INVESTIR_QUANTO_ENABLED ?? "true").toLowerCase() !== "false";
}

export function parsePromoInvestCents(value) {
  const normalized = typeof value === "string"
    ? value.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")
    : value;
  const cents = Math.round(Number(normalized) * 100);
  if (!Number.isSafeInteger(cents)) return null;
  if (cents < PROMO_INVEST_MIN_CENTS || cents > PROMO_INVEST_MAX_CENTS) return null;
  return cents;
}

export function buildPromoInvestProduct(priceInCents, purchaseNumber) {
  const plan = getLawyerPlan("PRO");
  const price = getLawyerPlanPrice("PRO", "AVULSO");
  return {
    type: PROMO_INVEST_TYPE,
    referenceType: "PLAN",
    planType: "PRO",
    billingCycle: "AVULSO",
    jurisAmount: plan.juris,
    aiCreditsAmount: 0,
    expirationDays: price.days,
    promo: true,
    campaign: "QUER_INVESTIR_QUANTO",
    purchaseNumber,
    recurring: false,
    priceInCents,
    basePriceInCents: price.cents,
    renewalPriceInCents: null,
    couponType: null,
    couponApplied: false,
    discountSource: "PROMO_INVEST",
    description: `${PROMO_INVEST_NAME} - Plano PRO ${purchaseNumber}º mês`,
  };
}

// A promoção é para quem está sem plano. Considera a data de validade porque o
// cron que rebaixa planos vencidos para FREE pode ainda não ter rodado.
export function hasActiveLawyerPlan(profile, now = Date.now()) {
  const plan = String(profile?.plan_type || "").toUpperCase();
  const paid = profile?.is_premium === true || ["START", "PRO"].includes(plan) || plan.startsWith("ENTERPRISE_");
  if (!paid) return false;
  const expiresAt = Date.parse(profile?.premium_expires_at || "");
  return !(Number.isFinite(expiresAt) && expiresAt <= now);
}
