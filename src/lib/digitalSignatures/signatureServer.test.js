jest.mock(
  "@/lib/authServerUtils",
  () => ({ getAuthenticatedUser: jest.fn() }),
  { virtual: true },
);
jest.mock(
  "@/lib/resend",
  () => ({ resend: { emails: { send: jest.fn() } } }),
  { virtual: true },
);
jest.mock(
  "@/lib/supabase",
  () => ({ supabaseAdmin: null }),
  { virtual: true },
);
jest.mock(
  "@/lib/lawyerOpportunities/opportunityServerUtils",
  () => ({
    getRequestIpHash: jest.fn(() => "hash"),
    getRequestUserAgent: jest.fn(() => "agent"),
  }),
  { virtual: true },
);

import { trustedSignatureSiteUrl } from "./signatureServer";

describe("trustedSignatureSiteUrl", () => {
  const previousEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...previousEnv };
  });

  afterAll(() => {
    process.env = previousEnv;
  });

  test("does not use localhost for production signature invitation links", () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    process.env.NEXT_PUBLIC_APP_URL = "";
    process.env.SITE_URL = "";

    expect(trustedSignatureSiteUrl()).toBe("https://socialjuridico.com.br");
  });
});
