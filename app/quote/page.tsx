import type { Metadata } from "next";
import QuotePageClient from "./quote-page-client";

export const metadata: Metadata = {
  title: "Request a Quote | New Stream Logistics",
  description:
    "Request a quote for reliable LA/LB drayage services. Get a ballpark price instantly, or receive a real quote from a dispatcher within 1–2 business hours.",
  openGraph: {
    title: "Request a Quote | New Stream Logistics",
    description:
      "Request a quote for reliable LA/LB drayage services. Get a ballpark price instantly, or receive a real quote from a dispatcher within 1–2 business hours.",
    type: "website",
  },
};

export default function QuotePage() {
  return <QuotePageClient />;
}
