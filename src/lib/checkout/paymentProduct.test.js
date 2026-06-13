import {
  assertAllowedCheckoutPrice,
  normalizeCheckoutProductContext,
} from "./paymentProduct";

const env = {
  NEXT_PUBLIC_PRICE_JURIS_10: "price_juris_10",
  NEXT_PUBLIC_PRICE_JURIS_20: "price_juris_20",
  NEXT_PUBLIC_PRICE_JURIS_50: "price_juris_50",
  NEXT_PUBLIC_STRIPE_PRICE_START_AVULSO: "price_start_avulso",
  NEXT_PUBLIC_STRIPE_PRICE_PRO_AVULSO: "price_pro_avulso",
};

describe("paymentProduct", () => {
  test("trata price de Juris como compra de Juris mesmo com estado antigo", () => {
    expect(
      normalizeCheckoutProductContext(
        {
          priceId: "price_juris_20",
          planType: "PRO",
          billingCycle: "MONTHLY",
          addOnType: "STORAGE",
        },
        env,
      ),
    ).toEqual({
      paymentType: "JURIS_PURCHASE",
      planType: null,
      billingCycle: "AVULSO",
      addOnType: null,
    });
  });

  test("mantém plano avulso válido", () => {
    expect(
      normalizeCheckoutProductContext(
        {
          priceId: "price_start_avulso",
          planType: "START",
          billingCycle: "AVULSO",
          addOnType: null,
        },
        env,
      ),
    ).toMatchObject({
      paymentType: "PRO_SUBSCRIPTION",
      planType: "START",
    });
  });

  test("rejeita price fora da allowlist do produto", () => {
    expect(() =>
      assertAllowedCheckoutPrice(
        "price_pro_avulso",
        { paymentType: "JURIS_PURCHASE", planType: null },
        env,
      ),
    ).toThrow("Preço não autorizado para este produto.");
  });
});
