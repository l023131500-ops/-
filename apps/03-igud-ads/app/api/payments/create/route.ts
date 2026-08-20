import { NextResponse } from "next/server";
import { buildPaymentPayload } from "@/lib/nedarim";
import { audit } from "@/lib/audit";
import { createSupabaseService } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DEFAULT_PRICE_ILS = 50;

// Build a Nedarim Plus iframe payload for upgrading a coupon-less user.
// Body: { description, project_id, payer_name?, payer_phone?, payer_email? }
//
// `amount` is NOT read from the request body: the webhook grants a fixed
// number of designs (ad_app_settings.payment.coupon_grants_designs) on any
// successful payment regardless of how much was paid, so a client-chosen
// `amount` here let anyone pay an arbitrary (e.g. 1 ILS) sum through the real
// Nedarim Plus gateway and receive the full coupon meant for
// ad_app_settings.payment.default_amount (50 ILS) — a real underpayment, not
// a spoofed callback. The price is now looked up server-side instead.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const origin = new URL(req.url).origin;

    const svc = createSupabaseService();
    const { data: priceSetting } = await svc
      .from("ad_app_settings")
      .select("value")
      .eq("key", "payment.default_amount")
      .maybeSingle();
    const amount =
      typeof priceSetting?.value === "number"
        ? priceSetting.value
        : typeof priceSetting?.value === "object" && priceSetting?.value !== null
        ? Number((priceSetting.value as Record<string, unknown>).v ?? DEFAULT_PRICE_ILS)
        : DEFAULT_PRICE_ILS;

    const payload = buildPaymentPayload({
      amount,
      description: body.description || "מודעה לשיעור — איגוד השיעורים",
      payer_name: body.payer_name,
      payer_phone: body.payer_phone,
      payer_email: body.payer_email,
      return_url: `${origin}/result/${body.project_id}`,
      webhook_url: `${origin}/api/payments/webhook`,
      project_id: body.project_id,
    });
    await audit("payment_initiated", "ad_project", body.project_id, body.payer_email || null, {
      amount,
    });
    return NextResponse.json(payload);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
