"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import PlatformTutorialHost from "@/components/Tutorials/PlatformTutorialHost";
import { DashboardProvider } from "./DashboardContext";
import { LawyerSessionProvider } from "./LawyerSessionContext";
import DashboardRouteSync from "./components/DashboardRouteSync";
import { usesLawyerSessionProvider } from "./lawyerProviderRoutes";

export default function AdvogadoProviderBoundary({ children }) {
  const pathname = usePathname();
  if (usesLawyerSessionProvider(pathname)) {
    return <LawyerSessionProvider>{children}<PlatformTutorialHost /></LawyerSessionProvider>;
  }
  return <DashboardProvider><Suspense fallback={null}><DashboardRouteSync /></Suspense>{children}<PlatformTutorialHost /></DashboardProvider>;
}
