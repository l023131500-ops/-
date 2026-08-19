import { NextResponse } from "next/server";
import { createSupabaseService } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v).replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}

export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const svc = createSupabaseService();
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  let q = svc.from("ad_payments").select("*").order("created_at", { ascending: false }).limit(5000);
  if (status) q = q.eq("status", status);
  if (from) q = q.gte("created_at", from);
  if (to) q = q.lte("created_at", to);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const headers = [
    "id", "created_at", "project_id", "user_email", "payer_name", "payer_phone",
    "amount", "currency", "status", "provider", "provider_transaction_id",
    "description", "coupon_granted_id",
  ];

  const rows = (data || []).map((p: Record<string, unknown>) =>
    headers.map((h) => csvEscape(p[h])).join(",")
  );

  // BOM for Excel + Hebrew
  const csv = "\ufeff" + headers.join(",") + "\n" + rows.join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payments-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  });
}
