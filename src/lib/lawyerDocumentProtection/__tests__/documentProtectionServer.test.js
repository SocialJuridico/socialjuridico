jest.mock(
  "@/lib/authServerUtils",
  () => ({ getAuthenticatedUser: jest.fn() }),
  { virtual: true },
);
jest.mock(
  "@/lib/jurisHelper",
  () => ({ checkAndNotifyLowBalance: jest.fn() }),
  { virtual: true },
);
jest.mock(
  "@/lib/planUtils",
  () => ({ getUserPlanLimits: jest.fn() }),
  { virtual: true },
);
jest.mock(
  "@/lib/supabase",
  () => ({ supabaseAdmin: null }),
  { virtual: true },
);

import {
  canAccessProtectedDocument,
  canDeleteProtectedDocument,
  evaluateDocumentProtectionAccessPolicy,
  reserveDocumentProtectionUpload,
  serializeProtectedDocument,
} from "../documentProtectionServer";

const LAWYER_ID = "d7b2959c-40a3-47e8-89b6-c3b7415d03f2";
const OTHER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OUTSIDER_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const OFFICE_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const REQUEST_ID = "55e1f4ff-7fa8-4d38-8cc7-d67a292fa4d5";

describe("Document Protection access policy", () => {
  test("allows START, PRO and all Enterprise plans", () => {
    for (const planType of [
      "START",
      "PRO",
      "ENTERPRISE_START",
      "ENTERPRISE_PRO",
      "ENTERPRISE_PRO_PLUS",
    ]) {
      expect(evaluateDocumentProtectionAccessPolicy({ plan_type: planType })).toMatchObject({
        planType,
        hasEligiblePlan: true,
      });
    }
    expect(
      evaluateDocumentProtectionAccessPolicy({ plan_type: "FREE" }).hasEligiblePlan,
    ).toBe(false);
  });

  test("uses ferr_blindagem, not ferr_smart_docs, for interns", () => {
    expect(
      evaluateDocumentProtectionAccessPolicy({
        plan_type: "ENTERPRISE_START",
        cargo: "Estagiário",
        permissoes: { ferr_smart_docs: true },
      }).hasFeaturePermission,
    ).toBe(false);
    expect(
      evaluateDocumentProtectionAccessPolicy({
        plan_type: "ENTERPRISE_START",
        cargo: "estagiario",
        permissoes: JSON.stringify({ ferr_blindagem: true }),
      }).hasFeaturePermission,
    ).toBe(true);
  });

  test("isolates outsiders and permits members from the authenticated office scope", () => {
    const access = {
      user: { id: LAWYER_ID },
      lawyerIds: [LAWYER_ID, OTHER_ID],
      canManageOffice: false,
    };
    expect(canAccessProtectedDocument(access, LAWYER_ID)).toBe(true);
    expect(canAccessProtectedDocument(access, OTHER_ID)).toBe(true);
    expect(canAccessProtectedDocument(access, OUTSIDER_ID)).toBe(false);
    expect(canDeleteProtectedDocument(access, LAWYER_ID)).toBe(true);
    expect(canDeleteProtectedDocument(access, OTHER_ID)).toBe(false);
    expect(canDeleteProtectedDocument({ ...access, canManageOffice: true }, OTHER_ID)).toBe(
      true,
    );
  });
});

describe("Document Protection reservation", () => {
  const payload = {
    requestId: REQUEST_ID,
    fileSizeBytes: 2048,
    fileName: "contrato.pdf",
    mimeType: "application/pdf",
    fileSha256: "a".repeat(64),
  };

  test("derives lawyer and office from authenticated access", async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: { success: true, operationId: REQUEST_ID, status: "RESERVED" },
      error: null,
    });
    await expect(
      reserveDocumentProtectionUpload(
        { user: { id: LAWYER_ID }, officeId: OFFICE_ID, db: { rpc } },
        payload,
      ),
    ).resolves.toMatchObject({ success: true, httpStatus: 200 });
    expect(rpc).toHaveBeenCalledWith("reserve_document_protection", {
      p_lawyer_id: LAWYER_ID,
      p_office_id: OFFICE_ID,
      p_request_id: REQUEST_ID,
      p_file_size_bytes: 2048,
      p_file_name: "contrato.pdf",
      p_mime_type: "application/pdf",
      p_file_sha256: "a".repeat(64),
    });
  });

  test.each([
    ["INSUFFICIENT_JURIS", 402],
    ["STORAGE_LIMIT_REACHED", 413],
    ["ALREADY_PROTECTED", 409],
    ["IDEMPOTENCY_CONFLICT", 409],
    ["OPERATION_IN_PROGRESS", 409],
    ["OFFICE_SCOPE_MISMATCH", 403],
  ])("maps %s to HTTP %s", async (code, status) => {
    const rpc = jest.fn().mockResolvedValue({
      data: { success: false, code },
      error: null,
    });
    await expect(
      reserveDocumentProtectionUpload(
        { user: { id: LAWYER_ID }, officeId: OFFICE_ID, db: { rpc } },
        payload,
      ),
    ).resolves.toMatchObject({ success: false, code, httpStatus: status });
  });
});

describe("Document Protection serialization", () => {
  test("does not expose the private storage path and keeps authorization flags", () => {
    const access = {
      user: { id: LAWYER_ID },
      lawyerIds: [LAWYER_ID],
      canManageOffice: false,
    };
    const serialized = serializeProtectedDocument(
      {
        id: REQUEST_ID,
        lawyer_id: LAWYER_ID,
        file_name: "contrato.pdf",
        storage_bucket: "smart-docs",
        storage_path: `${LAWYER_ID}/secret.pdf`,
        is_blindado: true,
        hash_sha512: "b".repeat(128),
        file_size_bytes: 100,
        created_at: "2026-06-13T12:00:00.000Z",
      },
      access,
      new Map([[LAWYER_ID, { name: "Responsável" }]]),
    );

    expect(serialized).toMatchObject({
      id: REQUEST_ID,
      fileUrl: `/api/advogado/blindagemdedocumentos/${REQUEST_ID}/arquivo`,
      hashAlgorithm: "SHA-512",
      lawyerName: "Responsável",
      canDelete: true,
    });
    expect(serialized).not.toHaveProperty("storage_path");
    expect(serialized).not.toHaveProperty("storage_bucket");
  });
});
