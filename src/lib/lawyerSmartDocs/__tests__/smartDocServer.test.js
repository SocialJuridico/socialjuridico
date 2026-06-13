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
  canDeleteSmartDoc,
  evaluateSmartDocAccessPolicy,
  hasValidSmartDocOrigin,
  reserveSmartDocUpload,
  resolveEnterpriseSmartDocPlan,
} from "../smartDocServer";

const LAWYER_ID = "d7b2959c-40a3-47e8-89b6-c3b7415d03f2";
const OTHER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OFFICE_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const REQUEST_ID = "55e1f4ff-7fa8-4d38-8cc7-d67a292fa4d5";

function request({ origin, referer, site, authorization } = {}) {
  const values = new Map(
    Object.entries({
      origin,
      referer,
      "sec-fetch-site": site,
      authorization,
    }).filter(([, value]) => value !== undefined),
  );
  return {
    url: "https://socialjuridico.com.br/api/advogado/smartdoc",
    headers: { get: (name) => values.get(name) || null },
  };
}

describe("SmartDoc access policy", () => {
  test("allows START, PRO and keeps legacy premium compatible", () => {
    expect(evaluateSmartDocAccessPolicy({ plan_type: "START" }).hasEligiblePlan).toBe(true);
    expect(evaluateSmartDocAccessPolicy({ plan_type: "PRO" }).hasEligiblePlan).toBe(true);
    expect(
      evaluateSmartDocAccessPolicy({ plan_type: "FREE", is_premium: true }).planType,
    ).toBe("PRO");
    expect(evaluateSmartDocAccessPolicy({ plan_type: "FREE" }).hasEligiblePlan).toBe(false);
  });

  test("maps and allows every Enterprise family", () => {
    expect(resolveEnterpriseSmartDocPlan("start_15")).toBe("ENTERPRISE_START");
    expect(resolveEnterpriseSmartDocPlan("pro_30")).toBe("ENTERPRISE_PRO");
    expect(resolveEnterpriseSmartDocPlan("pro_plus_7")).toBe(
      "ENTERPRISE_PRO_PLUS",
    );

    for (const planType of [
      "ENTERPRISE_START",
      "ENTERPRISE_PRO",
      "ENTERPRISE_PRO_PLUS",
    ]) {
      expect(evaluateSmartDocAccessPolicy({ plan_type: planType })).toMatchObject({
        hasEligiblePlan: true,
        isEnterprise: true,
      });
    }
  });

  test("requires ferr_smart_docs for interns", () => {
    expect(
      evaluateSmartDocAccessPolicy({
        plan_type: "ENTERPRISE_START",
        cargo: "Estagiário",
        permissoes: {},
      }).hasFeaturePermission,
    ).toBe(false);
    expect(
      evaluateSmartDocAccessPolicy({
        plan_type: "ENTERPRISE_START",
        cargo: "estagiario",
        permissoes: JSON.stringify({ ferr_smart_docs: true }),
      }).hasFeaturePermission,
    ).toBe(true);
  });

  test("only owner or office manager can delete documents from colleagues", () => {
    const memberAccess = {
      user: { id: LAWYER_ID },
      lawyerIds: [LAWYER_ID, OTHER_ID],
      canManageOffice: false,
    };
    expect(canDeleteSmartDoc(memberAccess, LAWYER_ID)).toBe(true);
    expect(canDeleteSmartDoc(memberAccess, OTHER_ID)).toBe(false);

    const managerAccess = { ...memberAccess, canManageOffice: true };
    expect(canDeleteSmartDoc(managerAccess, OTHER_ID)).toBe(true);
    expect(
      canDeleteSmartDoc(managerAccess, "cccccccc-cccc-4ccc-8ccc-cccccccccccc"),
    ).toBe(false);

    expect(
      evaluateSmartDocAccessPolicy({
        plan_type: "ENTERPRISE_PRO",
        cargo: "advogado",
        permissoes: { gerir_smart_docs: true },
      }).canManageOffice,
    ).toBe(true);
  });
});

