import type { Metadata } from "next";
import QuoteForm from "./quote-form";

export const metadata: Metadata = {
  title: "Request a Quote | New Stream Logistics",
  description:
    "Request a quote for reliable LA/LB drayage services. You'll hear from a real dispatcher within 1–2 business hours.",
  openGraph: {
    title: "Request a Quote | New Stream Logistics",
    description:
      "Request a quote for reliable LA/LB drayage services. You'll hear from a real dispatcher within 1–2 business hours.",
    type: "website",
  },
};

export default function QuotePage() {
  return <QuoteForm />;
}
