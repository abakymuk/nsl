import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient, getUser } from "@/lib/supabase/server";

/**
 * GET /api/notifications/preferences
 *
 * Get notification preferences for the current employee
 */
export async function GET() {
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

    // Get preferences
    const { data: preferences, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("employee_id", employee.id)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found (that's ok, we'll return defaults)
      console.error("Error fetching preferences:", error);
      return NextResponse.json(
        { error: "Failed to fetch preferences" },
        { status: 500 }
      );
    }

    // Return preferences or defaults
    return NextResponse.json({
      preferences: preferences || {
        employee_id: employee.id,
        channels: { in_app: true, email: true, slack: true },
        event_settings: {},
        quiet_hours: { enabled: false },
        email_priority_threshold: "high",
      },
    });
  } catch (error) {
    console.error("Error in GET /api/notifications/preferences:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/notifications/preferences
 *
 * Update notification preferences
 */
export async function PUT(request: NextRequest) {
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
    const { channels, event_settings, quiet_hours, email_priority_threshold } = body;

    // Upsert preferences
    const { data, error } = await supabase
      .from("notification_preferences")
      .upsert(
        {
          employee_id: employee.id,
          channels: channels || { in_app: true, email: true, slack: true },
          event_settings: event_settings || {},
          quiet_hours: quiet_hours || { enabled: false },
          email_priority_threshold: email_priority_threshold || "high",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "employee_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("Error updating preferences:", error);
      return NextResponse.json(
        { error: "Failed to update preferences" },
        { status: 500 }
      );
    }

    return NextResponse.json({ preferences: data });
  } catch (error) {
    console.error("Error in PUT /api/notifications/preferences:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
