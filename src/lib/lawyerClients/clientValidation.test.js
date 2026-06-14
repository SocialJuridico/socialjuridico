import { validateInteractionPayload } from "./clientValidation";

describe("validateInteractionPayload", () => {
  test("requires a schedule for meetings", () => {
    const result = validateInteractionPayload({
      requestId: "11111111-1111-4111-8111-111111111111",
      type: "reunião",
      content: "Reunião para alinhamento do caso.",
    });

    expect(result.valid).toBe(false);
    expect(result.errors.scheduledAt).toBeTruthy();
  });

  test("accepts scheduled calls", () => {
    const result = validateInteractionPayload({
      requestId: "11111111-1111-4111-8111-111111111111",
      type: "ligação",
      content: "Ligação de retorno sobre documentos.",
      scheduledAt: "2026-06-17T10:00",
    });

    expect(result.valid).toBe(true);
    expect(result.data.scheduledAt).toMatch(/^2026-06-17T/);
  });

  test("does not require a schedule for internal notes", () => {
    const result = validateInteractionPayload({
      requestId: "11111111-1111-4111-8111-111111111111",
      type: "nota",
      content: "Cliente pediu retorno pelo WhatsApp.",
    });

    expect(result.valid).toBe(true);
    expect(result.data.scheduledAt).toBeNull();
  });
});
