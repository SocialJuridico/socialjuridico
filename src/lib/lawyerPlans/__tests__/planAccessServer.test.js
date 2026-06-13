import {
  assertLawyerPlanPurchaseAllowed,
  getActiveLawyerPlanFromProfile,
  normalizeLawyerPlanType,
} from "../planAccessServer";

describe("planAccessServer", () => {
  test("normaliza somente planos comerciais conhecidos", () => {
    expect(normalizeLawyerPlanType("start")).toBe("START");
    expect(normalizeLawyerPlanType("PRO")).toBe("PRO");
    expect(normalizeLawyerPlanType("enterprise")).toBeNull();
  });

  test("ignora plano com assinatura bloqueada", () => {
    expect(
      getActiveLawyerPlanFromProfile({
        plan_type: "PRO",
        subscription_status: "unpaid",
      }),
    ).toBeNull();
  });

  test("permite contratação para usuário sem plano ativo", () => {
    expect(
      assertLawyerPlanPurchaseAllowed({ plan_type: "FREE" }, "START"),
    ).toMatchObject({ activePlan: null, targetPlan: "START", isUpgrade: false });
  });

  test("permite apenas upgrade START para PRO", () => {
    expect(
      assertLawyerPlanPurchaseAllowed(
        { plan_type: "START", subscription_status: "active" },
        "PRO",
      ),
    ).toMatchObject({ activePlan: "START", targetPlan: "PRO", isUpgrade: true });
  });

  test("bloqueia compra duplicada do plano ativo", () => {
    expect(() =>
      assertLawyerPlanPurchaseAllowed(
        { plan_type: "START", subscription_status: "active" },
        "START",
      ),
    ).toThrow("Este plano já está ativo");
  });

  test("bloqueia downgrade PRO para START", () => {
    expect(() =>
      assertLawyerPlanPurchaseAllowed(
        { plan_type: "PRO", subscription_status: "active" },
        "START",
      ),
    ).toThrow("A redução de plano");
  });
});
