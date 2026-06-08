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
    description:
      "Publique seu caso gratuitamente no Social Jurídico.",
  },
};

import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Differences from "@/components/Differences";
import HowItWorks from "@/components/HowItWorks";
import Community from "@/components/Community";
import FAQ from "@/components/FAQ";
import CTA from "@/components/CTA";
import MobileNav from "@/components/MobileNav";

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Social Jurídico",
  url: "https://www.socialjuridico.com.br",
  logo: "https://www.socialjuridico.com.br/icon.png",
  description:
    "Plataforma digital que facilita o contato entre clientes e advogados cadastrados.",
  sameAs: [
    "https://www.facebook.com/groups/1667675480204134",
  ],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Social Jurídico",
  url: "https://www.socialjuridico.com.br",
  inLanguage: "pt-BR",
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteJsonLd),
        }}
      />

      <Header />
      <Hero />
      <Features />
      <Differences />
      <HowItWorks />
      <Community />
      <FAQ />
      <CTA />
      <MobileNav />
    </>
  );
}
