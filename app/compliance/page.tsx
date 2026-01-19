import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Shield, Anchor, Award, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Compliance & Insurance | New Stream Logistics",
  description:
    "Insurance COI, UIIA compliance, authorized ports, and safety focus. Compliance is not a checkbox — it's part of our operations.",
  openGraph: {
    title: "Compliance & Insurance | New Stream Logistics",
    description:
      "Insurance COI, UIIA compliance, authorized ports, and safety focus. Compliance is not a checkbox — it's part of our operations.",
    type: "website",
  },
};

const complianceItems = [
  {
    id: "insurance",
    title: "Insurance COI",
    icon: Shield,
    description: "Comprehensive insurance coverage for all operations.",
    details: [
      "General Liability Insurance: Full coverage for all operations",
      "Cargo Insurance: Protection for container contents during transport",
      "Auto Liability Insurance: Coverage for all commercial vehicles",
      "Workers' Compensation: Full compliance with state requirements",
      "Certificate of Insurance (COI) available upon request",
      "Regular policy reviews to ensure adequate coverage",
    ],
  },
  {
    id: "uiia",
    title: "UIIA",
    icon: FileText,
    description: "Uniform Intermodal Interchange Agreement compliance.",
    details: [
      "Full UIIA signatory: Standardized interchange agreement with rail carriers",
      "Compliant equipment maintenance and inspection protocols",
      "Proper documentation and tracking of all intermodal moves",
      "Adherence to UIIA equipment condition requirements",
      "Regular audits to ensure ongoing compliance",
      "Trained staff on UIIA requirements and procedures",
    ],
  },
  {
    id: "ports",
    title: "Ports Served",
    icon: Anchor,
    description: "Authorized to operate at major LA/LB port terminals.",
    details: [
      "Port of Los Angeles: All major terminals",
      "Port of Long Beach: All major terminals",
      "Established relationships with terminal operators",
      "Gate access and appointment systems properly maintained",
      "Port security compliance (TWIC card holders)",
      "Knowledge of terminal-specific requirements and procedures",
    ],
    ports: [
      "YTI (Yusen Terminals)",
      "PCT (Pacific Container Terminal)",
      "Pier A",
      "FMS (Fenix Marine Services)",
      "LBCT (Long Beach Container Terminal)",
      "WBCT (West Basin Container Terminal)",
      "TraPac",
      "Everport Terminal Services",
      "TTI (Total Terminals International)",
      "Shippers Transport",
      "APM Terminals",
      "ITS",
    ],
  },
  {
    id: "safety",
    title: "Safety Focus",
    icon: Award,
    description: "Safety is not a checkbox — it's part of our operations.",
    details: [
      "DOT-registered motor carrier with safety rating",
      "Regular driver safety training and certification",
      "Vehicle maintenance schedules and inspections",
      "Safety policies and procedures documented and enforced",
      "Incident reporting and investigation protocols",
      "Continuous improvement in safety practices",
      "Drug and alcohol testing program compliance",
      "Hours of Service (HOS) compliance monitoring",
    ],
  },
];

export default function CompliancePage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Compliance & Insurance
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          Compliance is not a checkbox. It&apos;s part of our operations.
        </p>
        <div className="mt-8 rounded-lg bg-primary/5 border border-primary/20 p-6">
          <p className="font-medium text-foreground">
            Americans love order. We provide it.
          </p>
        </div>
      </div>

      <div className="mx-auto mt-16 grid gap-8 lg:grid-cols-2">
        {complianceItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-2xl">{item.title}</CardTitle>
                    <CardDescription className="mt-2 text-base">
                      {item.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Details
                  </h3>
                  <ul className="space-y-2">
                    {item.details.map((detail, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {item.ports && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Authorized Terminals
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {item.ports.map((port) => (
                        <Badge key={port} variant="secondary">
                          {port}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mx-auto mt-16 max-w-3xl rounded-lg bg-muted/50 p-8 text-center">
        <h2 className="text-2xl font-bold">Request Documentation</h2>
        <p className="mt-4 text-muted-foreground">
          Need a Certificate of Insurance (COI) or other compliance documentation?
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Contact us at{" "}
          <a
            href="mailto:info@newstreamlogistics.com"
            className="text-primary hover:underline"
          >
            info@newstreamlogistics.com
          </a>{" "}
          or use our{" "}
          <a href="/contact" className="text-primary hover:underline">
            contact form
          </a>
          .
        </p>
      </div>
    </div>
  );
}
