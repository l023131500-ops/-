import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*"
};
// כתובת IP של נדרים פלוס לאימות מקור
const NEDARIM_ALLOWED_IPS = new Set([
  "18.194.219.73"
]);
// אם להפעיל אכיפת IP (אפשר לכבות זמנית דרך env var ל-debug)
const ENFORCE_IP_CHECK = (Deno.env.get("NEDARIM_ENFORCE_IP") || "true") === "true";
function getClientIp(req) {
  // Supabase Edge Functions מקבלות את ה-IP דרך headers
  const xff = req.headers.get("x-forwarded-for") || "";
  const realIp = req.headers.get("x-real-ip") || "";
  const cfIp = req.headers.get("cf-connecting-ip") || "";
  // x-forwarded-for עשוי להכיל רשימה — נקח את הראשון
  const fromXff = xff.split(",")[0].trim();
  return fromXff || realIp || cfIp || "";
}
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") return new Response("ok", {
    headers: corsHeaders
  });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const clientIp = getClientIp(req);
    const ipOk = !ENFORCE_IP_CHECK || NEDARIM_ALLOWED_IPS.has(clientIp);
    if (!ipOk) {
      console.warn("[nedarim-webhook] rejected: IP not allowed", clientIp);
      // לוג ל-DB גם כן — עטוף ב-try/catch כי insert לא חושף .catch()
      try {
        await supabase.from("nedarim_transactions").insert({
          status: "rejected_ip",
          amount_ils: 0,
          webhook_payload: {
            rejected_ip: clientIp,
            headers: Object.fromEntries(req.headers.entries())
          },
          error_message: `IP ${clientIp} not in Nedarim Plus allowlist`
        });
      } catch (logErr) {
        console.warn("[nedarim-webhook] failed to log IP rejection:", logErr);
      }
      return new Response(JSON.stringify({
        ok: false,
        error: "forbidden"
      }), {
        status: 403,
        headers: {
          ...corsHeaders,
          "content-type": "application/json"
        }
      });
    }
    // Parse payload — Nedarim sends form-urlencoded or query
    let payload = {};
    const ct = req.headers.get("content-type") || "";
    if (req.method === "GET") {
      const url = new URL(req.url);
      url.searchParams.forEach((v, k)=>payload[k] = v);
    } else if (ct.includes("application/json")) {
      payload = await req.json();
    } else if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
      const form = await req.formData();
      form.forEach((v, k)=>payload[k] = String(v));
    } else {
      // Try query as fallback
      const url = new URL(req.url);
      url.searchParams.forEach((v, k)=>payload[k] = v);
    }
    console.log("[nedarim-webhook] received from", clientIp, ":", JSON.stringify(payload));
    // Map Nedarim fields (per official documentation)
    const transactionId = payload.TransactionId || payload.transaction_id || "";
    const confirmation = payload.Confirmation || payload.ConfirmationCode || "";
    const amount = parseFloat(payload.Amount || payload.amount || "0");
    const transactionType = payload.TransactionType || ""; // רגיל / תשלומים / הו"ק
    const clientName = payload.ClientName || "";
    const zeout = payload.Zeout || "";
    const phone = payload.Phone || "";
    const mail = payload.Mail || "";
    const lastNum = payload.LastNum || "";
    const tokef = payload.Tokef || "";
    const receiptData = payload.ReceiptData || "";
    const receiptDocNum = payload.ReceiptDocNum || "";
    const kevaId = payload.KevaId || "";
    const purpose = payload.Param1 || ""; // donation / shop_order / subscription
    const ourPaymentId = payload.Param2 || "";
    // Nedarim doesn't have explicit Status field — success = Confirmation exists & is non-empty.
    // Status="ERROR" or Message present indicates failure.
    const explicitStatus = (payload.Status || payload.status || "").toUpperCase();
    const errorMessage = payload.Message || payload.message || "";
    const hasConfirmation = !!confirmation && confirmation !== "0";
    let isSuccess;
    if (explicitStatus === "OK" || explicitStatus === "SUCCESS") {
      isSuccess = true;
    } else if (explicitStatus === "ERROR" || explicitStatus === "FAILED") {
      isSuccess = false;
    } else {
      // אין Status מפורש — נחליט לפי קיום Confirmation
      isSuccess = hasConfirmation;
    }
    // 1. Find existing pending transaction by our_payment_id
    let txnId = null;
    let foundTenantId = null;
    let foundDonationId = null;
    let foundOrderId = null;
    if (ourPaymentId) {
      const { data: existing } = await supabase.from("nedarim_transactions").select("id, tenant_id, donation_id, order_id").filter("raw_request->>our_payment_id", "eq", ourPaymentId).order("created_at", {
        ascending: false
      }).limit(1).maybeSingle();
      if (existing?.id) {
        await supabase.from("nedarim_transactions").update({
          transaction_id: transactionId,
          confirmation_code: confirmation,
          status: isSuccess ? "success" : "failed",
          webhook_payload: payload,
          error_message: isSuccess ? null : errorMessage,
          amount_ils: amount || undefined
        }).eq("id", existing.id);
        txnId = existing.id;
        foundTenantId = existing.tenant_id;
        foundDonationId = existing.donation_id;
        foundOrderId = existing.order_id;
      }
    }
    // 2. If no pending found, insert a new transaction row
    if (!txnId) {
      const ins = await supabase.from("nedarim_transactions").insert({
        tenant_id: null,
        transaction_id: transactionId,
        confirmation_code: confirmation,
        status: isSuccess ? "success" : "failed",
        amount_ils: amount,
        webhook_payload: payload,
        error_message: isSuccess ? null : errorMessage
      }).select("id").maybeSingle();
      txnId = ins.data?.id ?? null;
    }
    // 3. Update donation / order
    const refId = foundDonationId || foundOrderId || "";
    if (isSuccess && refId) {
      if (purpose === "donation" || purpose === "subscription" || foundDonationId) {
        await supabase.from("donations").update({
          payment_status: "captured",
          payment_reference: transactionId,
          payment_meta: payload,
          paid_at: new Date().toISOString(),
          receipt_url: receiptData || undefined,
          receipt_number: receiptDocNum || undefined,
          receipt_issued_at: receiptDocNum ? new Date().toISOString() : undefined
        }).eq("id", foundDonationId || refId);
        // Update campaign raised total
        const { data: don } = await supabase.from("donations").select("campaign_id, amount_ils, tenant_id").eq("id", foundDonationId || refId).maybeSingle();
        if (don?.campaign_id) {
          const { data: c } = await supabase.from("donation_campaigns").select("raised_ils").eq("id", don.campaign_id).maybeSingle();
          await supabase.from("donation_campaigns").update({
            raised_ils: (c?.raised_ils || 0) + don.amount_ils
          }).eq("id", don.campaign_id);
        }
      } else if (purpose === "shop_order" || foundOrderId) {
        await supabase.from("orders").update({
          payment_status: "captured",
          status: "paid",
          payment_reference: transactionId,
          payment_meta: payload,
          paid_at: new Date().toISOString()
        }).eq("id", foundOrderId || refId);
      }
    } else if (!isSuccess && refId) {
      // Mark as failed
      const table = purpose === "shop_order" || foundOrderId ? "orders" : "donations";
      await supabase.from(table).update({
        payment_status: "failed",
        payment_meta: payload
      }).eq("id", foundOrderId || foundDonationId || refId);
    }
    // Nedarim Plus expects a 200 response (any body)
    return new Response("OK", {
      headers: {
        ...corsHeaders,
        "content-type": "text/plain"
      }
    });
  } catch (err) {
    console.error("[nedarim-webhook] error:", err);
    return new Response("ERROR: " + String(err), {
      status: 500,
      headers: {
        ...corsHeaders,
        "content-type": "text/plain"
      }
    });
  }
});
