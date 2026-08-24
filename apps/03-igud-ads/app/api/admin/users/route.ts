import { NextResponse } from "next/server";
import { createSupabaseService } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireSuperAdmin();
  if (guard) return guard;

  const svc = createSupabaseService();
  const { data, error } = await svc
    .from("ad_users")
    .select("*, ad_coupons(code)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data || []);
}

export async function POST(req: Request) {
  const guard = await requireSuperAdmin();
  if (guard) return guard;

  const body = await req.json();
  const { email, display_name, role, coupon_id, is_active, notes } = body;

  if (!email) return NextResponse.json({ error: "אימייל חובה" }, { status: 400 });

  const svc = createSupabaseService();

  // Check if auth user exists by email - create invite if not.
  // listUsers() paginates (default 50/page), so page through until found or exhausted -
  // otherwise emails on page 2+ are missed and createUser() below fails with "already registered".
  let existing: { id: string } | undefined;
  for (let page = 1; !existing; page++) {
    const { data: authUser } = await svc.auth.admin.listUsers({ page, perPage: 1000 });
    existing = authUser?.users?.find((u) => u.email === email);
    if (!authUser?.users || authUser.users.length < 1000) break;
  }

  let userId: string;
  if (existing) {
    userId = existing.id;
  } else {
    // Create a new auth user with a temp password
    const { data: newUser, error: createErr } = await svc.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { display_name: display_name || email },
    });
    if (createErr || !newUser?.user) {
      return NextResponse.json({ error: createErr?.message || "שגיאה ביצירת משתמש" }, { status: 500 });
    }
    userId = newUser.user.id;
  }

  // Insert or upsert ad_users row
  const { data, error } = await svc
    .from("ad_users")
    .upsert({
      user_id: userId,
      email,
      display_name: display_name || null,
      role: role || "customer",
      coupon_id: coupon_id || null,
      is_active: is_active ?? true,
      notes: notes || null,
    }, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
