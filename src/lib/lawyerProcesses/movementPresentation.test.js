import {
  formatMovementDateTime,
  presentLawyerProcessMovement,
} from "./movementPresentation";

describe("lawyer process movement presentation", () => {
  test("turns a JSON string from the process provider into readable fields", () => {
    const movement = presentLawyerProcessMovement(
      JSON.stringify({
        data: "2026-06-09T03:52:34.000Z",
        nome: "Petição",
        codigo: 85,
        complemento: null,
        raw: {
          codigo: 85,
          nome: "Petição",
          dataHora: "2026-06-09T03:52:34.000Z",
          orgaoJulgador: { codigo: "1433", nome: "VASSOURAS 1 VARA" },
        },
      }),
    );

    expect(movement).toMatchObject({
      title: "Petição",
      detail: "",
      code: "85",
      courtName: "VASSOURAS 1 VARA",
      courtCode: "1433",
      date: "2026-06-09T03:52:34.000Z",
    });
  });

  test("recovers legacy saved records whose description contains JSON", () => {
    const movement = presentLawyerProcessMovement({
      movement_date: "2026-06-03T07:32:36.000Z",
      movement_type: "12266",
      description: '{"nome":"Confirmada","complemento":"Intimação confirmada"}',
      raw_payload: {
        raw: { orgaoJulgador: { nome: "Vara Cível" } },
      },
    });

    expect(movement.title).toBe("Confirmada");
    expect(movement.detail).toBe("Intimação confirmada");
    expect(movement.code).toBe("12266");
    expect(movement.courtName).toBe("Vara Cível");
  });

  test("keeps malformed provider payloads out of the interface", () => {
    const movement = presentLawyerProcessMovement('{"nome":');
    expect(movement.title).toBe("Movimentação processual");
    expect(movement.detail).toBe("");
  });

  test("formats date and time separately", () => {
    const result = formatMovementDateTime("2026-06-09T12:34:00.000Z");
    expect(result.date).toContain("2026");
    expect(result.time).toMatch(/^\d{2}:\d{2}$/);
  });
});
