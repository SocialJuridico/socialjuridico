"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useDashboard } from "../DashboardContext";

const ROUTE_TO_TAB = new Map([
  ["/dashboard/advogado/oportunidade", "oportunidades"],
  ["/dashboard/advogado/indiqueganhe", "indicacoes"],
  ["/dashboard/advogado/mensagens", "minhas-mensagens"],
  ["/dashboard/advogado/queroumsite", "quero-site"],
  ["/dashboard/advogado/meuscasos", "meus-casos"],
  ["/dashboard/advogado/declareiinteresse", "declarei-interesse"],
  ["/dashboard/advogado/anuncioseservicos", "anuncios-PREPOSTOS"],
  ["/dashboard/advogado/anuncioseserviços", "anuncios-PREPOSTOS"],
]);

const LEGACY_TAB_ROUTES = new Map([
  ["indicacoes", "/dashboard/advogado/indiqueganhe"],
  ["minhas-mensagens", "/dashboard/advogado/mensagens"],
  ["quero-site", "/dashboard/advogado/queroumsite"],
  ["meus-casos", "/dashboard/advogado/meuscasos"],
  ["declarei-interesse", "/dashboard/advogado/declareiinteresse"],
  ["anuncios-PREPOSTOS", "/dashboard/advogado/anuncioseservicos?categoria=PREPOSTOS"],
  ["anuncios-DILIGENCIAS", "/dashboard/advogado/anuncioseservicos?categoria=DILIGENCIAS"],
  ["anuncios-OUTROS", "/dashboard/advogado/anuncioseservicos?categoria=OUTROS"],
  ["assinatura", "/dashboard/advogado/assinaturadigital"],
  ["crm", "/dashboard/advogado/meusclientes"],
]);

export default function DashboardRouteSync() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeTab, setActiveTab } = useDashboard();
  const requestedLegacyTab = searchParams.get("tab");
  const isLegacyRoute = searchParams.get("legacy") === "1";

  useEffect(() => {
    const routeTab = ROUTE_TO_TAB.get(pathname);

    if (routeTab) {
      setActiveTab(routeTab);
      return;
    }

    if (
      pathname === "/dashboard/advogado" &&
      isLegacyRoute &&
      requestedLegacyTab
    ) {
      setActiveTab(requestedLegacyTab);
    }
  }, [isLegacyRoute, pathname, requestedLegacyTab, setActiveTab]);

  useEffect(() => {
    if (pathname !== "/dashboard/advogado") return;

    const targetRoute = LEGACY_TAB_ROUTES.get(activeTab);
    if (targetRoute) router.replace(targetRoute);
  }, [activeTab, pathname, router]);

  return null;
}
