import {
  getAiCreditPackage,
  getJurisPackage,
  getLawyerPlan,
  getLawyerPlanPrice,
} from "@/lib/billing/catalog";
import { profileHasPlanHistory } from "@/lib/billing/planEligibility";
import {
  COUPON_TYPES,
  calculateDiscountedAmount,
} from "@/lib/coupons/couponServer";
import { applyRsDiscountCents } from "@/lib/lawyerDiscount";

function recurringRsPrice(baseCents, planType, recurring, isRs) {
  if (!recurring || !isRs) return Number(baseCents || 0);
  return applyRsDiscountCents(baseCents, planType);
}

export function resolveCheckoutProduct({
  planType,
  billingCycle,
  jurisAmount,
  aiCreditsAmount,
  requestedPromo,
  profile,
  isRs,
  coupon,
}) {
  const aiPackage = getAiCreditPackage(aiCreditsAmount);
  if (aiPackage) {
    return {
      type: "AI_CREDITS_PURCHASE",
      referenceType: "AI_CREDITS",
      planType: null,
      billingCycle: "AVULSO",
      jurisAmount: 0,
      aiCreditsAmount: aiPackage.amount,
      expirationDays: 0,
      promo: false,
      recurring: false,
      priceInCents: aiPackage.cents,
      basePriceInCents: aiPackage.cents,
      renewalPriceInCents: null,
      couponType: null,
      couponApplied: false,
      discountSource: null,
      description: `Pacote ${aiPackage.amount} consultas de IA`,
    };
  }

  const jurisPackage = getJurisPackage(jurisAmount);
  if (jurisPackage) {
    const cents = coupon
      ? calculateDiscountedAmount(jurisPackage.cents, coupon)
      : jurisPackage.cents;

    return {
      type: "JURIS_PURCHASE",
      referenceType: "JURIS",
      planType: null,
      billingCycle: "AVULSO",
      jurisAmount: jurisPackage.amount,
      aiCreditsAmount: 0,
      expirationDays: 0,
      promo: false,
      recurring: false,
      priceInCents: cents,
      basePriceInCents: jurisPackage.cents,
      renewalPriceInCents: null,
      couponType: COUPON_TYPES.JURIS,
      couponApplied: Boolean(coupon),
      discountSource: coupon ? "COUPON" : null,
      description: `Pacote ${jurisPackage.amount} Juris`,
    };
  }

  const normalizedPlan = String(planType || "").trim().toUpperCase();
  const normalizedCycle = String(billingCycle || "MONTHLY").trim().toUpperCase();
  const plan = getLawyerPlan(normalizedPlan);
  const price = getLawyerPlanPrice(normalizedPlan, normalizedCycle);

  if (!plan || !price) return null;

  const recurring = Boolean(price.recurring);
  const renewalPriceInCents = recurringRsPrice(
    price.cents,
    normalizedPlan,
    recurring,
    isRs,
  );

  const promo =
    normalizedCycle === "MONTHLY" &&
    Boolean(requestedPromo) &&
    !profileHasPlanHistory(profile);

  // A promoção de primeiro mês é uma condição exclusiva para quem nunca teve
  // START/PRO. No mensal ela já nasce como assinatura: a primeira cobrança usa
  // o valor promocional e, após a aprovação, a recorrência é ajustada para o
  // preço normal (ou OAB/RS) pelo fulfillment.
  if (promo) {
    return {
      type: "PRO_SUBSCRIPTION",
      referenceType: "PLAN",
      planType: normalizedPlan,
      billingCycle: "MONTHLY",
      jurisAmount: plan.juris,
      aiCreditsAmount: 0,
      expirationDays: price.days,
      promo: true,
      recurring: true,
      priceInCents: plan.promoCents,
      basePriceInCents: price.cents,
      renewalPriceInCents,
      couponType: COUPON_TYPES.PLAN,
      couponApplied: false,
      discountSource: "PROMO",
      description: `Plano ${normalizedPlan} promocional - primeiro mês`,
    };
  }

  const baseCents = price.cents;
  const rsEligible = recurring && Boolean(isRs);
  const rsCents = rsEligible
    ? applyRsDiscountCents(baseCents, normalizedPlan)
    : baseCents;
  const couponCents = coupon
    ? calculateDiscountedAmount(baseCents, coupon)
    : baseCents;

  let cents = baseCents;
  let discountSource = null;
  let couponApplied = false;

  if (coupon) {
    // Cupom e OAB/RS não acumulam. Na primeira cobrança o usuário sempre recebe
    // a melhor condição. Se OAB/RS já for melhor, o cupom não é consumido.
    if (rsEligible && rsCents <= couponCents) {
      cents = rsCents;
      discountSource = "OAB_RS";
    } else {
      cents = couponCents;
      discountSource = "COUPON";
      couponApplied = true;
    }
  } else if (rsEligible) {
    cents = rsCents;
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
    aiCreditsAmount: 0,
    expirationDays: price.days,
    promo: false,
    recurring,
    priceInCents: cents,
    basePriceInCents: baseCents,
    renewalPriceInCents: recurring ? renewalPriceInCents : null,
    couponType: COUPON_TYPES.PLAN,
    couponApplied,
    discountSource,
    description: `Plano ${normalizedPlan} ${cycleLabel}`,
  };
}
