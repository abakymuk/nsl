import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient, getUser } from "@/lib/supabase/server";

/**
 * GET /api/notifications
 *
 * Get notifications for the current employee
 * Query params:
 * - limit: number of notifications (default 20)
 * - offset: pagination offset (default 0)
 * - unread_only: boolean (default false)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createUntypedAdminClient();

    // Get employee ID for current user
    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (empError || !employee) {
      return NextResponse.json({ error: "Not an employee" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const unreadOnly = searchParams.get("unread_only") === "true";

    let query = supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("recipient_id", employee.id)
      .is("dismissed_at", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.is("read_at", null);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error("Error fetching notifications:", error);
      return NextResponse.json(
        { error: "Failed to fetch notifications" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      notifications: data,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error in GET /api/notifications:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/notifications
 *
 * Update notifications (mark as read, dismiss)
 * Body:
 * - ids: string[] - notification IDs
 * - action: "read" | "dismiss"
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createUntypedAdminClient();

    // Get employee ID for current user
    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (empError || !employee) {
      return NextResponse.json({ error: "Not an employee" }, { status: 403 });
    }

    const body = await request.json();
    const { ids, action } = body as { ids: string[]; action: "read" | "dismiss" };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "IDs required" }, { status: 400 });
    }

    if (!["read", "dismiss"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const updateData =
      action === "read"
        ? { read_at: new Date().toISOString() }
        : { dismissed_at: new Date().toISOString() };

    const { error } = await supabase
      .from("notifications")
      .update(updateData)
      .in("id", ids)
      .eq("recipient_id", employee.id); // Ensure user can only update their own notifications

    if (error) {
      console.error("Error updating notifications:", error);
      return NextResponse.json(
        { error: "Failed to update notifications" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, updated: ids.length });
  } catch (error) {
    console.error("Error in PATCH /api/notifications:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
