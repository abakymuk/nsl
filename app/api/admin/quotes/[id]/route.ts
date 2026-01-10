import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_EMAILS = [
  "vladimirovelyan@gmail.com",
  "admin@newstream-logistics.com",
];

async function isAdmin() {
  const { userId } = await auth();
  if (!userId) return false;

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress;
  return email && ADMIN_EMAILS.includes(email);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, quoted_price } = body;

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (status) {
      updateData.status = status;
    }

    if (quoted_price !== undefined) {
      updateData.quoted_price = quoted_price;
    }

    const { data, error } = await supabase
      .from("quotes")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating quote:", error);
      return NextResponse.json(
        { error: "Failed to update quote" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, quote: data });
  } catch (error) {
    console.error("Error in PATCH /api/admin/quotes/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const { data, error } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching quote:", error);
      return NextResponse.json(
        { error: "Quote not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ quote: data });
  } catch (error) {
    console.error("Error in GET /api/admin/quotes/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
