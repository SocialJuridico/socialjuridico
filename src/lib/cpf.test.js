import { formatCPF, isValidCPF, normalizeCPF } from "./cpf";

describe("cpf", () => {
  test("normalizeCPF strips non-digits and caps at 11 digits", () => {
    expect(normalizeCPF("123.456.789-09")).toBe("12345678909");
    expect(normalizeCPF("1234567890999")).toBe("12345678909");
    expect(normalizeCPF(null)).toBe("");
  });

  test("formatCPF adds punctuation progressively", () => {
    expect(formatCPF("123")).toBe("123");
    expect(formatCPF("123456")).toBe("123.456");
    expect(formatCPF("123456789")).toBe("123.456.789");
    expect(formatCPF("12345678909")).toBe("123.456.789-09");
  });

  test("isValidCPF accepts a known-valid CPF", () => {
    expect(isValidCPF("123.456.789-09")).toBe(true);
  });

  test("isValidCPF rejects wrong length, repeated digits and bad check digits", () => {
    expect(isValidCPF("123456789")).toBe(false);
    expect(isValidCPF("111.111.111-11")).toBe(false);
    expect(isValidCPF("123.456.789-00")).toBe(false);
    expect(isValidCPF(null)).toBe(false);
  });
});
