import { getCrmAiCapturePolicy } from "./crmAiCapturePolicy";

function access({
  planType,
  balance = 0,
  used = 0,
  period = new Date().toISOString().slice(0, 7),
}) {
  return {
    planType,
    profile: {
      balance,
      uso_crm_ia: used,
      crm_ia_periodo: `${period}-01`,
    },
  };
}

describe("Política de captura inteligente do CRM", () => {
  test("START possui 10 usos mensais e custo de 3 Juris", () => {
    expect(
      getCrmAiCapturePolicy(
        access({ planType: "START", balance: 12, used: 4 }),
      ),
    ).toEqual(
      expect.objectContaining({
        planType: "START",
        used: 4,
        limit: 10,
        remaining: 6,
        jurisCost: 3,
        balance: 12,
        canUse: true,
      }),
    );
  });

  test("START é bloqueado quando não possui 3 Juris", () => {
    expect(
      getCrmAiCapturePolicy(
        access({ planType: "START", balance: 2, used: 1 }),
      ),
    ).toEqual(
      expect.objectContaining({
        insufficientJuris: true,
        canUse: false,
      }),
    );
  });

  test("START é bloqueado ao atingir o limite mensal", () => {
    expect(
      getCrmAiCapturePolicy(
        access({ planType: "START", balance: 50, used: 10 }),
      ),
    ).toEqual(
      expect.objectContaining({
        remaining: 0,
        limitReached: true,
        canUse: false,
      }),
    );
  });

  test("contador de período anterior é tratado como zero", () => {
    expect(
      getCrmAiCapturePolicy(
        access({
          planType: "START",
          balance: 3,
          used: 10,
          period: "2020-01",
        }),
      ),
    ).toEqual(
      expect.objectContaining({
        used: 0,
        remaining: 10,
        canUse: true,
      }),
    );
  });

  test("PRO possui 200 usos mensais e não consome Juris", () => {
    expect(
      getCrmAiCapturePolicy(
        access({ planType: "PRO", balance: 0, used: 37 }),
      ),
    ).toEqual(
      expect.objectContaining({
        planType: "PRO",
        used: 37,
        limit: 200,
        remaining: 163,
        jurisCost: 0,
        insufficientJuris: false,
        canUse: true,
      }),
    );
  });
});
