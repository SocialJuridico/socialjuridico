export function checkoutError(message, status = 422) {
  return Object.assign(new Error(message), { status });
}
export const checkoutReference = (id) => `sjh_${id}`;
export function checkoutIdFromReference(value) {
  const match = /^sjh_([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i.exec(String(value || ""));
  return match?.[1] || null;
}
export function configuredStripePrice(product, env = process.env) {
  if (product.type === "JURIS_PURCHASE") return env[`NEXT_PUBLIC_PRICE_JURIS_${product.jurisAmount}`];
  if (product.planType === "PRO" && product.billingCycle === "MONTHLY") return env.NEXT_PUBLIC_PRICE_PRO_MONTHLY;
  return null;
}
export function stripeLineItem(product, configuredPrice = null) {
  const amount = product.recurring ? product.renewalPriceInCents : product.priceInCents;
  if (!Number.isSafeInteger(amount) || amount < 50) throw checkoutError("Valor inválido.");
  if (configuredPrice && (!configuredPrice.active || configuredPrice.currency !== "brl")) {
    throw checkoutError("Preço Stripe indisponível ou em moeda diferente de BRL.", 503);
  }
  const interval = product.billingCycle === "ANNUAL" ? "year" : "month";
  const matchingCycle = product.recurring
    ? configuredPrice?.recurring?.interval === interval && configuredPrice.recurring.interval_count === 1
    : !configuredPrice?.recurring;
  if (configuredPrice?.unit_amount === amount && matchingCycle) return { price: configuredPrice.id, quantity: 1 };
  // The server catalog is authoritative, including negotiated recurring prices.
  return { quantity: 1, price_data: {
    currency: "brl", unit_amount: amount,
    ...(configuredPrice?.product
      ? { product: typeof configuredPrice.product === "string" ? configuredPrice.product : configuredPrice.product.id }
      : { product_data: { name: product.description } }),
    ...(product.recurring ? { recurring: { interval } } : {}),
  } };
}
export function initialDiscount(product) {
  if (!product.recurring) return 0;
  const delta = product.renewalPriceInCents - product.priceInCents;
  if (delta < 0) throw checkoutError("A primeira cobrança excede o valor de renovação.");
  return delta;
}
