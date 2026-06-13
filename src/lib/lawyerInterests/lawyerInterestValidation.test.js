import {
  buildInterestSummary,
  canCancelInterest,
  canOpenNegotiation,
  normalizeInterestStatus,
  resolveInterestStatusList,
} from "./lawyerInterestValidation";

describe("lawyerInterestValidation", () => {
  it("normaliza filtros de status conhecidos", () => {
    expect(normalizeInterestStatus("pending")).toBe("PENDING");
    expect(normalizeInterestStatus("NEGOTIATING")).toBe("NEGOTIATING");
    expect(normalizeInterestStatus("invalido")).toBe("ACTIVE");
  });

  it("resolve a lista de status para filtros ativos e historicos", () => {
    expect(resolveInterestStatusList("ACTIVE")).toEqual(["PENDING", "NEGOTIATING"]);
    expect(resolveInterestStatusList("ALL")).toEqual([
      "PENDING",
      "NEGOTIATING",
      "HIRED",
      "DECLINED",
    ]);
    expect(resolveInterestStatusList("HIRED")).toEqual(["HIRED"]);
  });

  it("resume interesses por status", () => {
    expect(
      buildInterestSummary([
        { status: "PENDING" },
        { status: "NEGOTIATING" },
        { status: "HIRED" },
        { status: "DECLINED" },
        { status: "PENDING" },
      ]),
    ).toEqual({
      total: 5,
      active: 3,
      pending: 2,
      negotiating: 1,
      hired: 1,
      declined: 1,
    });
  });

  it("restringe cancelamento e abertura de negociacao por status", () => {
    expect(canCancelInterest("PENDING")).toBe(true);
    expect(canCancelInterest("NEGOTIATING")).toBe(false);
    expect(canOpenNegotiation("NEGOTIATING")).toBe(true);
    expect(canOpenNegotiation("PENDING")).toBe(false);
  });
});
