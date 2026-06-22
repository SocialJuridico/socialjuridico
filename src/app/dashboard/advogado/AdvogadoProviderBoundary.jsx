"use client";

import PlatformTutorialHost from "@/components/Tutorials/PlatformTutorialHost";
import PesquisaSatisfacaoPopup from "@/components/PesquisaSatisfacaoPopup/PesquisaSatisfacaoPopup";
import PromoNovidadesModal from "@/components/PromoNovidadesModal/PromoNovidadesModal";

import { LawyerSessionProvider } from "./LawyerSessionContext";

export default function AdvogadoProviderBoundary({ children }) {
  return (
    <LawyerSessionProvider>
      {children}
      <PesquisaSatisfacaoPopup />
      <PlatformTutorialHost />
      <PromoNovidadesModal />
    </LawyerSessionProvider>
  );
}
