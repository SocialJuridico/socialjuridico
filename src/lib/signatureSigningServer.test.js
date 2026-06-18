import {
  generateSignatureAccessToken,
  hashSignatureAccessToken,
  hashSignatureOtp,
  normalizeSignatureAccessToken,
  serializePublicSignatureContext,
  verifySignatureOtpHash,
} from "./signatureSigningServer";

describe("signature signing server primitives", () => {
  test("generates opaque tokens and stores only deterministic hashes", () => {
    const token = generateSignatureAccessToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{40,100}$/);
    expect(normalizeSignatureAccessToken(token)).toBe(token);
    expect(hashSignatureAccessToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashSignatureAccessToken(token)).not.toContain(token);
  });

  test("verifies OTP hashes without persisting the code", () => {
    const recipientId = "34eb6856-7d4c-41d4-bc08-6b91ca7d4bcd";
    const expected = hashSignatureOtp(recipientId, "284193");
    expect(expected).toMatch(/^[a-f0-9]{64}$/);
    expect(verifySignatureOtpHash(recipientId, "284193", expected)).toBe(true);
    expect(verifySignatureOtpHash(recipientId, "284194", expected)).toBe(false);
  });

  test("public serialization masks email and never exposes token material", () => {
    const result = serializePublicSignatureContext({
      token: "secret",
      tokenHash: "hash",
      recipient: {
        name: "Maria Silva",
        email: "maria@example.com",
        role: "SIGNER",
        status: "INVITED",
      },
      envelope: {
        title: "Contrato",
        document_type: "CONTRACT",
        message: "",
        status: "SENT",
        verification_code: "SJA-ABCD-EFGH",
        expires_at: "2099-01-01T00:00:00.000Z",
      },
      organization: { name: "Empresa" },
      documents: [{
        document_kind: "ORIGINAL",
        original_name: "contrato.pdf",
        size_bytes: 100,
        sha256: "a".repeat(64),
      }],
    });

    expect(result.recipient.emailMasked).toBe("ma***@example.com");
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(JSON.stringify(result)).not.toContain('"tokenHash"');
  });
});
