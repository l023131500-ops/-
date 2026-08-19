import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createSupabaseService } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/admin";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          try { cookieStore.set({ name, value, ...options }); } catch {}
        },
        remove(name: string, options: CookieOptions) {
          try { cookieStore.set({ name, value: "", ...options }); } catch {}
        },
      },
    }
  );

  const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

  if (sessionError || !sessionData?.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const user = sessionData.user;

  // Ensure user exists in ad_users table
  const svc = createSupabaseService();
  const { data: existing } = await svc
    .from("ad_users")
    .select("id, role, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    // Create a customer row
    await svc.from("ad_users").insert({
      user_id: user.id,
      email: user.email || "",
      display_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      role: "customer",
      is_active: true,
    });
    return NextResponse.redirect(`${origin}/`);
  }

  // Existing user — check active
  if (!existing.is_active) {
    return NextResponse.redirect(`${origin}/login?error=account_disabled`);
  }

  // Redirect admins to /admin, customers to /
  const adminRoles = ["super_admin", "admin"];
  if (adminRoles.includes(existing.role)) {
    return NextResponse.redirect(`${origin}/admin`);
  }

  return NextResponse.redirect(`${origin}${next === "/admin" ? "/" : next}`);
}
