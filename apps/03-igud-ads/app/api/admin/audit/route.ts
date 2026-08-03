import { NextResponse } from "next/server";
import { createSupabaseService } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const svc = createSupabaseService();
  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const entity = url.searchParams.get("entity_type");
  const actor = url.searchParams.get("actor");
  const limit = Number(url.searchParams.get("limit") || 200);

  let q = svc
    .from("ad_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Math.min(limit, 1000));

  if (action) q = q.eq("action", action);
  if (entity) q = q.eq("entity_type", entity);
  if (actor) q = q.eq("actor_email", actor);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message, logs: [] }, { status: 500 });

  return NextResponse.json({ logs: data || [] });
}
