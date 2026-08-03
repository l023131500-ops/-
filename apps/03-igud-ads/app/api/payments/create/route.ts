import { NextResponse } from "next/server";
import { buildPaymentPayload } from "@/lib/nedarim";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Build a Nedarim Plus iframe payload for upgrading a coupon-less user.
// Body: { amount, description, project_id, payer_name?, payer_phone?, payer_email? }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const origin = new URL(req.url).origin;
    const payload = buildPaymentPayload({
      amount: Number(body.amount),
      description: body.description || "מודעה לשיעור — איגוד השיעורים",
      payer_name: body.payer_name,
      payer_phone: body.payer_phone,
      payer_email: body.payer_email,
      return_url: `${origin}/result/${body.project_id}`,
      webhook_url: `${origin}/api/payments/webhook`,
      project_id: body.project_id,
    });
    await audit("payment_initiated", "ad_project", body.project_id, body.payer_email || null, {
      amount: body.amount,
    });
    return NextResponse.json(payload);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
