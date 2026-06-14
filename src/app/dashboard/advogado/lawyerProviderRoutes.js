export const LAWYER_SESSION_ROUTES = Object.freeze([
  "/dashboard/advogado/oportunidade",
  "/dashboard/advogado/indiqueganhe",
  "/dashboard/advogado/mensagens",
  "/dashboard/advogado/declareiinteresse",
  "/dashboard/advogado/meuscasos",
  "/dashboard/advogado/anuncioseservicos",
  "/dashboard/advogado/anuncioseserviços",
  "/dashboard/advogado/queroumsite",
  "/dashboard/advogado/assinaturadigital",
  "/dashboard/advogado/notificacaoextrajudicial",
  "/dashboard/advogado/agenda",
  "/dashboard/advogado/meusclientes",
  "/dashboard/advogado/smartdoc",
  "/dashboard/advogado/blindagemdedocumentos",
  "/dashboard/advogado/redator-ia",
  "/dashboard/advogado/triagem",
  "/dashboard/advogado/calculadora",
  "/dashboard/advogado/jurisprudencia",
  "/dashboard/advogado/cartaodigital",
  "/dashboard/advogado/documentacao",
  "/dashboard/advogado/meuperfil",
  "/dashboard/advogado/comunicacaointerna",
]);

export function usesLawyerSessionProvider(pathname) {
  const currentPath = String(pathname || "");
  return LAWYER_SESSION_ROUTES.some(
    (route) => currentPath === route || currentPath.startsWith(`${route}/`),
  );
}
