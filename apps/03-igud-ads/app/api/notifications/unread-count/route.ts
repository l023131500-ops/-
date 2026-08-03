import { NextResponse } from "next/server";
import { createSupabaseService, createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user?.email) return NextResponse.json({ count: 0 });

  const svc = createSupabaseService();
  const { count } = await svc
    .from("ad_notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_email", user.email)
    .eq("is_read", false);

  return NextResponse.json({ count: count || 0 });
}
