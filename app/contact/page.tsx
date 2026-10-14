import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, MapPin, Clock } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Contact Us
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Have a question? Need assistance? We&apos;re here to help.
          </p>
        </div>

        <div className="mx-auto mt-16 grid gap-8 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Get Quote</CardTitle></CardHeader>
            <CardContent>
              <Link href="/quote" className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground">Get Quote</Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>
                Reach us through any of these channels.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Email</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <a
                      href="mailto:info@newstreamlogistics.com"
                      className="text-primary hover:underline"
                    >
                      info@newstreamlogistics.com
                    </a>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Phone className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Phone</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <a
                      href="tel:+18885330302"
                      className="text-primary hover:underline"
                    >
                      (888) 533-0302
                    </a>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <div>
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

              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <div>
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
    </div>
  );
}
