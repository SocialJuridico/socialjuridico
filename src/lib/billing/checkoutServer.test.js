import { resolveCheckoutProduct } from "./checkoutServer";

test.each([
  ["START", "MONTHLY", 4099, 3689],
  ["PRO", "MONTHLY", 15000, 12750],
  ["START", "AVULSO", 4990, 4491],
  ["PRO", "AVULSO", 21000, 17850],
  ["START", "ANNUAL", 43188, 38869],
  ["PRO", "ANNUAL", 144000, 122400],
])("%s %s charges the approved catalog and OAB/RS amounts", (planType, billingCycle, regular, discounted) => {
  const args = { planType, billingCycle, profile: {}, requestedPromo: false };
  expect(resolveCheckoutProduct({ ...args, isRs: false }).priceInCents).toBe(regular);
  const product = resolveCheckoutProduct({ ...args, isRs: true });
  expect(product.priceInCents).toBe(discounted);
  expect(product.discountSource).toBe("OAB_RS");
  expect(product.renewalPriceInCents).toBe(billingCycle === "AVULSO" ? null : discounted);
});

test.each([[10, 990], [20, 1690], [50, 3990]])("%i Juris keeps its own price without a plan discount", (jurisAmount, cents) => {
  const product = resolveCheckoutProduct({ jurisAmount, isRs: true });
  expect(product.priceInCents).toBe(cents);
  expect(product.recurring).toBe(false);
});
