import { NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseService } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sb = createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const { id, all } = await req.json() as { id?: string; all?: boolean };
  const svc = createSupabaseService();

  if (all) {
    await svc
      .from("ad_notifications")
      .update({ is_read: true })
      .eq("user_email", user.email)
      .eq("is_read", false);
  } else if (id) {
    await svc
      .from("ad_notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("user_email", user.email);
  }

  return NextResponse.json({ ok: true });
}
