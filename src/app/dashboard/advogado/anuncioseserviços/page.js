import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Anúncios e Serviços | Social Jurídico",
  robots: { index: false, follow: false },
};

export default function LegacyLawyerServiceAdsPage() {
  redirect("/dashboard/advogado/anuncioseservicos");
}
