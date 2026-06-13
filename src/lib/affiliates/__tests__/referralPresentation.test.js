import {
  classifyReferralForLawyer,
  maskAffiliateEmail,
  normalizeAffiliateEmail,
  summarizeLawyerReferrals,
} from "../referralPresentation";

describe("referralPresentation", () => {
  test("normaliza e mascara e-mails antes de expor o histórico", () => {
    expect(normalizeAffiliateEmail("  Saulo@Example.com  ")).toBe(
      "saulo@example.com",
    );
    expect(maskAffiliateEmail("saulo@example.com")).toBe(
      "sa***@e******.com",
    );
    expect(maskAffiliateEmail("invalido")).toBe("Não informado");
  });

  test("prioriza comissão já creditada", () => {
    const result = classifyReferralForLawyer({
      referral: {
        status: "COMISSIONADO",
        risk_level: "RESTRICTED",
      },
      referredLawyer: null,
      referredClient: null,
      qualifyingTransaction: null,
    });

    expect(result.code).toBe("COMMISSIONED");
    expect(result.tone).toBe("success");
  });

  test("bloqueia indicação inválida ou restrita", () => {
    expect(
      classifyReferralForLawyer({
        referral: { review_status: "INVALID" },
        referredLawyer: {},
        referredClient: null,
        qualifyingTransaction: {},
      }).code,
    ).toBe("INVALID");
  });

  test("exige transação confirmada para marcar a assinatura como elegível", () => {
    const lawyer = { id: "lawyer-1" };

    expect(
      classifyReferralForLawyer({
        referral: { status: "ASSINOU_PRO" },
        referredLawyer: lawyer,
        referredClient: null,
        qualifyingTransaction: null,
      }).code,
    ).toBe("WAITING_PAYMENT");

    expect(
      classifyReferralForLawyer({
        referral: { status: "CADASTRADO" },
        referredLawyer: lawyer,
        referredClient: null,
        qualifyingTransaction: { id: "transaction-1" },
      }).code,
    ).toBe("ELIGIBLE");
  });

  test("distingue cadastro de cliente e cadastro ainda não localizado", () => {
    expect(
      classifyReferralForLawyer({
        referral: {},
        referredLawyer: null,
        referredClient: { id: "client-1" },
        qualifyingTransaction: null,
      }).code,
    ).toBe("CLIENT_LEAD");

    expect(
      classifyReferralForLawyer({
        referral: {},
        referredLawyer: null,
        referredClient: null,
        qualifyingTransaction: null,
      }).code,
    ).toBe("WAITING_REGISTRATION");
  });

  test("resume cadastros, pendências e Juris creditados", () => {
    const summary = summarizeLawyerReferrals([
      {
        referred: { profileType: "LAWYER" },
        status: { code: "COMMISSIONED" },
        reward: { amount: 35 },
      },
      {
        referred: { profileType: "LAWYER" },
        status: { code: "ELIGIBLE" },
        reward: { amount: 0 },
      },
      {
        referred: { profileType: "UNREGISTERED" },
        status: { code: "WAITING_REGISTRATION" },
        reward: { amount: 0 },
      },
    ]);

    expect(summary).toEqual({
      total: 3,
      registered: 2,
      awaitingCredit: 1,
      commissioned: 1,
      creditedJuris: 35,
    });
  });
});
