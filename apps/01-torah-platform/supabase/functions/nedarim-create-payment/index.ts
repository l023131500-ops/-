// ============================================================================
// Edge Function: nedarim-create-payment
// יצירת בקשת תשלום דרך iframe של Nedarim Plus
// תיעוד: https://matara.pro/nedarimplus/ApiDocumentation.html?v=17
// ============================================================================
//
// חשוב: ApiValid (ציבורי) משמש להפעלת ה-iframe ויצירת עסקת ביט בלבד.
// ApiPassword (סודי) משמש לפעולות API מתקדמות (ביטולים, דוחות) — לא כאן.
//
// קלט (POST JSON):
// {
//   tenant_id: "uuid",
//   amount: 50,
//   currency: "ILS",
//   payment_type: "Ragil" | "HK" | "CreateToken",
//   payments: 1,
//   recurring_months: 12,
//   donor: { name, phone, email, address, city, id_number },
//   purpose: "donation" | "shop_order" | "subscription",
//   donation_id: "uuid",
//   order_id: "uuid",
//   dedication: { type, for_name, father_name, message },
//   campaign_id: "uuid",
//   day_of_month: 5    // ל-HK
// }
//
// פלט:
// {
//   ok: true,
//   iframe_url: "https://matara.pro/nedarimplus/iframe?...",
//   transaction_id: "...",
//   nedarim_request_id: "..."
// }
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const NEDARIM_IFRAME_BASE = "https://matara.pro/nedarimplus/iframe";

