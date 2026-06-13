import {
  MAX_SMARTDOC_BYTES,
  isSafeDocumentProtectionStoragePath,
  isSameProtectedHash,
  normalizeDocumentProtectionFileName,
  normalizeDocumentProtectionType,
  resolveDocumentProtectionStorageTarget,
  validateDocumentProtectionFileMetadata,
  validateDocumentProtectionUpload,
} from "../documentProtectionValidation";

function file(name, type, bytes) {
  return { name, type, size: bytes.length };
}

describe("Document Protection file validation", () => {
  test("reuses the SmartDoc PDF, DOC, DOCX, JPEG and PNG validation contract", () => {
    const samples = [
      ["contrato.pdf", "application/pdf", Buffer.from("%PDF-1.7\ncontent")],
      [
        "procuracao.doc",
        "application/msword",
        Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00]),
      ],
      [
        "prova.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        Buffer.concat([
          Buffer.from([0x50, 0x4b, 0x03, 0x04]),
          Buffer.from("[Content_Types].xml word/document.xml"),
        ]),
      ],
      ["prova.jpg", "image/jpeg", Buffer.from([0xff, 0xd8, 0xff, 0xe0])],
      [
        "prova.png",
        "image/png",
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ],
    ];

    for (const [name, type, bytes] of samples) {
      expect(validateDocumentProtectionUpload(file(name, type, bytes), bytes).valid).toBe(
        true,
      );
    }
  });

  test("rejects invalid extension, MIME, magic bytes, empty and oversized files", () => {
    const pdf = Buffer.from("%PDF-1.7");
    expect(
      validateDocumentProtectionFileMetadata(file("arquivo.exe", "application/pdf", pdf))
        .valid,
    ).toBe(false);
    expect(
      validateDocumentProtectionFileMetadata(file("arquivo.pdf", "image/png", pdf)).valid,
    ).toBe(false);
    expect(
      validateDocumentProtectionUpload(
        file("arquivo.pdf", "application/pdf", Buffer.from("spoof")),
        Buffer.from("spoof"),
      ).valid,
    ).toBe(false);
    expect(
      validateDocumentProtectionFileMetadata({
        name: "arquivo.pdf",
        type: "application/pdf",
        size: 0,
      }).valid,
    ).toBe(false);
    expect(
      validateDocumentProtectionFileMetadata({
        name: "arquivo.pdf",
        type: "application/pdf",
        size: MAX_SMARTDOC_BYTES + 1,
      }).valid,
    ).toBe(false);
  });

  test("normalizes display names and blocks path traversal", () => {
    expect(normalizeDocumentProtectionFileName("C:\\temp\\contrato.pdf")).toBe(
      "contrato.pdf",
    );
    for (const path of [
      "../secret.pdf",
      "folder/../secret.pdf",
      "folder/%2e%2e/secret.pdf",
      "/absolute.pdf",
      "folder\\secret.pdf",
      "https://example.com/file.pdf",
    ]) {
      expect(isSafeDocumentProtectionStoragePath(path)).toBe(false);
    }
  });

  test("accepts only a private SmartDoc path owned by the responsible lawyer", () => {
    const lawyerId = "d7b2959c-40a3-47e8-89b6-c3b7415d03f2";
    expect(
      resolveDocumentProtectionStorageTarget({
        lawyer_id: lawyerId,
        storage_bucket: "smart-docs",
        storage_path: `${lawyerId}/55e1f4ff-7fa8-4d38-8cc7-d67a292fa4d5.pdf`,
      }),
    ).toEqual({
      bucket: "smart-docs",
      path: `${lawyerId}/55e1f4ff-7fa8-4d38-8cc7-d67a292fa4d5.pdf`,
    });
    expect(
      resolveDocumentProtectionStorageTarget({
        lawyer_id: lawyerId,
        storage_bucket: "smart-docs",
        storage_path: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/file.pdf",
      }),
    ).toBeNull();
  });
});

describe("Document Protection metadata", () => {
  test.each([
    ["contrato", "Contrato"],
    ["Procuração", "Procuração"],
    ["Prova Digital", "Prova Digital"],
    ["notificacao", "Notificação"],
    ["unexpected", "Outros"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeDocumentProtectionType(input)).toBe(expected);
  });

  test("recognizes a previously protected SHA-512 hash", () => {
    const hash = "a".repeat(128);
    expect(isSameProtectedHash({ is_blindado: true, hash_sha512: hash }, hash)).toBe(
      true,
    );
    expect(isSameProtectedHash({ is_blindado: false, hash_sha512: hash }, hash)).toBe(
      false,
    );
    expect(isSameProtectedHash({ is_blindado: true, hash_sha512: hash }, "bad")).toBe(
      false,
    );
  });
});
