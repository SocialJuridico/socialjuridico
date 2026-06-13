import { usesLawyerSessionProvider } from "./lawyerProviderRoutes";

describe("usesLawyerSessionProvider", () => {
  test("inclui SmartDoc e Blindagem de Documentos", () => {
    expect(usesLawyerSessionProvider("/dashboard/advogado/smartdoc")).toBe(true);
    expect(usesLawyerSessionProvider("/dashboard/advogado/smartdoc/documento/123")).toBe(true);
    expect(usesLawyerSessionProvider("/dashboard/advogado/blindagemdedocumentos")).toBe(true);
    expect(usesLawyerSessionProvider("/dashboard/advogado/blindagemdedocumentos/documento/123")).toBe(true);
  });

  test("mantem rotas antigas no DashboardProvider", () => {
    expect(usesLawyerSessionProvider("/dashboard/advogado")).toBe(false);
    expect(usesLawyerSessionProvider("/dashboard/advogado/perfil")).toBe(false);
  });

  test("nao aceita prefixos textuais sem segmento de rota", () => {
    expect(usesLawyerSessionProvider("/dashboard/advogado/smartdocumentos")).toBe(false);
    expect(usesLawyerSessionProvider("/dashboard/advogado/blindagemdedocumentos-legado")).toBe(false);
  });
});
