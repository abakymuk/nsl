"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, MessageCircle, Copy, Check } from "lucide-react";
import { showNewMessage } from "@intercom/messenger-js-sdk";
import { useState } from "react";

export function ThankYouClient() {
  const searchParams = useSearchParams();
  const referenceNumber = searchParams.get("ref");
  const containerNumber = searchParams.get("container");
  const [copied, setCopied] = useState(false);

  const handleCopyRef = async () => {
    if (referenceNumber) {
      await navigator.clipboard.writeText(referenceNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleChatClick = () => {
    try {
      const message = referenceNumber
        ? `Hi! I just submitted quote ${referenceNumber} for container ${containerNumber}. I have a question about pricing or timeline.`
        : `Hi! I just submitted a quote request for container ${containerNumber}. I have a question about pricing or timeline.`;
      showNewMessage(message);
    } catch {
      // Fallback if Intercom not loaded
      window.location.href = "/contact";
    }
  };

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
            {/* Reference Number */}
            {referenceNumber && (
              <div className="rounded-lg bg-muted/50 p-4 text-center">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Your Reference Number
                </p>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono text-lg font-bold text-foreground">
                    {referenceNumber}
                  </span>
                  <button
                    onClick={handleCopyRef}
                    className="p-1.5 rounded-md hover:bg-muted transition-colors"
                    title="Copy reference number"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
            )}

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

            {/* Chat CTA */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm text-muted-foreground mb-3">
                Have questions while you wait? Chat with us instantly.
              </p>
              <Button
                onClick={handleChatClick}
                variant="outline"
                className="w-full border-primary/50 hover:bg-primary/10"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Chat About This Quote
              </Button>
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
