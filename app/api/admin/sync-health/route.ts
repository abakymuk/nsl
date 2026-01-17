/**
 * Sync Health API Endpoint
 * Returns sync metrics for the health dashboard
 */

import { NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/auth";
import { getSyncMetrics } from "@/lib/sync-monitoring";

export async function GET() {
  // Check admin authorization
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const metrics = await getSyncMetrics();
    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Failed to get sync metrics:", error);
    return NextResponse.json(
      { error: "Failed to get metrics" },
      { status: 500 }
    );
  }
}
