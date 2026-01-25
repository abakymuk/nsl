import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Warehouse, Truck, AlertCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Our Services | New Stream Logistics",
  description:
    "Import drayage, pre-pull & yard storage, local delivery, and problem container handling. Focused on what breaks most often — and how we fix it.",
  openGraph: {
    title: "Our Services | New Stream Logistics",
    description:
      "Import drayage, pre-pull & yard storage, local delivery, and problem container handling. Focused on what breaks most often — and how we fix it.",
    type: "website",
  },
};

const services = [
  {
    id: "import-drayage",
    title: "Import Drayage",
    icon: Package,
    description: "Reliable drayage services from LA/LB ports to your destination.",
    whatItIs: "Transportation of containers from port terminals to your facility or designated location.",
    whenToUse: "When you need containers moved from LA/LB ports to your warehouse, distribution center, or final destination.",
    typicalRisks: [
      "Delays at terminal gates during peak hours",
      "Demurrage charges from tight LFDs",
      "Container holds due to documentation issues",
      "Yard congestion causing scheduling conflicts",
    ],
    howWeHandle: [
      "Pre-coordination with terminal to minimize gate wait times",
      "Proactive communication about LFD status and urgency",
      "Working directly with customs and terminal to resolve holds quickly",
      "Flexible scheduling to work around yard congestion",
      "Real-time tracking and status updates",
    ],
  },
  {
    id: "pre-pull-storage",
    title: "Pre-Pull & Yard Storage",
    icon: Warehouse,
    description: "Secure yard storage and pre-pull services to avoid demurrage.",
    whatItIs: "Early container retrieval from terminal and temporary storage in our secured yard facility.",
    whenToUse: "When you want to avoid demurrage charges, need staging space, or require flexibility in delivery scheduling.",
    typicalRisks: [
      "Demurrage charges if containers stay too long at terminal",
      "Lost or misplaced containers in yard",
      "Unauthorized access to containers",
      "Additional storage fees if not planned properly",
    ],
    howWeHandle: [
      "Proactive monitoring of LFD dates to pre-pull before charges accrue",
      "Organized yard management system with container tracking",
      "Secured facility with controlled access",
      "Transparent storage fee structure with no hidden costs",
      "Clear communication about storage duration and options",
    ],
  },
  {
    id: "local-delivery",
    title: "Local Delivery",
    icon: Truck,
    description: "Timely local delivery with full transparency throughout the process.",
    whatItIs: "Final-mile delivery of containers from yard to your facility within the local LA/LB area.",
    whenToUse: "When containers are staged in yard and ready for final delivery to your location.",
    typicalRisks: [
      "Delivery delays due to traffic or scheduling conflicts",
      "Access issues at delivery location (narrow streets, low clearance)",
      "Coordination problems with receiving staff",
      "Equipment availability at delivery site",
    ],
    howWeHandle: [
      "Pre-delivery site surveys to identify access challenges",
      "Flexible scheduling to accommodate your receiving hours",
      "Direct communication with dispatcher for real-time updates",
      "Equipment planning based on delivery location requirements",
      "Delivery confirmation with documentation",
    ],
  },
  {
    id: "problem-containers",
    title: "Problem Containers",
    icon: AlertCircle,
    description: "Specialized handling for holds, tight LFDs, and other urgent situations.",
    whatItIs: "Expert handling of containers with special circumstances: customs holds, tight LFDs, oversized loads, or other urgent requirements.",
    whenToUse: "When you have containers with holds, approaching LFD deadlines, or other time-sensitive issues requiring immediate attention.",
    typicalRisks: [
      "Containers on hold causing delays and storage charges",
      "LFD approaching with no clear resolution timeline",
      "Oversized or overweight containers requiring special handling",
      "Documentation issues preventing container release",
      "Urgent delivery requirements with limited time",
    ],
    howWeHandle: [
      "Direct relationships with terminal and customs to expedite holds",
      "Priority handling for tight LFD situations",
      "Specialized equipment and expertise for oversized/overweight containers",
      "Documentation support to resolve release issues quickly",
      "Urgent response protocol for time-critical situations",
      "We're honest about when we can't help - this builds trust",
    ],
  },
];

export default function ServicesPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Our Services
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          Focused on what breaks most often — and how we fix it.
        </p>
      </div>

      <div className="mx-auto mt-16 space-y-16">
        {services.map((service) => {
          const Icon = service.icon;
          return (
            <Card key={service.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-2xl">{service.title}</CardTitle>
                    <CardDescription className="mt-2 text-base">
                      {service.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold">What This Is</h3>
                  <p className="mt-2 text-muted-foreground">{service.whatItIs}</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold">When to Use This</h3>
                  <p className="mt-2 text-muted-foreground">{service.whenToUse}</p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <h3 className="mb-4 text-lg font-semibold text-destructive/80">
                      Typical Risks
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {service.typicalRisks.map((risk, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="mt-1 text-destructive/60">•</span>
                          <span>{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="mb-4 text-lg font-semibold text-primary">
                      How We Handle This
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {service.howWeHandle.map((solution, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="mt-1 text-primary/60">✓</span>
                          <span>{solution}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mx-auto mt-16 max-w-3xl rounded-lg bg-muted/50 p-8 text-center">
        <p className="text-lg font-medium text-foreground">
          This creates the image of a process-driven company, not &quot;truck &amp; pray.&quot;
        </p>
      </div>
    </div>
  );
}
