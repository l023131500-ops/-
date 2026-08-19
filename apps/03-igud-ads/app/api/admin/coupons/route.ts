import { NextResponse } from "next/server";
import { createSupabaseService } from "@/lib/supabase/server";
import { generateCouponCode } from "@/lib/coupon";
import { requireAdmin } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const svc = createSupabaseService();
  const { data } = await svc.from("ad_coupons").select("*").order("created_at", { ascending: false });
  return NextResponse.json(data || []);
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await req.json();
  const svc = createSupabaseService();
  const code = body.code?.trim() || (await generateCouponCode());
  const { data, error } = await svc.from("ad_coupons").insert({
    code,
    max_designs: body.max_designs || 3,
    expires_at: body.expires_at || null,
    note: body.note || null,
    is_active: true,
  }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id, ...rest } = await req.json();
  const svc = createSupabaseService();
  const { data, error } = await svc.from("ad_coupons").update(rest).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  const svc = createSupabaseService();
  const { error } = await svc.from("ad_coupons").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
