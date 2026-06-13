import {
  clampInteger,
  isUuid,
  normalizeRequestId,
  normalizeSearch,
  normalizeState,
  safePublicUrl,
} from "../opportunityValidation";

describe("opportunityValidation", () => {
  test("aceita UUID válido e rejeita identificadores arbitrários", () => {
    const valid = "550e8400-e29b-41d4-a716-446655440000";

    expect(isUuid(valid)).toBe(true);
    expect(normalizeRequestId(valid)).toBe(valid);
    expect(isUuid("../../casos/1")).toBe(false);
    expect(normalizeRequestId("não-é-uuid")).toBeNull();
  });

  test("normaliza pesquisas e remove caracteres de controle", () => {
    expect(normalizeSearch("  Família\u0000   Porto Alegre  ", 40)).toBe(
      "Família Porto Alegre",
    );
    expect(normalizeSearch("a".repeat(200), 20)).toHaveLength(20);
  });

  test("aceita somente UFs com duas letras", () => {
    expect(normalizeState("rs")).toBe("RS");
    expect(normalizeState("R1")).toBe("");
    expect(normalizeState("RIO GRANDE DO SUL")).toBe("");
  });

  test("limita inteiros ao intervalo permitido", () => {
    expect(clampInteger("12", 1, 1, 30)).toBe(12);
    expect(clampInteger("999", 1, 1, 30)).toBe(30);
    expect(clampInteger("inválido", 6, 1, 30)).toBe(6);
  });

  test("permite somente URLs públicas HTTPS", () => {
    expect(safePublicUrl("https://socialjuridico.com.br/documento")).toBe(
      "https://socialjuridico.com.br/documento",
    );
    expect(safePublicUrl("http://socialjuridico.com.br/documento")).toBeNull();
    expect(safePublicUrl("javascript:alert(1)")).toBeNull();
    expect(safePublicUrl("não-é-url")).toBeNull();
  });
});
