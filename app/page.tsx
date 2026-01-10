import type { Metadata } from "next";
import {
  HeroSection,
  ServicesSection,
  ProcessSection,
  TrustSection,
  TestimonialsSection,
  CTASection,
} from "@/components/sections";

export const metadata: Metadata = {
  title: "New Stream Logistics | Reliable LA/LB Drayage — Without Guesswork",
  description:
    "Reliable LA/LB Drayage — Without Guesswork. Clear pricing. Real tracking. Straightforward communication. Licensed, insured, and fully compliant.",
  openGraph: {
    title: "New Stream Logistics | Reliable LA/LB Drayage",
    description:
      "Clear pricing. Real tracking. Straightforward communication. Licensed, insured, and fully compliant.",
    type: "website",
  },
};

export default function Home() {
  return (
    <div className="flex flex-col">
      <HeroSection />
      <ServicesSection />
      <ProcessSection />
      <TrustSection />
      <TestimonialsSection />
      <CTASection />
    </div>
  );
}
