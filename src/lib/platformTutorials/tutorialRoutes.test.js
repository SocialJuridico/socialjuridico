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

  test("resolve rotas dedicadas e legadas do advogado", () => {
    expect(resolveLawyerTutorialRoute("/dashboard/advogado/documentacao", "")).toBe(
      "LAWYER_DOCUMENTATION",
    );
    expect(
      resolveLawyerTutorialRoute(
        "/dashboard/advogado",
        "?legacy=1&tab=documentacao",
      ),
    ).toBe("LAWYER_DOCUMENTATION");
  });

  test("não aceita chaves fora do público", () => {
    expect(isTutorialRouteAllowed("CLIENT_PUBLISH_CASE", "CLIENT")).toBe(true);
    expect(isTutorialRouteAllowed("CLIENT_PUBLISH_CASE", "LAWYER")).toBe(false);
    expect(isTutorialRouteAllowed("LAWYER_AGENDA", "LAWYER")).toBe(true);
  });

  test("não confunde prefixos textuais", () => {
    expect(
      resolveLawyerTutorialRoute("/dashboard/advogado/documentacao-antiga", ""),
    ).toBeNull();
  });
});
