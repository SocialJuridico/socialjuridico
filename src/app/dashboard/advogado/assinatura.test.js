import crypto from "node:crypto";

const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateVerificationCode() {
  const part = () =>
    Array.from({ length: 4 }, () =>
      chars.charAt(crypto.randomInt(0, chars.length)),
    ).join("");
  return `SJ-${part()}-${part()}`;
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

describe("Sistema de Assinaturas Digitais", () => {
  test("gera código no formato SJ-XXXX-XXXX sem caracteres ambíguos", () => {
    for (let index = 0; index < 100; index += 1) {
      const code = generateVerificationCode();
      expect(code).toMatch(/^SJ-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
      expect(code).not.toMatch(/[O0I1]/);
    }
  });

  test("calcula SHA-256 real para o original e para cada versão assinada", () => {
    const original = Buffer.from("%PDF-1.4 documento original");
    const signed = Buffer.from("%PDF-1.4 documento original + carimbo");

    expect(sha256(original)).toHaveLength(64);
    expect(sha256(signed)).toHaveLength(64);
    expect(sha256(original)).not.toBe(sha256(signed));
  });
});
