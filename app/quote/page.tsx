import type { Metadata } from "next";
import QuotePageClient from "./quote-page-client";

export const metadata: Metadata = {
  title: "Request a Quote | New Stream Logistics",
  description:
    "Request a quote for reliable LA/LB drayage services. Fast response from a real dispatcher with accurate pricing.",
  openGraph: {
    title: "Request a Quote | New Stream Logistics",
    description:
      "Request a quote for reliable LA/LB drayage services. Fast response from a real dispatcher with accurate pricing.",
    type: "website",
  },
};

export default function QuotePage() {
  return <QuotePageClient />;
}
