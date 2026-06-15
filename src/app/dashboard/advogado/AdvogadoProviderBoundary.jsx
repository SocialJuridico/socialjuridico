"use client";

import PlatformTutorialHost from "@/components/Tutorials/PlatformTutorialHost";
import PesquisaSatisfacaoPopup from "@/components/PesquisaSatisfacaoPopup/PesquisaSatisfacaoPopup";

import { LawyerSessionProvider } from "./LawyerSessionContext";

export default function AdvogadoProviderBoundary({ children }) {
  return (
    <LawyerSessionProvider>
      {children}
      <PesquisaSatisfacaoPopup />
      <PlatformTutorialHost />
    </LawyerSessionProvider>
  );
}
