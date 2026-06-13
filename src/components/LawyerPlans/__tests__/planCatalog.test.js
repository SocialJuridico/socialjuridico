import {
  applyCouponToPrice,
  calculateAnnualSavings,
  getActiveLawyerPlan,
  getIntroPromotionCoupon,
  isIntroPromotionEligible,
} from "../planCatalog";

describe("Lawyer plan catalog", () => {
  test("identifica plano ativo e ignora assinaturas bloqueadas", () => {
    expect(getActiveLawyerPlan({ plan_type: "START" })).toBe("START");
    expect(
      getActiveLawyerPlan({
        plan_type: "PRO",
        subscription_status: "canceled",
      }),
    ).toBeNull();
    expect(getActiveLawyerPlan({ plan_type: "FREE" })).toBeNull();
  });

  test("libera promoção mensal para usuário FREE", () => {
    expect(isIntroPromotionEligible("START", "MONTHLY", null)).toBe(true);
    expect(isIntroPromotionEligible("PRO", "MONTHLY", null)).toBe(true);
    expect(isIntroPromotionEligible("START", "ANNUAL", null)).toBe(false);
  });

  test("oferece somente upgrade PRO para assinante START ativo", () => {
    const profile = { plan_type: "START", subscription_status: "active" };

    expect(isIntroPromotionEligible("START", "MONTHLY", profile)).toBe(false);
    expect(isIntroPromotionEligible("PRO", "MONTHLY", profile)).toBe(true);
  });

  test("não oferece promoção introdutória para assinante PRO ativo", () => {
    const profile = { plan_type: "PRO", subscription_status: "active" };

    expect(isIntroPromotionEligible("START", "MONTHLY", profile)).toBe(false);
    expect(isIntroPromotionEligible("PRO", "MONTHLY", profile)).toBe(false);
  });

  test("calcula desconto percentual e fixo sem valores negativos", () => {
    expect(
      applyCouponToPrice(
        { value: 100 },
        "MONTHLY",
        { percent_off: 20 },
      ).total,
    ).toBe(80);

    expect(
      applyCouponToPrice(
        { value: 20 },
        "MONTHLY",
        { amount_off: 5000 },
      ).total,
    ).toBe(0);
  });

  test("rateia o valor anual para apresentação mensal", () => {
    const result = applyCouponToPrice(
      { value: 1200 },
      "ANNUAL",
      { percent_off: 10 },
    );

    expect(result.total).toBe(1080);
    expect(result.display).toBe(90);
  });

  test("calcula a economia anual pelos valores reais", () => {
    expect(
      calculateAnnualSavings({
        prices: {
          MONTHLY: { value: 100 },
          ANNUAL: { value: 900 },
        },
      }),
    ).toBe(25);
  });

  test("mantém apenas a prévia dos códigos promocionais no cliente", () => {
    expect(getIntroPromotionCoupon("START")).toMatchObject({
      id: null,
      code: "START_MES1_1099",
      status: "preview",
    });
    expect(getIntroPromotionCoupon("PRO")).toMatchObject({
      id: null,
      code: "PRO_MES1_1099",
      status: "preview",
    });
  });
});
