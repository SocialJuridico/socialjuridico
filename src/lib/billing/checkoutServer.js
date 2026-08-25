import {
  getJurisPackage,
  getLawyerPlan,
  getLawyerPlanPrice,
} from "@/lib/billing/catalog";
import {
  COUPON_TYPES,
  calculateDiscountedAmount,
} from "@/lib/coupons/couponServer";
import { applyRsDiscountCents } from "@/lib/lawyerDiscount";

export function promoAlreadyUsed(profile, planType) {
  return String(planType || "").toUpperCase() === "PRO"
    ? Boolean(profile?.promo_pro_used)
    : Boolean(profile?.promo_start_used);
}

export function resolveCheckoutProduct({
  planType,
  billingCycle,
  jurisAmount,
  requestedPromo,
  profile,
  isRs,
  coupon,
}) {
  const jurisPackage = getJurisPackage(jurisAmount);

  if (jurisPackage) {
    let cents = jurisPackage.cents;
    if (coupon) cents = calculateDiscountedAmount(cents, coupon);

    return {
      type: "JURIS_PURCHASE",
      referenceType: "JURIS",
      planType: null,
      billingCycle: "AVULSO",
      jurisAmount: jurisPackage.amount,
      expirationDays: 0,
      promo: false,
      recurring: false,
      priceInCents: cents,
      basePriceInCents: jurisPackage.cents,
      couponType: COUPON_TYPES.JURIS,
      description: `Pacote ${jurisPackage.amount} Juris`,
    };
  }

  const normalizedPlan = String(planType || "").trim().toUpperCase();
  const normalizedCycle = String(billingCycle || "MONTHLY").trim().toUpperCase();
  const plan = getLawyerPlan(normalizedPlan);
  const price = getLawyerPlanPrice(normalizedPlan, normalizedCycle);

  if (!plan || !price) return null;

  const promo =
    normalizedCycle === "MONTHLY" &&
    Boolean(requestedPromo) &&
    !promoAlreadyUsed(profile, normalizedPlan);

  if (promo) {
    return {
      type: "PRO_SUBSCRIPTION",
      referenceType: "PLAN",
      planType: normalizedPlan,
      billingCycle: "MONTHLY",
      jurisAmount: plan.juris,
      expirationDays: price.days,
      promo: true,
      recurring: false,
      priceInCents: plan.promoCents,
      basePriceInCents: price.cents,
      couponType: COUPON_TYPES.PLAN,
      description: `Plano ${normalizedPlan} promocional - 30 dias`,
    };
  }

  let cents = price.cents;
  let discountSource = null;

  // Mantém a regra comercial anterior: cupom de plano só afeta compra avulsa.
  // Assinaturas recorrentes usam o preço recorrente, com desconto OAB/RS quando
  // elegível, evitando transformar um cupom de uso único em desconto eterno.
  if (coupon && normalizedCycle === "AVULSO") {
    cents = calculateDiscountedAmount(cents, coupon);
    discountSource = "COUPON";
  } else if (isRs) {
    cents = applyRsDiscountCents(cents, normalizedPlan);
    discountSource = "OAB_RS";
  }

  const cycleLabel =
    normalizedCycle === "ANNUAL"
      ? "anual"
      : normalizedCycle === "AVULSO"
        ? "avulso - 30 dias"
        : "mensal";

  return {
    type: "PRO_SUBSCRIPTION",
    referenceType: "PLAN",
    planType: normalizedPlan,
    billingCycle: normalizedCycle,
    jurisAmount: plan.juris,
    expirationDays: price.days,
    promo: false,
    recurring: Boolean(price.recurring),
    priceInCents: cents,
    basePriceInCents: price.cents,
    couponType: COUPON_TYPES.PLAN,
    discountSource,
    description: `Plano ${normalizedPlan} ${cycleLabel}`,
  };
}
