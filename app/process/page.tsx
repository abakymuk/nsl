import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, Calendar, AlertTriangle, XCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Our Process | New Stream Logistics",
  description:
    "How we plan, work with LFD, handle problems, and when we decline work. Process over promises.",
  openGraph: {
    title: "Our Process | New Stream Logistics",
    description:
      "How we plan, work with LFD, handle problems, and when we decline work. Process over promises.",
    type: "website",
  },
};

const processes = [
  {
    id: "planning",
    title: "How We Plan",
    icon: ClipboardList,
    description: [
      "Every quote request is reviewed by a real dispatcher, not automated systems.",
      "We assess feasibility based on terminal availability, yard capacity, and equipment requirements.",
      "We confirm realistic timelines before committing — no false promises.",
      "Pre-coordination with terminals to understand gate schedules and potential congestion.",
      "Equipment planning to ensure the right truck and chassis are available when needed.",
      "Route planning that accounts for traffic patterns and delivery location accessibility.",
    ],
  },
  {
    id: "lfd",
    title: "How We Work with LFD",
    icon: Calendar,
    description: [
      "LFD (Last Free Day) dates are tracked proactively from quote request through delivery.",
      "We prioritize containers approaching LFD to avoid demurrage charges.",
      "Pre-pull strategy: We'll pull containers early if there's a risk of LFD issues.",
      "Clear communication about LFD status and urgency throughout the process.",
      "If LFD is tight, we're honest about feasibility and timeline — no surprises.",
      "Flexible scheduling to accommodate urgent LFD situations when possible.",
    ],
  },
  {
    id: "problems",
    title: "What We Do When Problems Arise",
    icon: AlertTriangle,
    description: [
      "Immediate notification: You hear from us first, not when you call asking for updates.",
      "Direct escalation: We work directly with terminals, customs, and other parties to resolve issues quickly.",
      "Transparent communication: Clear explanation of the problem, what's being done, and expected timeline.",
      "Multiple solutions: We present options and recommend the best path forward.",
      "Proactive problem-solving: We anticipate issues and address them before they become critical.",
      "Documentation support: We help resolve documentation issues that may be causing delays.",
      "When we can't fix it quickly, we're honest about it and provide alternatives.",
    ],
  },
  {
    id: "decline",
    title: "When We Decline Work",
    icon: XCircle,
    description: [
      "We decline when we can't meet your timeline realistically — better to be honest upfront.",
      "We decline when we don't have the right equipment or expertise for specialized requirements.",
      "We decline when terminal or yard capacity constraints make the job unreliable.",
      "We decline when documentation or compliance issues pose too much risk.",
      "We decline when we can't provide the level of service you expect — integrity matters.",
      "When we decline, we explain why and suggest alternatives when possible.",
      "This builds trust — we're not going to take your money and fail.",
    ],
    emphasis: "This honesty builds more trust than taking jobs we can't deliver on.",
  },
];

export default function ProcessPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Our Process
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          This page makes more sales than pricing. Process over promises.
        </p>
      </div>

      <div className="mx-auto mt-16 space-y-12">
        {processes.map((process, index) => {
          const Icon = process.icon;
          return (
            <Card key={process.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                        {index + 1}
                      </span>
                      <CardTitle className="text-2xl">{process.title}</CardTitle>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {process.description.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-start gap-3">
                      <span className="mt-1 text-primary/60">•</span>
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
                {process.emphasis && (
                  <div className="mt-6 rounded-lg bg-primary/5 border border-primary/20 p-4">
                    <p className="font-medium text-foreground">{process.emphasis}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mx-auto mt-16 max-w-3xl rounded-lg bg-muted/50 p-8 text-center">
        <p className="text-lg font-medium text-foreground">
          This emphasizes process over chaos. You can trust us because we have systems, not luck.
        </p>
      </div>
    </div>
  );
}
