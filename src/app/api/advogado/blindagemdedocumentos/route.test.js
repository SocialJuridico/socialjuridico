import fs from "node:fs";
import path from "node:path";

const apiPath = path.join(
  process.cwd(),
  "src/app/api/advogado/blindagemdedocumentos/route.js",
);
const downloadPath = path.join(
  process.cwd(),
  "src/app/api/advogado/blindagemdedocumentos/[documentId]/arquivo/route.js",
);
const deletePath = path.join(
  process.cwd(),
  "src/app/api/advogado/blindagemdedocumentos/[documentId]/route.js",
);
const api = fs.readFileSync(apiPath, "utf8");
const download = fs.readFileSync(downloadPath, "utf8");
const deletion = fs.readFileSync(deletePath, "utf8");

describe("Document Protection API security contract", () => {
  test("authenticates, validates origin and never trusts frontend scope", () => {
    expect(api).toContain("hasValidSmartDocOrigin(request)");
    expect(api).toContain("requireDocumentProtectionAccess(request)");
    expect(api).toContain("reserveDocumentProtectionUpload(access");
    expect(api).not.toMatch(/formData\.get\(["']lawyer_id["']\)/);
    expect(api).not.toMatch(/formData\.get\(["']escritorio_id["']\)/);
    expect(api).not.toMatch(/formData\.get\(["']plan/i);
  });

  test("uses backend hashes, private storage and no public URL or raw IP", () => {
    expect(api).toContain('createHash("sha256")');
    expect(api).toContain('createHash("sha512")');
    expect(api).toContain('const STORAGE_BUCKET = "smart-docs"');
    expect(api).toContain("validateDocumentProtectionUpload(file, bytes)");
    expect(api).not.toContain("getPublicUrl");
    expect(api).not.toContain("publicUrl");
    expect(api).toContain("upload_ip: null");
  });

  test("keeps idempotency, refund, duplicate, audit and rollback paths", () => {
    expect(api).toContain("requestId");
    expect(api).toContain('reservation.status === "COMPLETED"');
    expect(api).toContain("findProtectedDuplicate(access, hashSha512)");
    expect(api).toContain("refundSmartDocUpload(");
    expect(api).toContain("rollbackFailed");
    expect(api).toContain("completeSmartDocUpload(");
    expect(api).toContain('reason: "ALREADY_PROTECTED"');
    expect(api).toContain("charged: false");
  });

  test("download requires authorization and generates a short signed URL", () => {
    expect(download).toContain("requireDocumentProtectionAccess(request)");
    expect(download).toContain("scopeSmartDocQuery(query, access.lawyerIds)");
    expect(download).toContain('.eq("is_blindado", true)');
    expect(download).toContain("async function redirectToSignedDownload");
    expect(download).toContain(".createSignedUrl(path, 120");
    expect(download).toContain("redirectToSignedDownload(");
    expect(download).not.toContain("getPublicUrl");
  });

  test("deletion is idempotent and keeps authorization plus cleanup queue", () => {
    expect(deletion).toContain("hasValidSmartDocOrigin(request)");
    expect(deletion).toContain("canDeleteProtectedDocument(access");
    expect(deletion).toContain('from("smartdoc_audit_logs")');
    expect(deletion).toContain("priorDeletion");
    expect(deletion).toContain("idempotent: true");
    expect(deletion).toContain('"delete_smartdoc_document"');
    expect(deletion).toContain('from("smartdoc_storage_cleanup")');
    expect(deletion).toContain('action: "DELETE_DOCUMENT"');
  });
});
