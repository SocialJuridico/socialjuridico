import { buildCaseReport, buildUsageItem, normalizePlanType } from "./dashboardUtils";

describe("dashboardUtils", () => {
  test("normaliza o plano", () => {
    expect(normalizePlanType({ plan_type: "FREE", is_premium: true })).toBe("PRO");
    expect(normalizePlanType({ plan_type: "START" })).toBe("START");
  });

  test("calcula limites", () => {
    expect(buildUsageItem("a", "Uso", { used: 5, limit: 20 })).toMatchObject({
      remaining: 15,
      percentage: 25,
      unlimited: false,
    });
    expect(buildUsageItem("b", "Uso", { used: 8, limit: null }).unlimited).toBe(true);
  });

  test("agrupa o relatorio de casos", () => {
    const report = buildCaseReport([
      { practiceArea: "Civil", state: "RS" },
      { practiceArea: "Civil", state: "SP" },
      { practiceArea: "Penal", state: "RS" },
    ], { available: 9, negotiating: 2 });
    expect(report.available).toBe(9);
    expect(report.topAreas[0]).toEqual({ label: "Civil", value: 2 });
    expect(report.topStates[0]).toEqual({ label: "RS", value: 2 });
  });
});
