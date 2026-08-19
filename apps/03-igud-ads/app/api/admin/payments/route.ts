import { NextResponse } from "next/server";
import { createSupabaseService } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const svc = createSupabaseService();
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  let query = svc
    .from("ad_payments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (status && status !== "all") query = query.eq("status", status);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Monthly stats
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { data: monthly } = await svc
    .from("ad_payments")
    .select("amount, status")
    .gte("created_at", monthStart)
    .eq("status", "succeeded");

  const monthlyRevenue = (monthly || []).reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const monthlyCount = (monthly || []).length;
  const monthlyAvg = monthlyCount > 0 ? monthlyRevenue / monthlyCount : 0;

  return NextResponse.json({
    payments: data || [],
    stats: {
      monthly_revenue: monthlyRevenue,
      monthly_count: monthlyCount,
      monthly_avg: monthlyAvg,
    },
  });
}