interface PaymentRequest {
  tenant_id: string;
  amount: number;
  currency?: string;
  payment_type?: "Ragil" | "HK" | "CreateToken";
  payments?: number;
  recurring_months?: number;
  day_of_month?: number;
  donor: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    city?: string;
    id_number?: string;
  };
  purpose: "donation" | "shop_order" | "subscription";
  donation_id?: string;
  order_id?: string;
  campaign_id?: string;
  dedication?: {
    type?: string;
    for_name?: string;
    father_name?: string;
    message?: string;
  };
  comment?: string;
  group_name?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body: PaymentRequest = await req.json();

    if (!body.tenant_id || !body.amount || !body.donor?.name || !body.donor?.phone) {
      return json({ ok: false, error: "missing required fields (tenant_id, amount, donor.name, donor.phone)" }, 400);
    }

    // 1a. This endpoint is public (anon, no auth check) by design -- both callers
    // (DonationPage.tsx, Checkout.tsx) insert their own donation/order row with
    // payment_status="pending" and call this immediately after with the exact
    // same tenant_id/amount. Without this check, anyone could pass ANY existing
    // donation_id/order_id (their own from a prior visit, or one seen in a URL)
    // together with a smaller amount of their choosing, pay that lesser amount
    // via the real Nedarim iframe, and have nedarim-webhook mark the referenced
    // donation/order "paid" in full once its ourPaymentId comes back. Requiring
    // the referenced row to belong to this tenant, still be pending, and match
    // the requested amount closes that without touching the legitimate flow,
    // which always satisfies all three already.
    if (body.donation_id) {
      const { data: don } = await supabase
        .from("donations")
        .select("id, tenant_id, amount_ils, payment_status")
        .eq("id", body.donation_id)
        .maybeSingle();
      if (!don || don.tenant_id !== body.tenant_id || don.payment_status !== "pending" || Number(don.amount_ils) !== Number(body.amount)) {
        return json({ ok: false, error: "donation_id does not match a pending donation for this tenant/amount" }, 400);
      }
    }
    if (body.order_id) {
      const { data: ord } = await supabase
        .from("orders")
        .select("id, tenant_id, total_ils, payment_status")
        .eq("id", body.order_id)
        .maybeSingle();
      if (!ord || ord.tenant_id !== body.tenant_id || ord.payment_status !== "pending" || Number(ord.total_ils) !== Number(body.amount)) {
        return json({ ok: false, error: "order_id does not match a pending order for this tenant/amount" }, 400);
      }
    }

    // 1. Load tenant's Nedarim config (mosad_id + api_valid per tenant)
    const { data: cfg } = await supabase
      .from("nedarim_configs")
      .select("mosad_id, api_valid, charge_message, success_redirect_url, failure_redirect_url")
      .eq("tenant_id", body.tenant_id)
      .maybeSingle();

    // Both MosadId and ApiValid come from nedarim_configs row (per-tenant config in DB).
    // env vars only used as last-resort fallback.
    const mosadId: string | undefined = cfg?.mosad_id || Deno.env.get("NEDARIM_MOSAD_ID") || undefined;
    const apiValid: string | undefined = cfg?.api_valid || Deno.env.get("NEDARIM_API_VALID") || undefined;

    if (!mosadId) {
      return json({ ok: false, error: "Nedarim Mosad ID not configured for this tenant. Set nedarim_configs.mosad_id for the tenant." }, 400);
    }
    if (!apiValid) {
      return json({ ok: false, error: "Nedarim ApiValid (iframe activation token) not configured. Set nedarim_configs.api_valid for the tenant." }, 400);
    }

    // 2. Site origin for callback URLs
    const siteOrigin = req.headers.get("origin") || Deno.env.get("SITE_URL") || "https://torah-platform.com";

    // OurPaymentId — מזהה ייחודי לקישור מול ה-IPN webhook
    const ourPaymentId = crypto.randomUUID();

    // 3. Determine payment type
    const paymentType = body.payment_type === "HK" ? "HK"
      : body.payment_type === "CreateToken" ? "CreateToken"
      : "Ragil";

    // For HK (standing order), Tashlumim = number of charge months (empty = unlimited)
    // For Ragil (single/installments), Tashlumim = number of installments
    const tashlumim = paymentType === "HK"
      ? (body.recurring_months ? String(body.recurring_months) : "")
      : String(body.payments || 1);

    // 4. Build iframe URL params per Nedarim Plus docs
    const nameParts = body.donor.name.trim().split(/\s+/);
    const firstName = nameParts[0] || body.donor.name;
    const lastName = nameParts.slice(1).join(" ") || "";

    const params = new URLSearchParams({
      Mosad: mosadId,
      ApiValid: apiValid,
      PaymentType: paymentType,
      Currency: body.currency === "USD" ? "2" : "1", // 1=ILS, 2=USD
      Zeout: body.donor.id_number || "",
      FirstName: firstName.substring(0, 50),
      LastName: lastName.substring(0, 50),
      Street: (body.donor.address || "").substring(0, 100),
      City: (body.donor.city || "").substring(0, 100),
      Phone: body.donor.phone.replace(/\D/g, ""), // ספרות בלבד
      Mail: (body.donor.email || "").substring(0, 50),
      Amount: String(body.amount),
      Tashlumim: tashlumim,
      Groupe: (body.group_name || body.campaign_id || "").substring(0, 100),
      Comment: (body.comment || `${body.purpose} - ${body.dedication?.message || ""}`).substring(0, 300).trim(),
      // Param1/Param2 — נשמרים ב-callback אך לא בבסיס הנתונים של נדרים
      Param1: body.purpose,
      Param2: ourPaymentId,
      CallBack: `${Deno.env.get("SUPABASE_URL")}/functions/v1/nedarim-webhook`,
      CallBackMailError: cfg?.charge_message ? "" : "",
    });

    // Day of month (HK only)
    if (paymentType === "HK" && body.day_of_month) {
      params.set("Day", String(body.day_of_month));
    }

    const iframe_url = `${NEDARIM_IFRAME_BASE}?${params.toString()}`;

    // 5. Log to nedarim_transactions
    const { data: txn } = await supabase
      .from("nedarim_transactions")
      .insert({
        tenant_id: body.tenant_id,
        status: "pending",
        amount_ils: body.amount,
        raw_request: {
          request: body,
          params: Object.fromEntries(params),
          our_payment_id: ourPaymentId,
        },
        donation_id: body.donation_id || null,
        order_id: body.order_id || null,
      })
      .select("id")
      .maybeSingle();

    // Link donation/order to our_payment_id so the webhook can find it
    if (body.donation_id) {
      await supabase.from("donations").update({
        payment_method: "nedarim_plus",
        payment_meta: { our_payment_id: ourPaymentId, mosad_id: mosadId },
      }).eq("id", body.donation_id);
    }
    if (body.order_id) {
      await supabase.from("orders").update({
        payment_meta: { our_payment_id: ourPaymentId, mosad_id: mosadId },
      }).eq("id", body.order_id);
    }

    return json({
      ok: true,
      iframe_url,
      transaction_id: txn?.id,
      nedarim_request_id: ourPaymentId,
      mosad_id: mosadId,
    });
  } catch (err) {
    console.error("[nedarim-create-payment] error:", err);
    return json({ ok: false, error: String(err) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}
