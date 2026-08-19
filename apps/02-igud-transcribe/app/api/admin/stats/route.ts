import { NextResponse } from "next/server";
import { createSupabaseService } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = createSupabaseService();
  const [uploadsRes, jobsRes, couponsRes] = await Promise.all([
    sb.from("uploads").select("id, status"),
    sb.from("jobs").select("id, status"),
    sb.from("coupon_codes").select("id, is_active"),
  ]);
  const uploads = uploadsRes.data || [];
  const jobs = jobsRes.data || [];
  const coupons = couponsRes.data || [];

  const countStatus = (arr: any[], status: string) => arr.filter((x) => x.status === status).length;

  return NextResponse.json({
    uploads_total: uploads.length,
    uploads_pending: countStatus(uploads, "uploaded") + countStatus(uploads, "pending"),
    uploads_running: countStatus(uploads, "processing") + countStatus(uploads, "running"),
    uploads_done: countStatus(uploads, "done"),
    uploads_error: countStatus(uploads, "error"),
    coupons_active: coupons.filter((c) => c.is_active).length,
    jobs_pending: countStatus(jobs, "pending"),
  });
}
