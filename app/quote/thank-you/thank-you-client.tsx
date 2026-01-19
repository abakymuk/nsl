"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle2,
  MessageCircle,
  Copy,
  Check,
  Phone,
  Clock,
  AlertTriangle,
  ArrowRight,
  Zap,
} from "lucide-react";
import { showNewMessage } from "@intercom/messenger-js-sdk";
import { useState, useEffect } from "react";
import { REQUEST_TYPES } from "@/lib/validations/quote";
import { IntercomEvents } from "@/lib/intercom";

export function ThankYouClient() {
  const searchParams = useSearchParams();
  const referenceNumber = searchParams.get("ref");
  const containerNumber = searchParams.get("container");
  const requestType = searchParams.get("requestType") || "standard";
  const isUrgent = searchParams.get("urgent") === "true";
  const [copied, setCopied] = useState(false);

  // Track successful submission
  useEffect(() => {
    // Track quote submission success event
    try {
      IntercomEvents.quoteSubmitted({
        container: containerNumber || "not_provided",
        terminal: "from_form",
        zip: "from_form",
        containerType: "from_form",
      });
    } catch {
      // Intercom not loaded
    }
  }, [containerNumber]);

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
        ? `Hi! I just submitted request ${referenceNumber}${containerNumber ? ` for container ${containerNumber}` : ""}. I have a question.`
        : `Hi! I just submitted a quote request${containerNumber ? ` for container ${containerNumber}` : ""}. I have a question.`;
      showNewMessage(message);
    } catch {
      window.location.href = "/contact";
    }
  };

  // Get request type label
  const requestTypeLabel =
    REQUEST_TYPES.find((r) => r.value === requestType)?.label || "Standard drayage";

  // Determine if this is a priority request type
  const isPriorityRequest =
    isUrgent || ["urgent_lfd", "rolled", "hold_released"].includes(requestType);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Card className="overflow-hidden border-2">
          {/* Priority Badge for Urgent Requests */}
          {isPriorityRequest && (
            <div className="bg-amber-500 text-white px-4 py-2 text-center text-sm font-semibold flex items-center justify-center gap-2">
              <Zap className="h-4 w-4" />
              Priority Request - We&apos;re on it!
            </div>
          )}

          <CardHeader className="text-center pb-4">
            <div
              className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
                isPriorityRequest ? "bg-amber-500/10" : "bg-green-500/10"
              }`}
            >
              <CheckCircle2
                className={`h-8 w-8 ${
                  isPriorityRequest ? "text-amber-500" : "text-green-500"
                }`}
              />
            </div>
            <CardTitle className="text-3xl">Request Received!</CardTitle>
            <CardDescription className="text-base">
              {isPriorityRequest
                ? "A dispatcher is reviewing your request now."
                : "A real dispatcher will review your request shortly."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Reference Number */}
            {referenceNumber && (
              <div className="rounded-xl bg-muted/50 p-4 text-center border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Your Reference Number
                </p>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono text-xl font-bold text-foreground">
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

            {/* Request Type Summary */}
            <div className="rounded-xl bg-secondary/50 p-4 border">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Request Type</span>
                <span
                  className={`text-sm font-semibold ${
                    isPriorityRequest ? "text-amber-600 dark:text-amber-400" : "text-foreground"
                  }`}
                >
                  {requestTypeLabel}
                </span>
              </div>
              {containerNumber && (
                <div className="flex items-center justify-between mt-2 pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Container</span>
                  <span className="text-sm font-mono font-semibold text-foreground">
                    {containerNumber}
                  </span>
                </div>
              )}
            </div>

            {/* Response Time Expectation */}
            <div
              className={`rounded-xl p-4 text-center ${
                isPriorityRequest
                  ? "bg-amber-500/10 border border-amber-500/20"
                  : "bg-green-500/10 border border-green-500/20"
              }`}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock
                  className={`h-5 w-5 ${
                    isPriorityRequest ? "text-amber-500" : "text-green-500"
                  }`}
                />
                <span
                  className={`font-semibold ${
                    isPriorityRequest
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-green-700 dark:text-green-400"
                  }`}
                >
                  {isPriorityRequest ? "15-30 minute response" : "Response within 1-2 hours"}
                </span>
              </div>
              <p
                className={`text-sm ${
                  isPriorityRequest
                    ? "text-amber-700/80 dark:text-amber-400/80"
                    : "text-green-700/80 dark:text-green-400/80"
                }`}
              >
                {isPriorityRequest
                  ? "During business hours (Mon-Fri 6am-6pm PT). For after-hours emergencies, call us directly."
                  : "During business hours (Mon-Fri 6am-6pm PT)."}
              </p>
            </div>

            {/* Urgent Call CTA */}
            {isPriorityRequest && (
              <a
                href="tel:+18885330302"
                className="flex items-center justify-center gap-3 w-full py-4 px-4 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition-colors"
              >
                <Phone className="h-5 w-5" />
                Can&apos;t Wait? Call (888) 533-0302
              </a>
            )}

            {/* What happens next */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-primary" />
                What happens next?
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    1
                  </div>
                  <p className="text-sm text-muted-foreground">
                    A dispatcher reviews your request and checks availability
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    2
                  </div>
                  <p className="text-sm text-muted-foreground">
                    We&apos;ll call or text you with pricing and timeline
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    3
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Once confirmed, track your container in real-time
                  </p>
                </div>
              </div>
            </div>

            {/* Standard Call CTA for non-urgent */}
            {!isPriorityRequest && (
              <div className="rounded-xl border border-border bg-secondary/30 p-4">
                <p className="text-sm text-muted-foreground mb-3 text-center">
                  Need faster help? Give us a call.
                </p>
                <a
                  href="tel:+18885330302"
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl border-2 border-green-500/30 text-green-700 dark:text-green-400 font-semibold hover:bg-green-500/10 transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  (888) 533-0302
                </a>
              </div>
            )}

            {/* Chat CTA */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm text-muted-foreground mb-3 text-center">
                Have a quick question? Chat with us.
              </p>
              <Button
                onClick={handleChatClick}
                variant="outline"
                className="w-full border-primary/50 hover:bg-primary/10"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Chat About This Request
              </Button>
            </div>

            {/* Navigation */}
            <div className="flex flex-col gap-3 pt-4 sm:flex-row">
              <Button asChild className="flex-1">
                <Link href="/track">Track a Container</Link>
              </Button>
              <Button variant="outline" asChild className="flex-1">
                <Link href="/">Back to Home</Link>
              </Button>
            </div>

            {/* Trust footer */}
            <p className="text-xs text-center text-muted-foreground pt-4 border-t">
              New Stream Logistics - LA/LB Port Drayage Specialists
              <br />
              USDOT #4403165 | MC #1728721
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
