import {
  getTutorialRoute,
  isTutorialRouteAllowed,
  resolveClientTutorialRoute,
  resolveLawyerTutorialRoute,
} from "./tutorialRoutes";

describe("tutorialRoutes", () => {
  test("resolve a publicação de caso do cliente", () => {
    expect(resolveClientTutorialRoute("novo")).toBe("CLIENT_PUBLISH_CASE");
    expect(getTutorialRoute("CLIENT_PUBLISH_CASE")?.path).toBe("/dashboard/cliente");
  });

  test("resolve dashboard, gerador e rotas legadas do advogado", () => {
    expect(resolveLawyerTutorialRoute("/dashboard/advogado/dashboard", "")).toBe(
      "LAWYER_DASHBOARD",
    );
    expect(resolveLawyerTutorialRoute("/dashboard/advogado/indiqueganhe", "")).toBe(
      "LAWYER_REFERRALS",
    );
    expect(
      resolveLawyerTutorialRoute(
        "/dashboard/advogado/geradordedocumentos",
        "",
      ),
    ).toBe("LAWYER_DOCUMENT_GENERATOR");
    expect(resolveLawyerTutorialRoute("/dashboard/advogado/documentacao", "")).toBe(
      "LAWYER_DOCUMENTATION",
    );
    expect(
      resolveLawyerTutorialRoute(
        "/dashboard/advogado",
        "?legacy=1&tab=documentacao",
      ),
    ).toBe("LAWYER_DOCUMENTATION");
    expect(
      resolveLawyerTutorialRoute(
        "/dashboard/advogado",
        "?legacy=1&tab=indicacoes",
      ),
    ).toBe("LAWYER_REFERRALS");
  });

  test("inclui todas as rotas principais do menu do advogado", () => {
    const expected = [
      ["LAWYER_REFERRALS", "/dashboard/advogado/indiqueganhe"],
      ["LAWYER_SITE_REQUEST", "/dashboard/advogado/queroumsite"],
      ["LAWYER_SERVICE_ADS", "/dashboard/advogado/anuncioseservicos"],
      ["LAWYER_INTERNAL_COMMUNICATION", "/dashboard/advogado/comunicacaointerna"],
    ];

    for (const [key, path] of expected) {
      expect(getTutorialRoute(key)?.path).toBe(path);
      expect(resolveLawyerTutorialRoute(path, "")).toBe(key);
      expect(isTutorialRouteAllowed(key, "LAWYER")).toBe(true);
    }
  });

  test("não aceita chaves fora do público", () => {
    expect(isTutorialRouteAllowed("CLIENT_PUBLISH_CASE", "CLIENT")).toBe(true);
    expect(isTutorialRouteAllowed("CLIENT_PUBLISH_CASE", "LAWYER")).toBe(false);
    expect(isTutorialRouteAllowed("LAWYER_AGENDA", "LAWYER")).toBe(true);
    expect(isTutorialRouteAllowed("LAWYER_DOCUMENT_GENERATOR", "LAWYER")).toBe(true);
  });

  test("não confunde prefixos textuais", () => {
    expect(
      resolveLawyerTutorialRoute("/dashboard/advogado/documentacao-antiga", ""),
    ).toBeNull();
    expect(
      resolveLawyerTutorialRoute(
        "/dashboard/advogado/geradordedocumentos-antigo",
        "",
      ),
    ).toBeNull();
  });
});
