import { NextResponse } from "next/server";
import { createSupabaseService } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Daily cleanup: deactivate expired coupons, mark stale projects
export async function GET() {
  const svc = createSupabaseService();
  const now = new Date().toISOString();
  const stale = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  await svc.from("ad_coupons")
    .update({ is_active: false })
    .lt("expires_at", now)
    .eq("is_active", true);

  // mark jobs stuck running > 24h as error
  await svc.from("ad_jobs")
    .update({ status: "error", error_message: "Timed out (cleanup)" })
    .eq("status", "running")
    .lt("started_at", stale);

  return NextResponse.json({ ok: true, at: now });
}
