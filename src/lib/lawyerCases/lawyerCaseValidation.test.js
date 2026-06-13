import {
  buildLawyerCaseSummary,
  canOpenLawyerCaseChat,
  canStartLawyerCaseChat,
  normalizeLawyerCaseStatus,
  resolveLawyerCaseStatuses,
} from "./lawyerCaseValidation";

describe("lawyerCaseValidation", () => {
  it("normaliza os filtros de status", () => {
    expect(normalizeLawyerCaseStatus("contratado")).toBe("CONTRATADO");
    expect(normalizeLawyerCaseStatus("closed")).toBe("CLOSED");
    expect(normalizeLawyerCaseStatus("desconhecido")).toBe("ACTIVE");
  });

  it("resolve grupos ativos e encerrados", () => {
    expect(resolveLawyerCaseStatuses("ACTIVE")).toEqual([
      "ABERTO",
      "CONTRATADO",
      "EM_ANDAMENTO",
      "NEGOCIANDO",
    ]);
    expect(resolveLawyerCaseStatuses("CLOSED")).toEqual([
      "FECHADO",
      "CANCELADO",
    ]);
  });

  it("permite abrir atendimento sem nova cobranca quando aplicavel", () => {
    expect(
      canStartLawyerCaseChat({ status: "CONTRATADO", chatStarted: false }),
    ).toBe(true);
    expect(
      canStartLawyerCaseChat({ status: "FECHADO", chatStarted: false }),
    ).toBe(false);
    expect(
      canOpenLawyerCaseChat({ status: "CONTRATADO", chatStarted: true }),
    ).toBe(true);
    expect(
      canOpenLawyerCaseChat({ status: "CANCELADO", chatStarted: true }),
    ).toBe(false);
  });

  it("resume casos, conversas e mensagens nao lidas", () => {
    expect(
      buildLawyerCaseSummary([
        { status: "ABERTO", chatStarted: false, unreadCount: 0 },
        { status: "CONTRATADO", chatStarted: true, unreadCount: 2 },
        { status: "EM_ANDAMENTO", chatStarted: true, unreadCount: 1 },
        { status: "FECHADO", chatStarted: true, unreadCount: 0 },
        { status: "CANCELADO", chatStarted: false, unreadCount: 0 },
      ]),
    ).toEqual({
      total: 5,
      active: 3,
      hired: 1,
      inProgress: 1,
      closed: 1,
      cancelled: 1,
      chatReady: 3,
      unread: 3,
    });
  });
});
