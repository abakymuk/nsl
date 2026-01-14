import type { Metadata } from "next";
import { Inter, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { LocalBusinessSchema, ServiceSchema } from "@/components/structured-data";
import { PhoneBanner } from "@/components/phone-banner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: {
    default: "New Stream Logistics | Reliable LA/LB Drayage",
    template: "%s | New Stream Logistics",
  },
  description:
    "Reliable LA/LB Drayage — Without Guesswork. Clear pricing. Real tracking. Straightforward communication. Licensed, insured, and fully compliant.",
  keywords: [
    "drayage",
    "LA drayage",
    "Long Beach drayage",
    "container transportation",
    "intermodal",
    "port logistics",
    "LA/LB ports",
    "container delivery",
    "pre-pull",
    "yard storage",
  ],
  authors: [{ name: "New Stream Logistics" }],
  creator: "New Stream Logistics",
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "New Stream Logistics | Reliable LA/LB Drayage",
    description:
      "Reliable LA/LB Drayage — Without Guesswork. Clear pricing. Real tracking. Straightforward communication.",
    siteName: "New Stream Logistics",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <LocalBusinessSchema />
        <ServiceSchema />
      </head>
      <body className={`${inter.variable} ${dmSans.variable} ${jetbrainsMono.variable} antialiased`}>
        <div className="flex min-h-screen flex-col">
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
        <PhoneBanner />
      </body>
    </html>
  );
}
