import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// טיפול בחזרה מ-Google OAuth (Supabase exchanges code → session cookie)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/admin";
  // basePath ("/tamlul", see next.config.mjs) must be prefixed explicitly —
  // new URL(path, req.url) with a leading "/" resolves against the origin
  // only and drops the basePath, landing on the unrelated root portal app.
  if (!code) return NextResponse.redirect(new URL("/tamlul/login?error=missing_code", req.url));

  const cookieStore = cookies();
  const response = NextResponse.redirect(new URL(`/tamlul${next}`, req.url));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/tamlul/login?error=${encodeURIComponent(error.message)}`, req.url)
    );
  }
  return response;
}
