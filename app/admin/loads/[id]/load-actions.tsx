"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink, RefreshCw } from "lucide-react";

interface LoadActionsProps {
  load: {
    id: string;
    status: string;
    tracking_number: string;
    container_number?: string;
    portpro_reference?: string;
  };
}

export function LoadActions({ load }: LoadActionsProps) {
  const [copied, setCopied] = useState(false);
  const [copiedContainer, setCopiedContainer] = useState(false);

  const trackingUrl = typeof window !== "undefined"
    ? `${window.location.origin}/track?number=${load.tracking_number}`
    : `/track?number=${load.tracking_number}`;

  const copyToClipboard = async (text: string, type: "tracking" | "container") => {
    await navigator.clipboard.writeText(text);
    if (type === "tracking") {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setCopiedContainer(true);
      setTimeout(() => setCopiedContainer(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Data Source Notice */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <RefreshCw className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Synced from PortPro
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              This load data is automatically synced from PortPro TMS. To make changes, update the load in PortPro.
            </p>
          </div>
        </div>
      </div>

      {/* Customer Tracking Link */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="font-semibold mb-2">Customer Tracking Link</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Share this link with the customer to track their load
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 p-3 rounded-lg bg-muted text-xs break-all">
            {trackingUrl}
          </code>
          <button
            onClick={() => copyToClipboard(trackingUrl, "tracking")}
            className="shrink-0 p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            title="Copy link"
          >
            {copied ? (
              <Check className="h-4 w-4 text-success" />
            ) : (
              <Copy className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </div>
        <a
          href={trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open tracking page
        </a>
      </div>

      {/* Container Number */}
      {load.container_number && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="font-semibold mb-2">Container Number</h2>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-3 rounded-lg bg-muted font-mono text-sm">
              {load.container_number}
            </code>
            <button
              onClick={() => copyToClipboard(load.container_number!, "container")}
              className="shrink-0 p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
              title="Copy container number"
            >
              {copiedContainer ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* PortPro Reference */}
      {load.portpro_reference && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="font-semibold mb-2">PortPro Reference</h2>
          <code className="block p-3 rounded-lg bg-muted font-mono text-sm">
            {load.portpro_reference}
          </code>
        </div>
      )}
    </div>
  );
}
