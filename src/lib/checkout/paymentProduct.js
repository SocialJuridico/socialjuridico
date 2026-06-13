function compactSet(values) {
  return new Set(values.filter(Boolean));
}

export function buildCheckoutPriceCatalog(env = process.env) {
  return {
    jurisPrices: compactSet([
      env.PRICE_JURIS_10,
      env.PRICE_JURIS_20,
      env.PRICE_JURIS_50,
      env.NEXT_PUBLIC_PRICE_JURIS_10,
      env.NEXT_PUBLIC_PRICE_JURIS_20,
      env.NEXT_PUBLIC_PRICE_JURIS_50,
    ]),
    startAvulsoPrices: compactSet([
      env.STRIPE_PRICE_START_AVULSO,
      env.NEXT_PUBLIC_STRIPE_PRICE_START_AVULSO,
    ]),
    proAvulsoPrices: compactSet([
      env.STRIPE_PRICE_PRO_AVULSO,
      env.NEXT_PUBLIC_STRIPE_PRICE_PRO_AVULSO,
    ]),
  };
}

export function resolveCheckoutPaymentType(
  priceId,
  { planType, addOnType } = {},
  env = process.env,
) {
  const { jurisPrices } = buildCheckoutPriceCatalog(env);

  // O priceId validado pelo servidor é a fonte de verdade. Isso impede que
  // valores antigos do localStorage transformem uma compra de Juris em plano.
  if (jurisPrices.has(priceId)) return "JURIS_PURCHASE";
  if (addOnType) return "ADDON_PURCHASE";
  if (planType) return "PRO_SUBSCRIPTION";
  return "JURIS_PURCHASE";
}

export function normalizeCheckoutProductContext(
  { priceId, planType, billingCycle, addOnType },
  env = process.env,
) {
  const paymentType = resolveCheckoutPaymentType(
    priceId,
    { planType, addOnType },
    env,
  );

  if (paymentType === "JURIS_PURCHASE") {
    return {
      paymentType,
      planType: null,
      billingCycle: "AVULSO",
      addOnType: null,
    };
  }

  if (paymentType === "ADDON_PURCHASE") {
    return {
      paymentType,
      planType: null,
      billingCycle: "AVULSO",
      addOnType,
    };
  }

  return {
    paymentType,
    planType,
    billingCycle,
    addOnType: null,
  };
}

export function assertAllowedCheckoutPrice(
  priceId,
  { paymentType, planType },
  env = process.env,
) {
  const { jurisPrices, startAvulsoPrices, proAvulsoPrices } =
    buildCheckoutPriceCatalog(env);

  let allowed = null;
  if (paymentType === "JURIS_PURCHASE") allowed = jurisPrices;
  if (paymentType === "PRO_SUBSCRIPTION") {
    allowed = planType === "START" ? startAvulsoPrices : proAvulsoPrices;
  }

  if (allowed && (!allowed.size || !allowed.has(priceId))) {
    const error = new Error("Preço não autorizado para este produto.");
    error.status = 400;
    throw error;
  }
}
