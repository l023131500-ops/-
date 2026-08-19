import { NextResponse } from "next/server";
import { createSupabaseService } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  // Settings are readable by any admin; superadmin required to write
  const svc = createSupabaseService();
  const { data, error } = await svc.from("ad_app_settings").select("*").order("key");
  if (error) {
    // Fallback to old table name if the new one doesn't exist yet
    const { data: data2 } = await svc.from("ad_settings").select("*").order("key");
    return NextResponse.json(data2 || []);
  }
  return NextResponse.json(data || []);
}

export async function PATCH(req: Request) {
  const denied = await requireSuperAdmin();
  if (denied) return denied;

  const body = await req.json();
  const svc = createSupabaseService();

  // Support bulk update: array of {key, value} or single {key, value}
  if (Array.isArray(body)) {
    const rows = body.map((item: { key: string; value: unknown; label?: string }) => ({
      key: item.key,
      value: item.value,
      label: item.label || null,
      updated_at: new Date().toISOString(),
    }));
    const { data, error } = await svc
      .from("ad_app_settings")
      .upsert(rows, { onConflict: "key" })
      .select("*");
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  }

  const { key, value, label } = body as { key: string; value: unknown; label?: string };
  const { data, error } = await svc
    .from("ad_app_settings")
    .upsert(
      { key, value, label: label || null, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    )
    .select("*")
    .single();

  if (error) {
    // Fallback to old table name
    const { data: data2, error: err2 } = await svc
      .from("ad_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" })
      .select("*")
      .single();
    if (err2) return NextResponse.json({ error: err2.message }, { status: 400 });
    return NextResponse.json(data2);
  }
  return NextResponse.json(data);
}
