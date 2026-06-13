import {
  MAX_SMARTDOC_BYTES,
  isSafeSmartDocStoragePath,
  normalizeSmartDocFileName,
  parseSmartDocLegacyStoragePath,
  resolveSmartDocStorageTarget,
  validateSmartDocFileMetadata,
  validateSmartDocUpload,
} from "../smartDocValidation";

function file(name, type, bytes) {
  return {
    name,
    type,
    size: bytes.length,
  };
}

describe("SmartDoc file validation", () => {
  test("accepts a valid PDF", () => {
    const bytes = Buffer.from("%PDF-1.7\ncontent");
    const result = validateSmartDocUpload(
      file("peticao.pdf", "application/pdf", bytes),
      bytes,
    );
    expect(result.valid).toBe(true);
    expect(result.extension).toBe("pdf");
  });

  test("accepts valid DOC, DOCX, JPEG and PNG signatures", () => {
    const samples = [
      {
        name: "contrato.doc",
        type: "application/msword",
        bytes: Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00]),
      },
      {
        name: "contrato.docx",
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        bytes: Buffer.concat([
          Buffer.from([0x50, 0x4b, 0x03, 0x04]),
          Buffer.from("[Content_Types].xml word/document.xml"),
        ]),
      },
      {
        name: "prova.jpg",
        type: "image/jpeg",
        bytes: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      },
      {
        name: "prova.png",
        type: "image/png",
        bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      },
    ];

    for (const sample of samples) {
      expect(
        validateSmartDocUpload(
          file(sample.name, sample.type, sample.bytes),
          sample.bytes,
        ).valid,
      ).toBe(true);
    }
  });

  test("rejects extension and MIME mismatch", () => {
    const bytes = Buffer.from("%PDF-1.7");
    const result = validateSmartDocFileMetadata(
      file("arquivo.pdf", "image/png", bytes),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.file).toMatch(/MIME/);
  });

  test("rejects a spoofed signature", () => {
    const bytes = Buffer.from("not-a-pdf");
    const result = validateSmartDocUpload(
      file("arquivo.pdf", "application/pdf", bytes),
      bytes,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.file).toMatch(/conteúdo/i);
  });

  test("rejects missing MIME, empty and oversized files", () => {
    const pdf = Buffer.from("%PDF-1.7");
    expect(validateSmartDocFileMetadata(file("a.pdf", "", pdf)).valid).toBe(false);
    expect(validateSmartDocFileMetadata({ name: "a.pdf", type: "application/pdf", size: 0 }).valid).toBe(false);
    expect(
      validateSmartDocFileMetadata({
        name: "a.pdf",
        type: "application/pdf",
        size: MAX_SMARTDOC_BYTES + 1,
      }).valid,
    ).toBe(false);
  });

  test("normalizes display names but rejects path-like upload names", () => {
    expect(normalizeSmartDocFileName("C:\\temp\\contrato.pdf")).toBe("contrato.pdf");
    const bytes = Buffer.from("%PDF-1.7");
    expect(
      validateSmartDocFileMetadata(
        file("../contrato.pdf", "application/pdf", bytes),
      ).valid,
    ).toBe(false);
  });
});

describe("SmartDoc storage target", () => {
  const lawyerId = "d7b2959c-40a3-47e8-89b6-c3b7415d03f2";

  test("accepts a private path owned by the lawyer", () => {
    const target = resolveSmartDocStorageTarget({
      lawyer_id: lawyerId,
      storage_bucket: "smart-docs",
      storage_path: `${lawyerId}/55e1f4ff-7fa8-4d38-8cc7-d67a292fa4d5.pdf`,
    });
    expect(target).toEqual({
      bucket: "smart-docs",
      path: `${lawyerId}/55e1f4ff-7fa8-4d38-8cc7-d67a292fa4d5.pdf`,
    });
  });

  test.each([
    "../secret.pdf",
    "folder/../secret.pdf",
    "folder/%2e%2e/secret.pdf",
    "/absolute.pdf",
    "folder\\secret.pdf",
    "https://example.com/file.pdf",
  ])("rejects unsafe path %s", (path) => {
    expect(isSafeSmartDocStoragePath(path)).toBe(false);
  });

  test("rejects a SmartDoc path owned by another lawyer", () => {
    expect(
      resolveSmartDocStorageTarget({
        lawyer_id: lawyerId,
        storage_bucket: "smart-docs",
        storage_path: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/file.pdf",
      }),
    ).toBeNull();
  });

  test("parses a safe legacy public URL without returning the URL itself", () => {
    const path = parseSmartDocLegacyStoragePath(
      "https://project.supabase.co/storage/v1/object/public/crm_documents/client/file.pdf",
    );
    expect(path).toBe("client/file.pdf");
  });

  test("rejects unknown buckets and encoded traversal in legacy URLs", () => {
    expect(
      resolveSmartDocStorageTarget({
        lawyer_id: lawyerId,
        storage_bucket: "public-files",
        storage_path: `${lawyerId}/file.pdf`,
      }),
    ).toBeNull();
    expect(
      parseSmartDocLegacyStoragePath(
        "https://project.supabase.co/storage/v1/object/public/crm_documents/%2e%2e/file.pdf",
      ),
    ).toBe("");
  });
});
