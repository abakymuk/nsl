import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

// Auth routes - redirect to dashboard if already logged in
const authRoutes = ["/sign-in", "/sign-up", "/magic-link"];

// Protected routes - require authentication
const protectedPrefixes = ["/dashboard", "/admin"];

export async function proxy(request: NextRequest) {
  // Update Supabase session
  const response = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Allow invite pages (they handle auth themselves)
  if (pathname.startsWith("/invite/")) {
    return response;
  }

  // Get the current user for routing decisions
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        // No-op for read-only check
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Handle auth routes (sign-in, sign-up, magic-link)
  if (authRoutes.includes(pathname)) {
    if (user) {
      // User is logged in, redirect away from auth pages
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return response;
  }

  // Handle protected routes
  for (const prefix of protectedPrefixes) {
    if (pathname.startsWith(prefix)) {
      if (!user) {
        // Not authenticated, redirect to sign-in
        const signInUrl = new URL("/sign-in", request.url);
        signInUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(signInUrl);
      }
      // For /admin routes, we rely on the layout to check isSuperAdmin
      // This is because middleware can't easily query the database
      return response;
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (public images folder)
     * - public API routes
     */
    "/((?!_next/static|_next/image|favicon.ico|images|api/track|api/quote|api/contact|api/webhooks|api/health).*)",
  ],
};
