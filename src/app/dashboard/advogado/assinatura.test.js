import crypto from "crypto";

// Lógica de validação e geração extraída do nosso sistema
const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateVerificationCode() {
  const genPart = (len) => {
    let part = '';
    for (let i = 0; i < len; i++) {
      part += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return part;
  };
  return `SJ-${genPart(4)}-${genPart(4)}`;
}

function calculateFileHash(buffer, algorithm = 'sha256') {
  return crypto.createHash(algorithm).update(buffer).digest('hex');
}

describe("Sistema de Assinaturas Digitais - Testes Unitários", () => {
  test("Deve gerar o código de verificação no formato GOV.BR correto (SJ-XXXX-XXXX)", () => {
    const code = generateVerificationCode();
    
    expect(code).toMatch(/^SJ-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(code.length).toBe(12);
  });

  test("Não deve conter caracteres ambíguos para leitura humana (O, 0, I, 1)", () => {
    for (let i = 0; i < 100; i++) {
      const code = generateVerificationCode();
      expect(code).not.toContain("O");
      expect(code).not.toContain("0");
      expect(code).not.toContain("I");
      expect(code).not.toContain("1");
    }
  });

  test("Deve calcular e diferenciar hash do original (SHA-512) e assinado (SHA-256) corretamente", () => {
    const dummyPdfContent = Buffer.from("%PDF-1.4 ... Dummy PDF Content for SocialJuridico");
    
    const originalHash = calculateFileHash(dummyPdfContent, 'sha512');
    const signedHash = calculateFileHash(dummyPdfContent, 'sha256');

    expect(originalHash.length).toBe(128); // SHA-512 hex is 128 chars
    expect(signedHash.length).toBe(64);    // SHA-256 hex is 64 chars
    expect(originalHash).not.toBe(signedHash);
  });
});
