import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us | New Stream Logistics",
  description:
    "Trust-first drayage services without the guesswork. Honest communication, process-driven operations, and full compliance.",
  openGraph: {
    title: "About Us | New Stream Logistics",
    description:
      "Trust-first drayage services without the guesswork. Honest communication, process-driven operations, and full compliance.",
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            About New Stream Logistics
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Focused on reliability, transparency, and straightforward communication in LA/LB drayage operations.
          </p>
        </div>

        <div className="mx-auto mt-16 space-y-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Our Mission</CardTitle>
              <CardDescription>
                Trust-first drayage services without the guesswork.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We believe that drayage doesn&apos;t need to be complicated. Our mission is to provide
                reliable, transparent, and straightforward container transportation services that you can
                trust. We focus on what breaks most often in this industry — and we fix it.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Why We Exist</CardTitle>
              <CardDescription>
                We saw a gap — and we filled it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-muted-foreground">
                Too many drayage companies promise the world and deliver chaos. We&apos;re different.
                We&apos;re honest about what we can do, clear about timelines, and transparent about
                the process. No surprises. No broken promises.
              </p>
              <p className="text-muted-foreground">
                We focus on the fundamentals: reliable service, clear communication, and a process-driven
                approach. This isn&apos;t rocket science — it&apos;s good operations.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">What Sets Us Apart</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <strong className="font-semibold">Honest Communication</strong>
                    <p className="text-sm text-muted-foreground">
                      We tell you what we can do — and what we can&apos;t. No false promises.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <strong className="font-semibold">Process-Driven Operations</strong>
                    <p className="text-sm text-muted-foreground">
                      We have systems, not chaos. Process over promises.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <strong className="font-semibold">Problem-Solving Focus</strong>
                    <p className="text-sm text-muted-foreground">
                      We specialize in handling what breaks most often — holds, tight LFDs, urgent deliveries.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <strong className="font-semibold">Real People, Not Automation</strong>
                    <p className="text-sm text-muted-foreground">
                      Every quote is reviewed by a real dispatcher. Every problem gets personal attention.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <strong className="font-semibold">Full Compliance</strong>
                    <p className="text-sm text-muted-foreground">
                      Licensed, insured, and fully compliant. Compliance isn&apos;t a checkbox — it&apos;s part
                      of our operations.
                    </p>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Our Approach</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-muted-foreground">
                We don&apos;t try to be everything to everyone. We focus on what we do best:
                reliable drayage services for the LA/LB market. We&apos;re not a tech platform
                pretending to be a logistics company. We&apos;re a logistics company that uses
                technology to be better at what we do.
              </p>
              <p className="text-muted-foreground">
                This V1 website is a reflection of our values: clear, straightforward, and focused
                on building trust. No flashy promises. Just solid operations.
              </p>
            </CardContent>
          </Card>

          <div className="rounded-lg bg-muted/50 p-8 text-center">
            <h2 className="text-2xl font-bold">Ready to Work Together?</h2>
            <p className="mt-4 text-muted-foreground">
              Experience the difference that honest, process-driven drayage services can make.
            </p>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <a
                href="/quote"
                className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
              >
                Request a Quote
              </a>
              <a
                href="/contact"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-3 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
