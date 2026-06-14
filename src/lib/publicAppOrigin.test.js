import { hasTrustedMutationOrigin } from "./publicAppOrigin";

function request({ origin, referer, url = "https://internal.vercel.app/api/test", host, forwardedHost } = {}) {
  const headers = new Map();
  if (origin) headers.set("origin", origin);
  if (referer) headers.set("referer", referer);
  if (host) headers.set("host", host);
  if (forwardedHost) headers.set("x-forwarded-host", forwardedHost);

  return {
    url,
    headers: {
      get(name) {
        return headers.get(String(name).toLowerCase()) || null;
      },
    },
  };
}

describe("hasTrustedMutationOrigin", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SITE_URL = "https://socialjuridico.com.br";
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  });

  test("accepts the configured public origin even when request.url uses an internal host", () => {
    expect(
      hasTrustedMutationOrigin(
        request({ origin: "https://socialjuridico.com.br" }),
      ),
    ).toBe(true);
  });

  test("accepts the www variant of the production domain", () => {
    expect(
      hasTrustedMutationOrigin(
        request({ origin: "https://www.socialjuridico.com.br" }),
      ),
    ).toBe(true);
  });

  test("rejects an untrusted origin", () => {
    expect(
      hasTrustedMutationOrigin(
        request({ origin: "https://evil.example" }),
      ),
    ).toBe(false);
  });
});
