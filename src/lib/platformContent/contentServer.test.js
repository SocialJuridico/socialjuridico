jest.mock("@/lib/adminAuth", () => ({ getAuthenticatedAdmin: jest.fn() }));
jest.mock("@/lib/authServerUtils", () => ({ getAuthenticatedUser: jest.fn() }));
jest.mock("@/lib/securityUtils", () => ({ getRoleFromDatabase: jest.fn() }));
jest.mock("@/lib/supabase", () => ({ supabaseAdmin: null }));
jest.mock("@/lib/lawyerOpportunities/opportunityServerUtils", () => ({
  getRequestIpHash: jest.fn(() => "hash"),
  getRequestUserAgent: jest.fn(() => "agent"),
}));

import { hasValidPlatformMutationOrigin } from "./contentServer";

function createRequest({ origin, referer, host, site, authorization } = {}) {
  const values = new Map(
    Object.entries({
      origin,
      referer,
      host: host || "socialjuridico.com.br",
      "sec-fetch-site": site,
      authorization,
    }).filter(([, value]) => value !== undefined),
  );

  return {
    headers: {
      get(name) {
        return values.get(name) || null;
      },
    },
  };
}

describe("platform content mutation origin", () => {
  test("aceita navegador na mesma origem e cliente bearer", () => {
    expect(
      hasValidPlatformMutationOrigin(
        createRequest({ origin: "https://socialjuridico.com.br" }),
      ),
    ).toBe(true);
    expect(
      hasValidPlatformMutationOrigin(
        createRequest({ authorization: "Bearer token" }),
      ),
    ).toBe(true);
  });

  test("rejeita origem cruzada e cabeçalho inválido", () => {
    expect(
      hasValidPlatformMutationOrigin(
        createRequest({ origin: "https://evil.example" }),
      ),
    ).toBe(false);
    expect(
      hasValidPlatformMutationOrigin(
        createRequest({ origin: "not-a-url" }),
      ),
    ).toBe(false);
    expect(
      hasValidPlatformMutationOrigin(
        createRequest({ site: "cross-site" }),
      ),
    ).toBe(false);
  });

  test("aceita requisição interna sem Origin quando não é cross-site", () => {
    expect(hasValidPlatformMutationOrigin(createRequest({ site: "same-origin" }))).toBe(true);
    expect(hasValidPlatformMutationOrigin(createRequest())).toBe(true);
  });
});
