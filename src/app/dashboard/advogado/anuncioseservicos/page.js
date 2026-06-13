import { Suspense } from "react";

import LawyerServiceAdsDashboard from "../anuncioseserviços/components/LawyerServiceAdsDashboard";

export const metadata = {
  title: "Anúncios e Serviços | Social Jurídico",
  description:
    "Encontre prepostos, diligências e parceiros para apoiar sua atuação jurídica.",
};

export default function LawyerServiceAdsPage() {
  return (
    <Suspense fallback={null}>
      <LawyerServiceAdsDashboard />
    </Suspense>
  );
}
