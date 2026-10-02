import { getLawyerPlan, getLawyerPlanPrice } from "./catalog";

// Promoção "Quer Investir Quanto?": o advogado escolhe quanto pagar via Pix por
// 30 dias de PRO. Vale para o 1º mês e para uma renovação avulsa; no 3º mês
// em diante o plano volta ao preço cheio.
export const PROMO_INVEST_TYPE = "PROMO_INVEST";
export const PROMO_INVEST_NAME = "Quer Investir Quanto?";
export const PROMO_INVEST_MAX_PURCHASES = 2;
export const PROMO_INVEST_MIN_CENTS = 100;
// Teto no preço cheio do PRO avulso: acima disso a promoção não faz sentido.
export const PROMO_INVEST_MAX_CENTS = getLawyerPlanPrice("PRO", "AVULSO").cents;

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
