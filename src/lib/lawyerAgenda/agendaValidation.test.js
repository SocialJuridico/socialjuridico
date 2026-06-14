import {
  buildAgendaMetrics,
  normalizeAgendaQuery,
  normalizeAgendaType,
  normalizeAgendaUrgency,
  validateAgendaMutation,
} from "./agendaValidation";

const LAWYER_ID = "11111111-1111-4111-8111-111111111111";

describe("lawyer agenda validation", () => {
  test("normalizes legacy office values", () => {
    expect(normalizeAgendaType("Judicial")).toBe("PRAZO");
    expect(normalizeAgendaType("Audiência")).toBe("AUDIENCIA");
    expect(normalizeAgendaUrgency("Média")).toBe("MEDIUM");
    expect(normalizeAgendaUrgency("Crítica")).toBe("HIGH");
  });

  test("validates and sanitizes a complete agenda item", () => {
    const result = validateAgendaMutation({
      title: "  Prazo para contestação  ",
      description: "Providenciar documentos\u0000",
      date: "2026-06-15T12:00:00.000Z",
      endDate: "2026-06-15T13:00:00.000Z",
      type: "Prazo processual",
      urgency: "Alta",
      status: "Pendente",
      lawyerId: LAWYER_ID,
    });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      title: "Prazo para contestação",
      description: "Providenciar documentos",
      type: "PRAZO",
      urgency: "HIGH",
      status: "PENDING",
      lawyerId: LAWYER_ID,
    });
  });

  test("rejects an invalid duration and empty partial mutation", () => {
    expect(
      validateAgendaMutation({
        title: "Evento",
        description: "",
        date: "2026-06-15T13:00:00.000Z",
        endDate: "2026-06-15T12:00:00.000Z",
        type: "OUTRO",
        urgency: "MEDIUM",
        status: "PENDING",
      }).errors.endDate,
    ).toBeTruthy();
    expect(validateAgendaMutation({ id: LAWYER_ID }, { partial: true }).success).toBe(false);
  });

  test("caps pagination and builds operational metrics", () => {
    const query = normalizeAgendaQuery(new URLSearchParams("page=2&pageSize=999&status=Pendente"));
    expect(query).toMatchObject({ page: 2, pageSize: 50, status: "PENDING" });

    const now = new Date("2026-06-15T12:00:00.000Z");
    const metrics = buildAgendaMetrics(
      [
        { date: "2026-06-15T15:00:00.000Z", status: "PENDING", urgency: "HIGH" },
        { date: "2026-06-14T15:00:00.000Z", status: "PENDING", urgency: "MEDIUM" },
        { date: "2026-06-13T15:00:00.000Z", status: "COMPLETED", urgency: "LOW" },
      ],
      now,
    );
    expect(metrics).toMatchObject({ total: 3, pending: 2, completed: 1, overdue: 1, critical: 1 });
  });
});
