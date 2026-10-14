import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, MapPin, Clock } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Contact Us
          </h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Have a question? Need assistance? We&apos;re here to help.
          </p>
        </div>

        <Card className="mt-8 sm:mt-10">
          <CardHeader>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2">
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>
                  Reach us through any of these channels.
                </CardDescription>
              </div>
              <Link href="/quote" className="inline-flex h-11 shrink-0 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Get Quote</Link>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-8">
            <div className="flex min-w-0 items-start gap-3">
              <div className="shrink-0 rounded-lg bg-primary/10 p-2">
                <Mail className="size-5 text-primary" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold">Email</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  <a
                    href="mailto:info@newstreamlogistics.com"
                    className="break-words text-primary hover:underline"
                  >
                    info@newstreamlogistics.com
                  </a>
                </p>
              </div>
            </div>

            <div className="flex min-w-0 items-start gap-3">
              <div className="shrink-0 rounded-lg bg-primary/10 p-2">
                <Phone className="size-5 text-primary" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold">Phone</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  <a
                    href="tel:+18885330302"
                    className="break-words text-primary hover:underline"
                  >
                    (888) 533-0302
                  </a>
                </p>
              </div>
            </div>

            <div className="flex min-w-0 items-start gap-3">
              <div className="shrink-0 rounded-lg bg-primary/10 p-2">
                <MapPin className="size-5 text-primary" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold">Location</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  18501 South Main Street<br />
                  Gardena, CA 90248
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Serving LA/LB port terminals and surrounding areas
                </p>
              </div>
            </div>

            <div className="flex min-w-0 items-start gap-3">
              <div className="shrink-0 rounded-lg bg-primary/10 p-2">
                <Clock className="size-5 text-primary" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold">Business Hours</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Monday - Friday: 7:00 AM - 5:00 PM PST
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Saturday - Sunday: Closed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
