// ============================================================================
// Edge Function: nedarim-admin
// פעולות API מתקדמות מול Nedarim Plus (ביטול עסקה, זיכוי, היסטוריה).
// משתמש ב-ApiPassword (סודי) — לא חושף ללקוח.
// תיעוד: https://matara.pro/nedarimplus/ApiDocumentation.html?v=17
// ============================================================================
//
// קלט (POST JSON):
// {
//   action: "DeletedAllowedTransaction" | "RefundTransaction" | "GetHistoryJson" | "CancelInvoice",
//   tenant_id: "uuid",
//   transaction_id?: "...",      // למחיקה/זיכוי
//   amount?: number,             // לזיכוי חלקי
//   from_date?: "YYYY-MM-DD",    // להיסטוריה
//   to_date?: "YYYY-MM-DD",      // להיסטוריה
//   extra?: object               // פרמטרים נוספים לפי Action
// }
//
// אבטחה: דורש Authorization header עם Supabase auth token של super_admin או tenant_admin.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const NEDARIM_API_BASE = "https://matara.pro/nedarimplus/Reports/Online";

interface AdminRequest {
  action: string;
  tenant_id: string;
  transaction_id?: string;
  amount?: number;
  from_date?: string;
  to_date?: string;
  extra?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Auth — must be authenticated user with admin role
    const authHeader = req.headers.get("Authorization") || "";
    const userToken = authHeader.replace("Bearer ", "");
    if (!userToken) return json({ ok: false, error: "missing auth token" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ ok: false, error: "unauthorized" }, 401);

    const body: AdminRequest = await req.json();
    if (!body.action || !body.tenant_id) {
      return json({ ok: false, error: "missing action or tenant_id" }, 400);
    }

    // Verify caller is super_admin OR tenant_admin for this tenant
    let isSuperRow: boolean | null = null;
    try {
      const r = await userClient.rpc("is_super_admin", { _uid: user.id }).single<boolean>();
      isSuperRow = (r.data as unknown as boolean) ?? null;
    } catch (_e) {
      isSuperRow = null;
    }

    let isAuthorized = isSuperRow === true;
    if (!isAuthorized) {
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role, tenant_id")
        .eq("user_id", user.id)
        .eq("tenant_id", body.tenant_id)
        .in("role", ["super_admin", "tenant_admin"])
        .limit(1)
        .maybeSingle();
      isAuthorized = !!roleRow;
    }

    if (!isAuthorized) {
      return json({ ok: false, error: "forbidden — admin role required for this tenant" }, 403);
    }

    // Load Mosad ID + ApiPassword for this tenant (service_role bypasses RLS)
    const { data: cfg } = await supabase
      .from("nedarim_configs")
      .select("mosad_id, api_password")
      .eq("tenant_id", body.tenant_id)
      .maybeSingle();

    const mosadId = cfg?.mosad_id || Deno.env.get("NEDARIM_MOSAD_ID");
    const apiPassword = cfg?.api_password || Deno.env.get("NEDARIM_API_PASSWORD");

    if (!mosadId) return json({ ok: false, error: "Mosad ID not configured for tenant" }, 400);
    if (!apiPassword) return json({ ok: false, error: "ApiPassword not configured for tenant" }, 500);

    // When a tenant has no dedicated nedarim_configs row, it falls back to the shared
    // platform-default Mosad account (env NEDARIM_MOSAD_ID/NEDARIM_API_PASSWORD) — other
    // unconfigured tenants share that SAME account. Any action that targets a specific
    // transaction_id must be confirmed to belong to THIS tenant's own transaction log
    // before being forwarded, otherwise a tenant_admin could refund/cancel/query another
    // tenant's transaction simply by supplying its id (verified live: 2/5 tenants on this
    // project currently share the fallback account, so this is reachable today).
    if (body.transaction_id) {
      const { data: ownedTxn } = await supabase
        .from("nedarim_transactions")
        .select("id")
        .eq("tenant_id", body.tenant_id)
        .eq("transaction_id", body.transaction_id)
        .maybeSingle();
      if (!ownedTxn) {
        return json({ ok: false, error: "transaction_id does not belong to this tenant" }, 403);
      }
    } else if (!cfg?.mosad_id) {
      // No transaction_id to scope by (e.g. GetHistoryJson, which lists by date range
      // only) AND this tenant has no dedicated Mosad account — it is on the shared
      // fallback account together with other unconfigured tenants. Nedarim Plus's
      // history API is scoped only by MosadId, so forwarding this would hand back
      // EVERY tenant's transactions on that shared account (donor names, phones,
      // amounts) to this tenant's admin. Block it; this tenant must get its own
      // nedarim_configs row before it can use account-wide, non-transaction-scoped
      // actions.
      return json({
        ok: false,
        error: "action requires a transaction_id, or a dedicated Mosad account for this tenant",
      }, 403);
    }

    // RESERVED_KEYS are always server-computed from the verified tenant_id above; `extra`
    // must never be able to override them — it is spread last below, so without this
    // filter a client-supplied extra.MosadId/ApiPassword/Action/etc would silently win.
    const RESERVED_KEYS = new Set(["action", "mosadid", "apipassword", "transactionid", "amount", "fromdate", "todate"]);
    const safeExtra = body.extra
      ? Object.fromEntries(
          Object.entries(body.extra)
            .filter(([k]) => !RESERVED_KEYS.has(k.toLowerCase()))
            .map(([k, v]) => [k, String(v)]),
        )
      : {};

    // Build Nedarim API request
    const formData = new URLSearchParams({
      Action: body.action,
      MosadId: mosadId,
      ApiPassword: apiPassword,
      ...(body.transaction_id ? { TransactionId: body.transaction_id } : {}),
      ...(body.amount ? { Amount: String(body.amount) } : {}),
      ...(body.from_date ? { FromDate: body.from_date } : {}),
      ...(body.to_date ? { ToDate: body.to_date } : {}),
      ...safeExtra,
    });

    console.log(`[nedarim-admin] ${body.action} for tenant ${body.tenant_id} by ${user.id}`);

    const resp = await fetch(NEDARIM_API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData,
    });

    const text = await resp.text();
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { parsed = text; }

    // Audit log
    try {
      await supabase.from("audit_log").insert({
        tenant_id: body.tenant_id,
        user_id: user.id,
        action: `nedarim_admin:${body.action}`,
        entity: "nedarim_transactions",
        entity_id: body.transaction_id || null,
        diff: { request: { ...body, _api_password: "[REDACTED]" }, response: parsed },
      });
    } catch (e) {
      console.warn("audit_log insert failed:", e);
    }

    return json({ ok: resp.ok, status: resp.status, result: parsed });
  } catch (err) {
    console.error("[nedarim-admin] error:", err);
    return json({ ok: false, error: String(err) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}
