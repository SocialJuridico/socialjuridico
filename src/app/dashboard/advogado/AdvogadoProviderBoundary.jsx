"use client";

import { usePathname } from "next/navigation";

import { DashboardProvider } from "./DashboardContext";
import { LawyerSessionProvider } from "./LawyerSessionContext";
import DashboardRouteSync from "./components/DashboardRouteSync";

const LIGHTWEIGHT_ROUTES = [
  "/dashboard/advogado/oportunidade",
  "/dashboard/advogado/indiqueganhe",
  "/dashboard/advogado/mensagens",
  "/dashboard/advogado/declareiinteresse",
];

export default function AdvogadoProviderBoundary({ children }) {
  const pathname = usePathname();
  const usesLightweightSession = LIGHTWEIGHT_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (usesLightweightSession) {
    return <LawyerSessionProvider>{children}</LawyerSessionProvider>;
  }

  return (
    <DashboardProvider>
      <DashboardRouteSync />
      {children}
    </DashboardProvider>
  );
}
