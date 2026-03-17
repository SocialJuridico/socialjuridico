import {
  formatPhone,
  isValidUUID,
  maskCPFCNPJ,
  maskEmail,
  maskId,
  maskPhone,
  sanitizeString,
  stripUUIDs,
} from "./securityUtils";

describe("securityUtils", () => {
  test("sanitizeString remove caracteres perigosos", () => {
    expect(sanitizeString(" <script>alert('x')</script> ")).toBe(
      "scriptalert(x)/script",
    );
  });

  test("isValidUUID valida UUID v4 corretamente", () => {
    expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isValidUUID("550e8400-e29b-11d4-a716-446655440000")).toBe(false);
  });

  test("maskEmail mascara email", () => {
    expect(maskEmail("usuario@dominio.com")).toBe("u***@dominio.com");
  });

  test("maskId mascara id", () => {
    expect(maskId("abc123def456")).toBe("abc***456");
  });

  test("maskCPFCNPJ mascara CPF e CNPJ", () => {
    expect(maskCPFCNPJ("12345678901")).toBe("***.***.***-01");
    expect(maskCPFCNPJ("12345678000195")).toBe("**.***.***/****-95");
  });

  test("formatPhone formata telefone de 10 e 11 digitos", () => {
    expect(formatPhone("5133334444")).toBe("(51) 3333-4444");
    expect(formatPhone("11987654321")).toBe("(11) 98765-4321");
  });

  test("maskPhone mascara telefone", () => {
    expect(maskPhone("5133334444")).toBe("(51) ****-4444");
    expect(maskPhone("11987654321")).toBe("(11) ****-4321");
  });

  test("stripUUIDs remove UUIDs de texto", () => {
    expect(
      stripUUIDs("User 550e8400-e29b-41d4-a716-446655440000 not found"),
    ).toBe("User [ID] not found");
  });
});