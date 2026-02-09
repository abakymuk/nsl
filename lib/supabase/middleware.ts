import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that require authentication
const PROTECTED_ROUTES = ["/dashboard", "/admin"];

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// API paths that receive cross-origin or non-browser requests (webhooks, cron, public form targets)
const CSRF_EXEMPT_PREFIXES = [
  "/api/webhooks/",
  "/api/cron/",
  "/api/qstash/",
  "/api/auth/",
  "/api/health",
];

/**
 * Validate Origin header for cookie-authenticated mutating API requests (CSRF protection).
 * Returns a 403 response if the origin is not allowed, or null if OK.
 */
function checkOriginForMutations(request: NextRequest): NextResponse | null {
  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith("/api/")) return null;
  if (!MUTATING_METHODS.has(request.method)) return null;
  if (CSRF_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const origin = request.headers.get("origin");
  // Allow same-origin requests (no Origin header means same-origin or non-browser)
  if (!origin) return null;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
  const host = request.headers.get("host");
  const allowedOrigins = new Set([
    new URL(siteUrl).origin,
    request.nextUrl.origin,
    // Also allow the Host header origin (handles www vs non-www mismatches)
    ...(host ? [`https://${host}`] : []),
  ]);

  if (!allowedOrigins.has(origin)) {
    console.error(`CSRF: blocked cross-origin ${request.method} to ${pathname} from ${origin}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

export async function updateSession(request: NextRequest) {
  // CSRF: block cross-origin mutating requests to cookie-authenticated APIs
  const csrfBlock = checkOriginForMutations(request);
  if (csrfBlock) return csrfBlock;

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh session and get user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if route requires authentication
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // Redirect to sign-in if accessing protected route without auth
  if (isProtectedRoute && !user) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return supabaseResponse;
}
