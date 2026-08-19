import { NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseService } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const svc = createSupabaseService();
  const { data, error } = await svc
    .from("ad_notifications")
    .select("*")
    .eq("user_email", user.email)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}
