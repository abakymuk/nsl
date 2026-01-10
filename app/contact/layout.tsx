import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | New Stream Logistics",
  description:
    "Have a question? Need assistance? Contact New Stream Logistics for reliable LA/LB drayage services.",
  openGraph: {
    title: "Contact Us | New Stream Logistics",
    description:
      "Have a question? Need assistance? Contact New Stream Logistics for reliable LA/LB drayage services.",
    type: "website",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
