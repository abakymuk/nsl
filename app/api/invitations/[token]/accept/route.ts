import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email_confirmed_at) return NextResponse.json({ error: "Verified sign-in required" }, { status: 401 });
  const { token } = await params;
  // The database validates the recipient and consumes the invitation atomically.
  const { data, error } = await supabase.rpc("accept_verified_invitation" as never, { p_token: token } as never);
  if (error) return NextResponse.json({ error: "Invalid, expired or already used invitation" }, { status: 403 });
  const result = data as { isPlatformAdmin: boolean } | null;
  return NextResponse.json({ success: true, isPlatformAdmin: !!result?.isPlatformAdmin,
    redirect: result?.isPlatformAdmin ? "/admin" : "/dashboard" });
}
