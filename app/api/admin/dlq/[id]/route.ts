/**
 * Individual DLQ Item API Endpoint
 * Delete a specific DLQ item
 */

import { NextRequest, NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/auth";
import { removeFromDeadLetterQueue } from "@/lib/webhook-dlq";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const success = await removeFromDeadLetterQueue(id);

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Failed to delete DLQ item:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
