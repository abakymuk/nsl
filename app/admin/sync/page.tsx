"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface SyncResult {
  success: boolean;
  message: string;
  total?: number;
  synced?: number;
  skipped?: number;
  errors?: number;
  errorDetails?: string[];
  hasMore?: boolean;
  nextSkip?: number;
}

export default function SyncPage() {
  const [syncing, setSyncing] = useState(false);
  const [results, setResults] = useState<SyncResult[]>([]);
  const [totalSynced, setTotalSynced] = useState(0);
  const [totalErrors, setTotalErrors] = useState(0);

  const runSync = async (skip = 0, isInitial = true) => {
    if (isInitial) {
      setSyncing(true);
      setResults([]);
      setTotalSynced(0);
      setTotalErrors(0);
    }

    try {
      const response = await fetch("/api/admin/sync-portpro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          limit: 50,
          skip,
        }),
      });

      const result: SyncResult = await response.json();
      setResults((prev) => [...prev, result]);

      if (result.synced !== undefined) {
        setTotalSynced((prev) => prev + result.synced!);
      }
      if (result.errors !== undefined) {
        setTotalErrors((prev) => prev + result.errors!);
      }

      // If there are more loads, continue fetching
      if (result.hasMore && result.nextSkip) {
        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await runSync(result.nextSkip, false);
      } else {
        setSyncing(false);
      }
    } catch (error) {
      console.error("Sync error:", error);
      setResults((prev) => [
        ...prev,
        {
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        },
      ]);
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">PortPro Sync</h1>
        <p className="text-muted-foreground">
          Import all existing loads from PortPro TMS into the database
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sync Loads from PortPro</CardTitle>
          <CardDescription>
            This will fetch all loads from PortPro and create/update shipments in the database.
            Existing shipments will be updated with the latest data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() => runSync()}
            disabled={syncing}
            size="lg"
            className="w-full sm:w-auto"
          >
            {syncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Start Sync
              </>
            )}
          </Button>

          {(totalSynced > 0 || totalErrors > 0) && (
            <div className="flex gap-4 mt-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">{totalSynced} synced</span>
              </div>
              {totalErrors > 0 && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">{totalErrors} errors</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sync Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    result.success
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className="font-medium">{result.message}</span>
                  </div>
                  {result.success && (
                    <div className="text-sm text-gray-600 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>Total: {result.total}</div>
                      <div>Synced: {result.synced}</div>
                      <div>Skipped: {result.skipped}</div>
                      <div>Errors: {result.errors}</div>
                    </div>
                  )}
                  {result.errorDetails && result.errorDetails.length > 0 && (
                    <div className="mt-2 text-sm text-red-600">
                      <div className="font-medium">Error details:</div>
                      <ul className="list-disc list-inside">
                        {result.errorDetails.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>How it works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>1. Fetches all loads from PortPro API in batches of 50</p>
          <p>2. For each load with a container number:</p>
          <ul className="list-disc list-inside ml-4">
            <li>If a shipment already exists (by reference or container number), it updates it</li>
            <li>Otherwise, creates a new shipment</li>
          </ul>
          <p>3. Loads without container numbers are skipped</p>
          <p>4. After sync, all shipments will be trackable on the tracking page</p>
        </CardContent>
      </Card>
    </div>
  );
}
