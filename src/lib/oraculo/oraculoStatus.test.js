import { computeOraculoStatus, ORACULO_STATUS } from "./oraculoStatus";

describe("computeOraculoStatus", () => {
  test("no admin decision and no supervisor -> PENDENTE_DOCUMENTOS", () => {
    expect(
      computeOraculoStatus({ adminDecision: null, supervisorApproved: false }),
    ).toBe(ORACULO_STATUS.PENDENTE_DOCUMENTOS);
  });

  test("admin approved, no supervisor yet -> PENDENTE_SUPERVISOR", () => {
    expect(
      computeOraculoStatus({
        adminDecision: "APROVADO",
        supervisorApproved: false,
      }),
    ).toBe(ORACULO_STATUS.PENDENTE_SUPERVISOR);
  });

  test("supervisor approved, no admin decision yet -> PENDENTE_ADMIN", () => {
    expect(
      computeOraculoStatus({ adminDecision: null, supervisorApproved: true }),
    ).toBe(ORACULO_STATUS.PENDENTE_ADMIN);
  });

  test("admin approved and supervisor approved -> ATIVO", () => {
    expect(
      computeOraculoStatus({
        adminDecision: "APROVADO",
        supervisorApproved: true,
      }),
    ).toBe(ORACULO_STATUS.ATIVO);
  });

  test("REPROVADO/SUSPENSO override supervisor approval", () => {
    expect(
      computeOraculoStatus({
        adminDecision: "REPROVADO",
        supervisorApproved: true,
      }),
    ).toBe(ORACULO_STATUS.REPROVADO);

    expect(
      computeOraculoStatus({
        adminDecision: "SUSPENSO",
        supervisorApproved: true,
      }),
    ).toBe(ORACULO_STATUS.SUSPENSO);
  });
});
