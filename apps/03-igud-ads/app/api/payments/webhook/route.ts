import { NextResponse } from "next/server";
import { verifyWebhookIp } from "@/lib/nedarim";
import { createSupabaseService } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

function randomCode(len: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// Nedarim Plus posts to this URL after successful payment.
// Allowed IP: 18.194.219.73 (same as torah-platform).
export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "";
  if (!verifyWebhookIp(ip)) {
    return NextResponse.json({ error: "Unauthorized IP" }, { status: 403 });
  }

  let body: Record<string, unknown> = {};
  try {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) body = await req.json();
    else {
      const form = await req.formData();
      form.forEach((v, k) => { body[k] = v; });
    }
  } catch {}

  // Param1 contains project_id (we set it on create)
  const project_id = (body.Param1 || body.param1) as string | undefined;
  const amount = Number(body.Amount || body.amount || 0);
  const rawStatus = (body.Status || body.status || "") as string;
  const paymentSucceeded = rawStatus.toUpperCase() === "OK";
  const paymentStatus = paymentSucceeded ? "succeeded" : "failed";
  const transactionId = (body.TransactionId || body.OrderId || "") as string;
  const payerName = (body.FullName || body.full_name || body.Name || "") as string;
  const payerPhone = (body.Phone || body.phone || "") as string;

  if (!project_id) {
    return NextResponse.json({ ok: true, note: "no project_id" });
  }

  const svc = createSupabaseService();

  // Idempotency: payment gateways commonly retry a webhook call for the same
  // transaction (timeout, no fast 200 received, etc). Without this check a
  // retry would insert a second ad_payments row and grant a second free-
  // designs coupon for the same real-world payment. Only guards when Nedarim
  // sends a transaction id (it always does on a real payment); matches the
  // column already written below (provider_transaction_id).
  if (transactionId) {
    const { data: existingPayment } = await svc
      .from("ad_payments")
      .select("id")
      .eq("provider_transaction_id", transactionId)
      .eq("project_id", project_id)
      .maybeSingle();
    if (existingPayment) {
      return NextResponse.json({ ok: true, note: "duplicate transaction, already processed" });
    }
  }

  // 1. Read current project parameters, then MERGE (not overwrite)
  const { data: project } = await svc
    .from("ad_projects")
    .select("parameters, customer_data")
    .eq("id", project_id)
    .maybeSingle();

  const existingParams = (project?.parameters as Record<string, unknown>) || {};
  const mergedParams = {
    ...existingParams,
    _payment: { amount, status: paymentStatus, raw: body },
    _paid_at: new Date().toISOString(),
  };

  await svc
    .from("ad_projects")
    .update({ parameters: mergedParams })
    .eq("id", project_id);

  // 2. INSERT row in ad_payments
  const customerData = (project?.customer_data as Record<string, unknown>) || {};
  const userEmail = (customerData.email || body.Email || body.email || "") as string;

  const { data: paymentRow } = await svc
    .from("ad_payments")
    .insert({
      project_id,
      user_email: userEmail || null,
      amount,
      currency: "ILS",
      status: paymentStatus,
      provider: "nedarim_plus",
      provider_transaction_id: transactionId || null,
      description: `תשלום עבור פרויקט ${project_id}`,
      payer_name: payerName || null,
      payer_phone: payerPhone || null,
      raw_webhook: body,
    })
    .select("id")
    .single();

  let couponGrantedId: string | null = null;

  // 3. If payment succeeded — grant a new coupon
  if (paymentSucceeded && userEmail) {
    // Get grant amount from settings
    const { data: setting } = await svc
      .from("ad_app_settings")
      .select("value")
      .eq("key", "payment.coupon_grants_designs")
      .maybeSingle();
    const maxDesigns =
      typeof setting?.value === "number"
        ? setting.value
        : typeof setting?.value === "object" && setting?.value !== null
        ? Number((setting.value as Record<string, unknown>).v ?? 5)
        : 5;

    const couponCode = `PAID-${randomCode(8)}`;
    const { data: newCoupon } = await svc
      .from("ad_coupons")
      .insert({
        code: couponCode,
        max_designs: maxDesigns,
        used_designs: 0,
        is_active: true,
        owner_email: userEmail,
      })
      .select("id")
      .single();

    if (newCoupon?.id && paymentRow?.id) {
      couponGrantedId = newCoupon.id;
      await svc
        .from("ad_payments")
        .update({ coupon_granted_id: couponGrantedId })
        .eq("id", paymentRow.id);
    }
  }

  // 4. INSERT notification in ad_notifications
  if (userEmail) {
    const notifTitle = paymentSucceeded ? "התשלום התקבל" : "התשלום נכשל";
    const notifBody = paymentSucceeded
      ? `תשלום של ₪${amount} התקבל בהצלחה.${couponGrantedId ? " קיבלת קופון עיצובים חדש!" : ""}`
      : `תשלום של ₪${amount} נכשל. אנא נסה שנית.`;

    await svc.from("ad_notifications").insert({
      user_email: userEmail,
      type: paymentSucceeded ? "payment_success" : "payment_failed",
      title: notifTitle,
      body: notifBody,
      link_url: `/result/${project_id}`,
      is_read: false,
      metadata: { project_id, amount, transaction_id: transactionId },
    });

    // 5. Fire-and-forget email notification
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    fetch(`${baseUrl}/api/notifications/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: userEmail,
        subject: notifTitle,
        body: notifBody,
        type: paymentSucceeded ? "payment_success" : "payment_failed",
      }),
    }).catch(() => {});
  }

  // 6. Audit log
  await audit("payment_received", "ad_project", project_id, userEmail || null, {
    amount,
    status: paymentStatus,
    transaction_id: transactionId,
  });

  return NextResponse.json({ ok: true });
}
