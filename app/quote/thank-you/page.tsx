import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export default function ThankYouPage() {
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
              Your quote request has been received successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg bg-muted/50 p-6 text-center">
              <p className="text-lg font-medium text-foreground">
                You&apos;ll hear from a real dispatcher within 1–2 business hours.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">What happens next?</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• A dispatcher will review your request</li>
                <li>• We&apos;ll confirm feasibility and timeline</li>
                <li>• You&apos;ll receive a detailed quote via email or phone</li>
                <li>• Once approved, you can track your container in real-time</li>
              </ul>
            </div>

            <div className="flex flex-col gap-4 pt-4 sm:flex-row">
              <Button asChild className="flex-1">
                <Link href="/track">Track a Container</Link>
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
