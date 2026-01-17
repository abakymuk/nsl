/**
 * Dead Letter Queue API Endpoint
 * Manages failed webhooks in the DLQ
 */

import { NextRequest, NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/auth";
import {
  getDeadLetterItems,
  getDeadLetterStats,
  removeFromDeadLetterQueue,
} from "@/lib/webhook-dlq";

// GET - List all DLQ items
export async function GET() {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [items, stats] = await Promise.all([
      getDeadLetterItems(100),
      getDeadLetterStats(),
    ]);

    return NextResponse.json({
      items,
      stats,
    });
  } catch (error) {
    console.error("Failed to get DLQ items:", error);
    return NextResponse.json({ error: "Failed to get DLQ" }, { status: 500 });
  }
}

// DELETE - Remove all items from DLQ (clear)
export async function DELETE(request: NextRequest) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await getDeadLetterItems();
    let removed = 0;

    for (const item of items) {
      const success = await removeFromDeadLetterQueue(item.id);
      if (success) removed++;
    }

    return NextResponse.json({ success: true, removed });
  } catch (error) {
    console.error("Failed to clear DLQ:", error);
    return NextResponse.json({ error: "Failed to clear DLQ" }, { status: 500 });
  }
}
