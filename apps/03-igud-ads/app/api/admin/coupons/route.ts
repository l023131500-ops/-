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
  const maxDesigns = body.max_designs === undefined || body.max_designs === null ? 3 : Number(body.max_designs);
  if (!Number.isFinite(maxDesigns) || !Number.isInteger(maxDesigns) || maxDesigns < 1) {
    return NextResponse.json({ error: "max_designs must be a positive integer" }, { status: 400 });
  }
  const svc = createSupabaseService();
  const code = body.code?.trim() || (await generateCouponCode());
  const { data, error } = await svc.from("ad_coupons").insert({
    code,
    max_designs: maxDesigns,
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
  for (const field of ["max_designs", "used_designs"] as const) {
    if (rest[field] === undefined) continue;
    const n = Number(rest[field]);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
      return NextResponse.json({ error: `${field} must be a non-negative integer` }, { status: 400 });
    }
    rest[field] = n;
  }
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