describe("SmartDoc mutation origin", () => {
  test("accepts same-origin browser requests and bearer clients", () => {
    expect(
      hasValidSmartDocOrigin(
        request({ origin: "https://socialjuridico.com.br" }),
      ),
    ).toBe(true);
    expect(
      hasValidSmartDocOrigin(request({ authorization: "Bearer valid-token" })),
    ).toBe(true);
  });

  test("rejects cross-origin and ungrounded requests", () => {
    expect(
      hasValidSmartDocOrigin(request({ origin: "https://evil.example" })),
    ).toBe(false);
    expect(hasValidSmartDocOrigin(request())).toBe(false);
    expect(hasValidSmartDocOrigin(request({ site: "cross-site" }))).toBe(false);
  });
});

describe("SmartDoc reservation wrapper", () => {
  const payload = {
    requestId: REQUEST_ID,
    fileSizeBytes: 1024,
    protect: true,
    fileName: "peticao.pdf",
    mimeType: "application/pdf",
    fileSha256: "a".repeat(64),
  };

  test("always derives lawyer and office scope from authenticated access", async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: {
        success: true,
        operationId: REQUEST_ID,
        status: "RESERVED",
        jurisCharged: 0,
      },
      error: null,
    });
    const result = await reserveSmartDocUpload(
      { user: { id: LAWYER_ID }, officeId: OFFICE_ID, db: { rpc } },
      payload,
    );

    expect(result.success).toBe(true);
    expect(result.httpStatus).toBe(200);
    expect(result.status).toBe("RESERVED");
    expect(rpc).toHaveBeenCalledWith("reserve_smartdoc_upload", {
      p_lawyer_id: LAWYER_ID,
      p_office_id: OFFICE_ID,
      p_request_id: REQUEST_ID,
      p_file_size_bytes: 1024,
      p_protected: true,
      p_file_name: "peticao.pdf",
      p_mime_type: "application/pdf",
      p_file_sha256: "a".repeat(64),
    });
  });

  test("sends a null office scope for individual START and PRO users", async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: { success: true, operationId: REQUEST_ID, status: "RESERVED" },
      error: null,
    });
    await reserveSmartDocUpload(
      { user: { id: LAWYER_ID }, officeId: null, db: { rpc } },
      payload,
    );
    expect(rpc.mock.calls[0][1].p_office_id).toBeNull();
  });

  test("maps balance, storage, processing and office scope failures", async () => {
    const cases = [
      ["INSUFFICIENT_JURIS", 402],
      ["STORAGE_LIMIT_REACHED", 413],
      ["OPERATION_IN_PROGRESS", 409],
      ["OFFICE_SCOPE_MISMATCH", 403],
      ["OFFICE_NOT_FOUND", 404],
    ];

    for (const [code, expectedStatus] of cases) {
      const rpc = jest.fn().mockResolvedValue({
        data: { success: false, code },
        error: null,
      });
      await expect(
        reserveSmartDocUpload(
          { user: { id: LAWYER_ID }, officeId: OFFICE_ID, db: { rpc } },
          payload,
        ),
      ).resolves.toMatchObject({ httpStatus: expectedStatus });
    }
  });

  test("preserves completed idempotent operations", async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: {
        success: true,
        idempotent: true,
        operationId: REQUEST_ID,
        documentId: OTHER_ID,
        status: "COMPLETED",
      },
      error: null,
    });
    await expect(
      reserveSmartDocUpload(
        { user: { id: LAWYER_ID }, officeId: OFFICE_ID, db: { rpc } },
        payload,
      ),
    ).resolves.toMatchObject({
      success: true,
      idempotent: true,
      httpStatus: 200,
      status: "COMPLETED",
      documentId: OTHER_ID,
    });
  });
});
