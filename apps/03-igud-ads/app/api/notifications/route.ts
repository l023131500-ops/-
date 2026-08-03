import { NextResponse } from "next/server";
import { createSupabaseService, createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/notifications - list current user's notifications
export async function GET(req: Request) {
  const sb = createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user?.email) return NextResponse.json({ notifications: [] });

  const url = new URL(req.url);
  const onlyUnread = url.searchParams.get("unread") === "1";

  const svc = createSupabaseService();
  let q = svc
    .from("ad_notifications")
    .select("*")
    .eq("user_email", user.email)
    .order("created_at", { ascending: false })
    .limit(100);
  if (onlyUnread) q = q.eq("is_read", false);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message, notifications: [] }, { status: 500 });

  return NextResponse.json({ notifications: data || [] });
}

// PATCH /api/notifications  body: { id?, mark_all? }
export async function PATCH(req: Request) {
  const sb = createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const svc = createSupabaseService();

  if (body.mark_all) {
    await svc
      .from("ad_notifications")
      .update({ is_read: true })
      .eq("user_email", user.email)
      .eq("is_read", false);
    return NextResponse.json({ ok: true });
  }

  if (body.id) {
    await svc
      .from("ad_notifications")
      .update({ is_read: true })
      .eq("id", body.id)
      .eq("user_email", user.email);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "no id" }, { status: 400 });
}
