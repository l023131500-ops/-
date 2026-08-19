import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "l023131500@gmail.com";

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  // הגנת אזורי admin בלבד
  if (!url.pathname.startsWith("/admin") && !url.pathname.startsWith("/api/admin")) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
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
        }
      }
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase();
  if (!email || email !== ADMIN_EMAIL.toLowerCase()) {
    if (url.pathname.startsWith("/api/")) {
      return new NextResponse(
        JSON.stringify({ error: "forbidden", message: "אין הרשאת אדמין" }),
        { status: 403, headers: { "content-type": "application/json" } }
      );
    }
    // `new URL("/login", req.url)` resolves against the origin and drops the
    // basePath, so under more30.com/tamlul this redirected out of the app and
    // onto the marketing site. nextUrl.clone() carries the basePath with it.
    const loginUrl = url.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", url.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"]
};
