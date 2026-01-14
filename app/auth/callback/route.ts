import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { checkInitialSuperAdmin, getPostLoginRedirect } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next"); // Only use explicit next if provided

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore errors in server component
            }
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Check if this user should be auto-promoted to super admin (from env var)
      if (data.user.email) {
        await checkInitialSuperAdmin(data.user.email);
      }

      // If explicit redirect was requested, use it
      if (next) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      // Otherwise, route based on user role (DB-driven)
      const destination = await getPostLoginRedirect(data.user.id);
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/sign-in?error=Could not authenticate user`);
}
