import {
  DEFAULT_PUBLIC_APP_ORIGIN,
  resolvePublicAppOrigin,
  resolveStaticPublicAppOrigin,
} from "./publicAppOrigin";

function request(url, headers = {}) {
  const normalized = new Map(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );
  return {
    url,
    headers: {
      get(name) {
        return normalized.get(String(name).toLowerCase()) || null;
      },
    },
  };
}

describe("publicAppOrigin", () => {
  test("prioriza o host publico encaminhado em producao", () => {
    expect(
      resolvePublicAppOrigin(
        request("http://localhost:3000/api/test", {
          "x-forwarded-host": "socialjuridico.com.br",
          "x-forwarded-proto": "https",
        }),
        {
          NODE_ENV: "production",
          NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
        },
      ),
    ).toBe("https://socialjuridico.com.br");
  });

  test("rejeita localhost configurado em producao", () => {
    expect(
      resolvePublicAppOrigin(
        request("http://localhost:3000/api/test"),
        {
          NODE_ENV: "production",
          NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
          NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3000",
        },
      ),
    ).toBe(DEFAULT_PUBLIC_APP_ORIGIN);
  });

  test("não aceita host arbitrario enviado pelo cliente", () => {
    expect(
      resolvePublicAppOrigin(
        request("http://localhost:3000/api/test", {
          host: "dominio-malicioso.example",
          "x-forwarded-proto": "https",
        }),
        { NODE_ENV: "production" },
      ),
    ).toBe(DEFAULT_PUBLIC_APP_ORIGIN);
  });

  test("preserva localhost no desenvolvimento", () => {
    expect(
      resolvePublicAppOrigin(
        request("http://localhost:3000/api/test"),
        {
          NODE_ENV: "development",
          NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
        },
      ),
    ).toBe("http://localhost:3000");
  });

  test("origem estatica ignora localhost em producao", () => {
    expect(
      resolveStaticPublicAppOrigin({
        NODE_ENV: "production",
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      }),
    ).toBe(DEFAULT_PUBLIC_APP_ORIGIN);
  });
});
