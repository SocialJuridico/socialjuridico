export const TUTORIAL_AUDIENCES = Object.freeze({
  LAWYER: "LAWYER",
  CLIENT: "CLIENT",
  BOTH: "BOTH",
});

export const TUTORIAL_ROUTE_REGISTRY = Object.freeze([
  { key: "CLIENT_DASHBOARD", audience: "CLIENT", label: "Cliente · Painel principal", path: "/dashboard/cliente", clientTab: "painel" },
  { key: "CLIENT_PUBLISH_CASE", audience: "CLIENT", label: "Cliente · Publicar meu caso", path: "/dashboard/cliente", clientTab: "novo" },
  { key: "CLIENT_CASES", audience: "CLIENT", label: "Cliente · Meus casos", path: "/dashboard/cliente", clientTab: "meus-casos" },
  { key: "CLIENT_MESSAGES", audience: "CLIENT", label: "Cliente · Conversas", path: "/dashboard/cliente", clientTab: "conversas" },
  { key: "CLIENT_NOTIFICATIONS", audience: "CLIENT", label: "Cliente · Notificações", path: "/dashboard/cliente", clientTab: "notificacoes" },
  { key: "CLIENT_DIRECTORY", audience: "CLIENT", label: "Cliente · Profissionais", path: "/dashboard/cliente", clientTab: "profissionais" },
  { key: "CLIENT_PROFILE", audience: "CLIENT", label: "Cliente · Perfil", path: "/dashboard/cliente", clientTab: "perfil" },
  { key: "LAWYER_DASHBOARD", audience: "LAWYER", label: "Advogado · Dashboard", path: "/dashboard/advogado/dashboard", legacyTab: "dashboard" },
  { key: "LAWYER_REFERRALS", audience: "LAWYER", label: "Advogado · Indique e Ganhe", path: "/dashboard/advogado/indiqueganhe", legacyTab: "indicacoes" },
  { key: "LAWYER_OPPORTUNITIES", audience: "LAWYER", label: "Advogado · Oportunidades", path: "/dashboard/advogado/oportunidade", legacyTab: "oportunidades" },
  { key: "LAWYER_MESSAGES", audience: "LAWYER", label: "Advogado · Mensagens", path: "/dashboard/advogado/mensagens", legacyTab: "minhas-mensagens" },
  { key: "LAWYER_SITE_REQUEST", audience: "LAWYER", label: "Advogado · Quero um Site", path: "/dashboard/advogado/queroumsite", legacyTab: "quero-site" },
  { key: "LAWYER_CASES", audience: "LAWYER", label: "Advogado · Meus casos", path: "/dashboard/advogado/meuscasos", legacyTab: "meus-casos" },
  { key: "LAWYER_INTERESTS", audience: "LAWYER", label: "Advogado · Interesses", path: "/dashboard/advogado/declareiinteresse", legacyTab: "declarei-interesse" },
  { key: "LAWYER_SERVICE_ADS", audience: "LAWYER", label: "Advogado · Anúncios de Serviços", path: "/dashboard/advogado/anuncioseservicos", legacyTab: "anuncios-PREPOSTOS" },
  { key: "LAWYER_DIGITAL_SIGNATURE", audience: "LAWYER", label: "Advogado · Assinatura Digital", path: "/dashboard/advogado/assinaturadigital", legacyTab: "assinatura" },
  { key: "LAWYER_EXTRAJUDICIAL", audience: "LAWYER", label: "Advogado · Notificação Extrajudicial", path: "/dashboard/advogado/notificacaoextrajudicial", legacyTab: "notificacao" },
  { key: "LAWYER_AGENDA", audience: "LAWYER", label: "Advogado · Agenda e prazos", path: "/dashboard/advogado/agenda", legacyTab: "agenda" },
  { key: "LAWYER_CRM", audience: "LAWYER", label: "Advogado · CRM", path: "/dashboard/advogado/meusclientes", legacyTab: "crm" },
  { key: "LAWYER_SMARTDOC", audience: "LAWYER", label: "Advogado · IA Smart Docs", path: "/dashboard/advogado/smartdoc", legacyTab: "docs" },
  { key: "LAWYER_DOCUMENT_PROTECTION", audience: "LAWYER", label: "Advogado · Blindagem", path: "/dashboard/advogado/blindagemdedocumentos", legacyTab: "blindagem" },
  { key: "LAWYER_WRITER", audience: "LAWYER", label: "Advogado · Redator IA", path: "/dashboard/advogado/redator-ia", legacyTab: "redator" },
  { key: "LAWYER_DOCUMENT_GENERATOR", audience: "LAWYER", label: "Advogado · Gerador de Documentos", path: "/dashboard/advogado/geradordedocumentos", legacyTab: "gerador-documentos" },
  { key: "LAWYER_TRIAGE", audience: "LAWYER", label: "Advogado · Triagem", path: "/dashboard/advogado/triagem", legacyTab: "triagem" },
  { key: "LAWYER_CALCULATOR", audience: "LAWYER", label: "Advogado · Calculadoras", path: "/dashboard/advogado/calculadora", legacyTab: "calculadora" },
  { key: "LAWYER_JURISPRUDENCE", audience: "LAWYER", label: "Advogado · Jurisprudência", path: "/dashboard/advogado/jurisprudencia", legacyTab: "juris" },
  { key: "LAWYER_DIGITAL_CARD", audience: "LAWYER", label: "Advogado · Cartão Digital", path: "/dashboard/advogado/cartaodigital", legacyTab: "cartao-visitas" },
  { key: "LAWYER_PROFILE", audience: "LAWYER", label: "Advogado · Meu perfil", path: "/dashboard/advogado/meuperfil", legacyTab: "perfil" },
  { key: "LAWYER_INTERNAL_COMMUNICATION", audience: "LAWYER", label: "Advogado · Comunicação Interna", path: "/dashboard/advogado/comunicacaointerna", legacyTab: "comunicacao" },
  { key: "LAWYER_DOCUMENTATION", audience: "LAWYER", label: "Advogado · Documentação", path: "/dashboard/advogado/documentacao", legacyTab: "documentacao" },
]);

const ROUTE_BY_KEY = new Map(TUTORIAL_ROUTE_REGISTRY.map((item) => [item.key, item]));

export function getTutorialRoute(routeKey) {
  return ROUTE_BY_KEY.get(String(routeKey || "").trim().toUpperCase()) || null;
}

export function isTutorialRouteAllowed(routeKey, audience) {
  const route = getTutorialRoute(routeKey);
  const normalizedAudience = String(audience || "").trim().toUpperCase();
  return Boolean(
    route &&
      (normalizedAudience === route.audience || normalizedAudience === "BOTH"),
  );
}

export function resolveLawyerTutorialRoute(pathname, search = "") {
  const path = String(pathname || "").replace(/\/$/, "") || "/";
  const direct = TUTORIAL_ROUTE_REGISTRY.find(
    (item) => item.audience === "LAWYER" && (path === item.path || path.startsWith(`${item.path}/`)),
  );
  if (direct) return direct.key;

  if (path === "/dashboard/advogado") {
    const params = new URLSearchParams(String(search || "").replace(/^\?/, ""));
    const tab = params.get("tab");
    const legacy = TUTORIAL_ROUTE_REGISTRY.find(
      (item) => item.audience === "LAWYER" && item.legacyTab === tab,
    );
    return legacy?.key || null;
  }

  return null;
}

export function resolveClientTutorialRoute(activeTab) {
  return (
    TUTORIAL_ROUTE_REGISTRY.find(
      (item) => item.audience === "CLIENT" && item.clientTab === activeTab,
    )?.key || null
  );
}
