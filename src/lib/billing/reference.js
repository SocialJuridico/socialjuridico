import { randomUUID } from "node:crypto";
import { getJurisPackage, getLawyerPlan, getLawyerPlanPrice } from "@/lib/billing/catalog";

function codeFromProduct(product) {
  if (product?.type === "JURIS_PURCHASE") {
    return `J${Number(product.jurisAmount || 0)}`;
  }

  const plan = String(product?.planType || "").toUpperCase();
  const cycle = String(product?.billingCycle || "").toUpperCase();

  if (product?.promo && cycle === "MONTHLY") {
    return plan === "PRO" ? "PPM" : "SPM";
  }

  const prefix = plan === "PRO" ? "P" : "S";
  if (cycle === "AVULSO") return `${prefix}AV`;
  if (cycle === "ANNUAL") return `${prefix}AN`;
  return `${prefix}MO`;
}

function productFromCode(code) {
  const normalized = String(code || "").toUpperCase();

  if (/^J(10|20|50)$/.test(normalized)) {
    const amount = Number(normalized.slice(1));
    const pack = getJurisPackage(amount);
    if (!pack) return null;
    return {
      type: "JURIS_PURCHASE",
      referenceType: "JURIS",
      planType: null,
      billingCycle: "AVULSO",
      jurisAmount: amount,
      expirationDays: 0,
      promo: false,
      recurring: false,
    };
  }

  const promo = normalized === "SPM" || normalized === "PPM";
  const planType = normalized.startsWith("P") ? "PRO" : "START";
  const billingCycle = promo
    ? "MONTHLY"
    : normalized.endsWith("AV")
      ? "AVULSO"
      : normalized.endsWith("AN")
        ? "ANNUAL"
        : "MONTHLY";

  const plan = getLawyerPlan(planType);
  const price = getLawyerPlanPrice(planType, billingCycle);
  if (!plan || !price) return null;

  return {
    type: "PRO_SUBSCRIPTION",
    referenceType: "PLAN",
    planType,
    billingCycle,
    jurisAmount: plan.juris,
    expirationDays: price.days,
    promo,
    recurring: Boolean(price.recurring) && !promo,
  };
}

export function encodeBillingReference(product) {
  const token = randomUUID().replace(/-/g, "");
  return `sjm_${token}_${codeFromProduct(product)}`;
}

export function decodeBillingReference(reference) {
  const value = String(reference || "").trim();
  const match = value.match(/^sjm_([0-9a-f]{32})_([A-Z0-9]{2,4})$/i);
  if (!match) return { token: null, product: null };

  return {
    token: match[1],
    product: productFromCode(match[2]),
  };
}
