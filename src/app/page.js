export const revalidate = 300;

import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Differences from "@/components/Differences";
import HowItWorks from "@/components/HowItWorks";
import Community from "@/components/Community";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import CTA from "@/components/CTA";
import MobileNav from "@/components/MobileNav";

export default function Home() {
  return (
    <>
      <Header />
      <Hero />
      <Features />
      <Differences />
      <HowItWorks />
      <Community />
      <Testimonials />
      <FAQ />
      <CTA />
      <MobileNav />
    </>
  );
}
