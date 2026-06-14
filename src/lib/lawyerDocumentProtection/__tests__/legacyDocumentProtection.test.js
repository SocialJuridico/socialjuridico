import {
  buildProtectionProtocol,
  extractLegacyStoragePath,
  matchesLegacyProtectionFilters,
  resolveLegacyProtectionSource,
  serializeLegacyProtectedDocument,
} from "../legacyDocumentProtection";

describe("legacy document protection", () => {
  test("allows only known legacy sources", () => {
    expect(resolveLegacyProtectionSource("contratos")).toEqual({
      table: "blindagem_contratos",
      type: "Contrato",
    });
    expect(resolveLegacyProtectionSource("unknown")).toBeNull();
  });

  test("serializes legacy records without exposing the public URL", () => {
    const document = serializeLegacyProtectedDocument(
      {
        id: "11111111-1111-4111-8111-111111111111",
        lawyer_id: "22222222-2222-4222-8222-222222222222",
        client_id: "33333333-3333-4333-8333-333333333333",
        file_name: "contrato.pdf",
        file_url: "https://example.supabase.co/storage/v1/object/public/crm_documents/blindagem/contrato/a.pdf",
        protocol: "BLDABC123",
        hash_sha512: "a".repeat(128),
        created_at: "2026-01-01T10:00:00.000Z",
      },
      {
        source: "contratos",
        memberMap: new Map([
          ["22222222-2222-4222-8222-222222222222", { name: "Dra. Ana" }],
        ]),
        clientMap: new Map([
          ["33333333-3333-4333-8333-333333333333", { name: "Cliente" }],
        ]),
      },
    );

    expect(document.legacy).toBe(true);
    expect(document.protocol).toBe("BLDABC123");
    expect(document.fileUrl).toContain("legacySource=contratos");
    expect(document.fileUrl).not.toContain("supabase.co");
    expect(document.lawyerName).toBe("Dra. Ana");
    expect(document.clientName).toBe("Cliente");
  });

  test("extracts only supported storage object paths", () => {
    expect(
      extractLegacyStoragePath(
        "https://example.supabase.co/storage/v1/object/public/crm_documents/blindagem/prova/arquivo.pdf",
      ),
    ).toBe("blindagem/prova/arquivo.pdf");
    expect(extractLegacyStoragePath("https://malicious.example/file.pdf")).toBeNull();
  });

  test("builds stable protocols and filters the legacy library", () => {
    expect(buildProtectionProtocol("abc-123", "", true)).toBe("SJ-BLD-LEG-ABC123");
    const document = {
      fileName: "Prova WhatsApp.pdf",
      documentType: "Prova Digital",
      protocol: "BLD999",
      hash: "f".repeat(128),
      clientName: "Maria",
      lawyerName: "Dr. João",
    };
    expect(matchesLegacyProtectionFilters(document, { search: "whatsapp" })).toBe(true);
    expect(matchesLegacyProtectionFilters(document, { type: "Contrato" })).toBe(false);
  });
});
