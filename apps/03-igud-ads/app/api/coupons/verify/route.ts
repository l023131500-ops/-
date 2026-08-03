import { NextResponse } from "next/server";
import { validateAndConsumeCoupon } from "@/lib/coupon";

export async function POST(req: Request) {
  try {
    const { code } = await req.json();
    if (!code) return NextResponse.json({ ok: false, error: "חסר קוד" }, { status: 400 });
    const r = await validateAndConsumeCoupon(code);
    if (!r.ok) return NextResponse.json({ ok: false, error: r.reason }, { status: 400 });
    return NextResponse.json({
      ok: true,
      coupon: {
        id: r.coupon.id,
        max_designs: r.coupon.max_designs,
        used_designs: r.coupon.used_designs,
        expires_at: r.coupon.expires_at,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
