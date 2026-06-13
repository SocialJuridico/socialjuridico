import {
  MAX_SIGNATURE_FILE_BYTES,
  isValidVerificationCode,
  normalizeCreateSignaturePayload,
  normalizeSignatureQuery,
  sanitizeSignatureMetadata,
  validateCreateSignaturePayload,
  validateSignatureFileDescriptor,
} from "./signatureValidation";

describe("assinatura digital - validação compartilhada", () => {
  test("normaliza e valida a criação sem confiar em campos do advogado", () => {
    const result = validateCreateSignaturePayload({
      requestId: "818fa8e5-b6cc-4c67-9ed6-f1ba82b2ea63",
      documentName: "  Contrato   de Honorários  ",
      documentType: "contrato",
      clientId: "c46f5aa3-6929-4ce6-8228-a1fef2f96352",
      clientName: "  Maria   Silva ",
      clientEmail: " MARIA@EXEMPLO.COM ",
      uploadPath:
        "signatures/originals/818fa8e5-b6cc-4c67-9ed6-f1ba82b2ea63/documento.pdf",
      lawyerName: "Nome adulterado",
      lawyerEmail: "adulterado@exemplo.com",
    });

    expect(result.valid).toBe(true);
    expect(result.data).toEqual({
      requestId: "818fa8e5-b6cc-4c67-9ed6-f1ba82b2ea63",
      documentName: "Contrato de Honorários",
      documentType: "contrato",
      clientId: "c46f5aa3-6929-4ce6-8228-a1fef2f96352",
      clientName: "Maria Silva",
      clientEmail: "maria@exemplo.com",
      uploadPath:
        "signatures/originals/818fa8e5-b6cc-4c67-9ed6-f1ba82b2ea63/documento.pdf",
    });
  });

  test("rejeita payload incompleto e e-mail inválido", () => {
    const result = validateCreateSignaturePayload({
      requestId: "invalido",
      documentName: "a",
      clientName: "",
      clientEmail: "email-invalido",
      uploadPath: "arquivo.exe",
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.objectContaining({
        requestId: expect.any(String),
        documentName: expect.any(String),
        clientName: expect.any(String),
        clientEmail: expect.any(String),
        uploadPath: expect.any(String),
      }),
    );
  });

  test("limita paginação, status e busca", () => {
    const params = new URLSearchParams({
      page: "-2",
      pageSize: "999",
      status: "signed",
      search: "Contrato%,(teste)",
    });

    expect(normalizeSignatureQuery(params)).toEqual({
      page: 1,
      pageSize: 25,
      status: "signed",
      search: "Contratoteste",
    });
  });

  test("remove OTP e demais segredos dos metadados serializados", () => {
    const result = sanitizeSignatureMetadata({
      lawyer: {
        name: "João Advogado",
        email: "joao@example.com",
        signed: true,
        ip: "192.168.1.20",
        otp: "123456",
        otp_hash: "hash",
        otp_expires: "2026-06-13",
        otp_attempts: 4,
      },
      client: { name: "Maria", email: "maria@example.com", signed: false },
      history: [{ event: "created", details: "ok" }],
    });

    expect(result.lawyer).not.toHaveProperty("otp");
    expect(result.lawyer).not.toHaveProperty("otp_hash");
    expect(result.lawyer).not.toHaveProperty("otp_expires");
    expect(result.lawyer).not.toHaveProperty("otp_attempts");
    expect(result.lawyer.email).toBe("joao@example.com");
  });

  test("valida descritor e tamanho máximo do PDF", () => {
    expect(
      validateSignatureFileDescriptor({
        fileName: "contrato.pdf",
        contentType: "application/pdf",
        size: MAX_SIGNATURE_FILE_BYTES,
      }).valid,
    ).toBe(true);

    expect(
      validateSignatureFileDescriptor({
        fileName: "contrato.exe",
        contentType: "application/octet-stream",
        size: MAX_SIGNATURE_FILE_BYTES + 1,
      }).valid,
    ).toBe(false);
  });

  test("aceita apenas o formato de código sem caracteres ambíguos", () => {
    expect(isValidVerificationCode("SJ-A7D9-E8C2")).toBe(true);
    expect(isValidVerificationCode("SJ-O0I1-AAAA")).toBe(false);
  });

  test("normalização descarta clientId inválido", () => {
    expect(normalizeCreateSignaturePayload({ clientId: "1" }).clientId).toBeNull();
  });
});
