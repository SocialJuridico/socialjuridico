import { usesLawyerSessionProvider } from "./lawyerProviderRoutes";

describe("usesLawyerSessionProvider", () => {
  test("inclui SmartDoc, Blindagem, Notificação, Agenda, Cartão Digital e Documentação", () => {
    expect(usesLawyerSessionProvider("/dashboard/advogado/smartdoc")).toBe(true);
    expect(usesLawyerSessionProvider("/dashboard/advogado/smartdoc/documento/123")).toBe(true);
    expect(usesLawyerSessionProvider("/dashboard/advogado/blindagemdedocumentos")).toBe(true);
    expect(usesLawyerSessionProvider("/dashboard/advogado/blindagemdedocumentos/documento/123")).toBe(true);
    expect(usesLawyerSessionProvider("/dashboard/advogado/notificacaoextrajudicial")).toBe(true);
    expect(usesLawyerSessionProvider("/dashboard/advogado/notificacaoextrajudicial/registro/123")).toBe(true);
    expect(usesLawyerSessionProvider("/dashboard/advogado/agenda")).toBe(true);
    expect(usesLawyerSessionProvider("/dashboard/advogado/agenda/compromisso/123")).toBe(true);
    expect(usesLawyerSessionProvider("/dashboard/advogado/cartaodigital")).toBe(true);
    expect(usesLawyerSessionProvider("/dashboard/advogado/cartaodigital/preview")).toBe(true);
    expect(usesLawyerSessionProvider("/dashboard/advogado/monitoramento")).toBe(true);
    expect(usesLawyerSessionProvider("/dashboard/advogado/monitoramento/detalhes")).toBe(true);
    expect(usesLawyerSessionProvider("/dashboard/advogado/documentacao")).toBe(true);
    expect(usesLawyerSessionProvider("/dashboard/advogado/documentacao/manual")).toBe(true);
  });

  test("mantem rotas antigas no DashboardProvider", () => {
    expect(usesLawyerSessionProvider("/dashboard/advogado")).toBe(false);
    expect(usesLawyerSessionProvider("/dashboard/advogado/perfil")).toBe(false);
  });

  test("nao aceita prefixos textuais sem segmento de rota", () => {
    expect(usesLawyerSessionProvider("/dashboard/advogado/smartdocumentos")).toBe(false);
    expect(usesLawyerSessionProvider("/dashboard/advogado/blindagemdedocumentos-legado")).toBe(false);
    expect(usesLawyerSessionProvider("/dashboard/advogado/notificacaoextrajudicial-antiga")).toBe(false);
    expect(usesLawyerSessionProvider("/dashboard/advogado/agendamentos")).toBe(false);
    expect(usesLawyerSessionProvider("/dashboard/advogado/cartaodigital-antigo")).toBe(false);
    expect(usesLawyerSessionProvider("/dashboard/advogado/documentacao-antiga")).toBe(false);
  });
});
