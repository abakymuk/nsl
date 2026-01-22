import type { Metadata } from "next";
import {
  HeroSection,
  TrustBarSection,
  YardSection,
  ServicesSection,
  ProcessSection,
  OnboardingSection,
  TrustSection,
  TestimonialsSection,
  CTASection,
} from "@/components/sections";

export const metadata: Metadata = {
  title: "New Stream Logistics | LA/LB Drayage with Secure Private Yard",
  description:
    "LA/LB drayage with secure private yard. 50+ container capacity, 24/7 security, 12+ terminals served. Real quotes in 15 min from real dispatchers.",
  openGraph: {
    title: "New Stream Logistics | LA/LB Drayage with Secure Private Yard",
    description:
      "Avoid demurrage with our private secured yard. Real quotes in 15 min from real dispatchers — no bots, no fake pricing.",
    type: "website",
  },
};

export default function Home() {
  return (
    <div className="flex flex-col">
      <HeroSection />
      <TrustBarSection />
      <YardSection />
      <ServicesSection />
      <ProcessSection />
      <OnboardingSection />
      <TrustSection />
      <TestimonialsSection />
      <CTASection />
    </div>
  );
}
