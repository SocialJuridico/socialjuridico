import {
  normalizeEmailHtmlPublicUrls,
  normalizeEmailPublicUrl,
  normalizeEmailTextPublicUrls,
  sanitizeEmailPayloadPublicUrls,
} from "./emailPublicUrlSafety";

const PUBLIC_ORIGIN = "https://socialjuridico.com.br";

describe("emailPublicUrlSafety", () => {
  test("substitui localhost em links HTML", () => {
    const html =
      '<a href="http://localhost:3000/api/auth/confirm-email?token_hash=abc">Confirmar</a>';

    expect(normalizeEmailHtmlPublicUrls(html, PUBLIC_ORIGIN)).toContain(
      'href="https://socialjuridico.com.br/api/auth/confirm-email?token_hash=abc"',
    );
  });

  test("corrige redirect_to dentro de link do Supabase", () => {
    const actionLink = new URL(
      "https://project.supabase.co/auth/v1/verify",
    );
    actionLink.searchParams.set("token", "abc");
    actionLink.searchParams.set("type", "recovery");
    actionLink.searchParams.set(
      "redirect_to",
      "http://localhost:3000/atualizar-senha?type=recovery",
    );

    const normalized = new URL(
      normalizeEmailPublicUrl(actionLink.toString(), PUBLIC_ORIGIN),
    );

    expect(normalized.origin).toBe("https://project.supabase.co");
    expect(normalized.searchParams.get("redirect_to")).toBe(
      "https://socialjuridico.com.br/atualizar-senha?type=recovery",
    );
  });

  test("corrige redirect_to com entidades HTML", () => {
    const html =
      '<a href="https://project.supabase.co/auth/v1/verify?token=abc&amp;type=recovery&amp;redirect_to=http%3A%2F%2Flocalhost%3A3000%2Fatualizar-senha%3Ftype%3Drecovery">Redefinir</a>';
    const normalizedHtml = normalizeEmailHtmlPublicUrls(
      html,
      PUBLIC_ORIGIN,
    );
    const href = normalizedHtml.match(/href="([^"]+)"/)?.[1];
    const normalizedUrl = new URL(href);

    expect(normalizedUrl.searchParams.get("redirect_to")).toBe(
      "https://socialjuridico.com.br/atualizar-senha?type=recovery",
    );
  });

  test("normaliza links em texto simples", () => {
    expect(
      normalizeEmailTextPublicUrls(
        "Acesse http://127.0.0.1:3000/login para continuar.",
        PUBLIC_ORIGIN,
      ),
    ).toBe("Acesse https://socialjuridico.com.br/login para continuar.");
  });

  test("preserva links externos que não são localhost", () => {
    expect(
      normalizeEmailPublicUrl(
        "https://wa.me/5511999999999?text=Ola",
        PUBLIC_ORIGIN,
      ),
    ).toBe("https://wa.me/5511999999999?text=Ola");
  });

  test("saneia payload mesmo sem tracking", () => {
    expect(
      sanitizeEmailPayloadPublicUrls(
        {
          to: "teste@example.com",
          subject: "Teste",
          html: '<a href="http://localhost:3000/login">Entrar</a>',
          text: "http://localhost:3000/login",
        },
        PUBLIC_ORIGIN,
      ),
    ).toMatchObject({
      html: '<a href="https://socialjuridico.com.br/login">Entrar</a>',
      text: "https://socialjuridico.com.br/login",
    });
  });
});
