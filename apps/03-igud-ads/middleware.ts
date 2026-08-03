import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Only protect /admin and /api/admin
  if (
    !req.nextUrl.pathname.startsWith("/admin") &&
    !req.nextUrl.pathname.startsWith("/api/admin")
  ) {
    return res;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return req.cookies.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // `new URL("/login", req.url)` resolves against the origin and throws the
    // basePath away, so under more30.com/modaot the browser was redirected to
    // more30.com/login — out of this app entirely, onto the marketing site.
    // nextUrl.clone() keeps the basePath and re-applies it on serialization.
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Allow hardcoded admin email (legacy support)
  const adminEmail = process.env.ADMIN_EMAIL || "l023131500@gmail.com";
  if (user.email === adminEmail) {
    return res;
  }

  // Check ad_users for admin role — done via service role in API routes
  // At middleware level we only check authentication; role checks happen in API routes
  // For /admin UI pages, we pass through all authenticated users (pages do their own checks)
  // For /api/admin routes, the requireAdmin/requireSuperAdmin helpers do the role check
  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
