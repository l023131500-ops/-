import { createSupabaseServer, createSupabaseService } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export type AdUserRole = "super_admin" | "admin" | "customer" | "viewer";

export type AdUser = {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  role: AdUserRole;
  permissions: Record<string, unknown> | null;
  is_active: boolean;
  coupon_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

/** Returns the ad_users row for the current session user, or null. */
export async function getCurrentAdUser(): Promise<AdUser | null> {
  try {
    const sb = createSupabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;

    const svc = createSupabaseService();
    const { data } = await svc
      .from("ad_users")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    return data as AdUser | null;
  } catch {
    return null;
  }
}

/** Returns 403 NextResponse if not super_admin or admin. Returns null if OK. */
export async function requireAdmin(): Promise<NextResponse | null> {
  const adUser = await getCurrentAdUser();
  if (!adUser || !["super_admin", "admin"].includes(adUser.role) || !adUser.is_active) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  return null;
}

/** Returns 403 NextResponse if not super_admin. Returns null if OK. */
export async function requireSuperAdmin(): Promise<NextResponse | null> {
  const adUser = await getCurrentAdUser();
  if (!adUser || adUser.role !== "super_admin" || !adUser.is_active) {
    return NextResponse.json({ error: "אין הרשאה — נדרש מנהל-על" }, { status: 403 });
  }
  return null;
}
