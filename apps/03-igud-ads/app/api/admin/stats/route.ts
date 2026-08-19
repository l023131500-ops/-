import { NextResponse } from "next/server";
import { createSupabaseService } from "@/lib/supabase/server";
import { createTranscribeService } from "@/lib/supabase/transcribe-server";
import { requireAdmin } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const svc = createSupabaseService();
  const tsvc = createTranscribeService();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    { count: total },
    { count: ready },
    { count: gen },
    { count: err },
    { count: couponsActive },
    { count: usersTotal },
    { data: monthlyPayments },
    { count: transcriptsMonth },
  ] = await Promise.all([
    svc.from("ad_projects").select("*", { count: "exact", head: true }),
    svc.from("ad_projects").select("*", { count: "exact", head: true }).eq("status", "ready"),
    svc.from("ad_projects").select("*", { count: "exact", head: true }).eq("status", "generating"),
    svc.from("ad_projects").select("*", { count: "exact", head: true }).eq("status", "error"),
    svc.from("ad_coupons").select("*", { count: "exact", head: true }).eq("is_active", true),
    svc.from("ad_users").select("*", { count: "exact", head: true }).eq("is_active", true),
    svc
      .from("ad_payments")
      .select("amount")
      .eq("status", "succeeded")
      .gte("created_at", monthStart),
    tsvc
      .from("uploads")
      .select("*", { count: "exact", head: true })
      .gte("created_at", monthStart),
  ]);

  const monthlyRevenue = (monthlyPayments || []).reduce(
    (s, r: { amount: number }) => s + (Number(r.amount) || 0),
    0
  );

  return NextResponse.json({
    projects_total: total ?? 0,
    projects_ready: ready ?? 0,
    projects_generating: gen ?? 0,
    projects_error: err ?? 0,
    coupons_active: couponsActive ?? 0,
    users_total: usersTotal ?? 0,
    monthly_revenue: monthlyRevenue,
    transcripts_month: transcriptsMonth ?? 0,
  });
}
