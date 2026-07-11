export const revalidate = 300;

export const metadata = {
  title: "Encontre um Advogado para o seu Caso",
  description:
    "Publique seu caso gratuitamente e receba manifestações de interesse de advogados cadastrados no Social Jurídico.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Encontre um Advogado para o seu Caso",
    description:
      "Publique seu caso gratuitamente e converse com advogados cadastrados na plataforma.",
    url: "/",
    type: "website",
  },
  twitter: {
    title: "Encontre um Advogado para o seu Caso",
    description: "Publique seu caso gratuitamente no Social Jurídico.",
  },
};

import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Differences from "@/components/Differences";
import SecurityStandards from "@/components/SecurityStandards";
import HowItWorks from "@/components/HowItWorks";
import Community from "@/components/Community";
import FAQ from "@/components/FAQ";
import CTA from "@/components/CTA";
import MobileNav from "@/components/MobileNav";
import PartnershipPopup from "@/components/PartnershipPopup/PartnershipPopup";

export default function Home() {
  return (
    <>
      <PartnershipPopup />
      <Header />
      <Hero />
      <Features />
      <Differences />
      <SecurityStandards />
      <HowItWorks />
      <Community />
      <FAQ />
      <CTA />
      <MobileNav />
    </>
  );
}
