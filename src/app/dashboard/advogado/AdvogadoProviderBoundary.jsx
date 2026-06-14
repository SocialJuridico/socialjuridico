"use client";

import PlatformTutorialHost from "@/components/Tutorials/PlatformTutorialHost";

import { LawyerSessionProvider } from "./LawyerSessionContext";

export default function AdvogadoProviderBoundary({ children }) {
  return (
    <LawyerSessionProvider>
      {children}
      <PlatformTutorialHost />
    </LawyerSessionProvider>
  );
}
