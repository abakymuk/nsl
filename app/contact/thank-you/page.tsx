import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export default function ContactThankYouPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-3xl">Thank You!</CardTitle>
            <CardDescription className="text-base">
              Your message has been sent successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg bg-muted/50 p-6 text-center">
              <p className="text-lg font-medium text-foreground">
                We&apos;ll get back to you as soon as possible.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">What happens next?</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• We&apos;ll review your message</li>
                <li>• A team member will respond ASAP</li>
                <li>• For urgent matters, call us at <a href="tel:+18885330302" className="text-primary hover:underline">(888) 533-0302</a></li>
              </ul>
            </div>

            <div className="flex flex-col gap-4 pt-4 sm:flex-row">
              <Button asChild className="flex-1">
                <Link href="/quote">Request a Quote</Link>
              </Button>
              <Button variant="outline" asChild className="flex-1">
                <Link href="/">Back to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
