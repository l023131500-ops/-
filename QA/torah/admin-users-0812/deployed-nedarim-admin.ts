import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const NEDARIM_API_BASE = "https://matara.pro/nedarimplus/Reports/Online";
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") return new Response("ok", {
    headers: corsHeaders
  });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    // Auth — must be authenticated user with admin role
    const authHeader = req.headers.get("Authorization") || "";
    const userToken = authHeader.replace("Bearer ", "");
    if (!userToken) return json({
      ok: false,
      error: "missing auth token"
    }, 401);
    const userClient = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({
      ok: false,
      error: "unauthorized"
    }, 401);
    const body = await req.json();
    if (!body.action || !body.tenant_id) {
      return json({
        ok: false,
        error: "missing action or tenant_id"
      }, 400);
    }
    // Verify caller is super_admin OR tenant_admin for this tenant
    let isSuperRow = null;
    try {
      const r = await userClient.rpc("is_super_admin", {
        _uid: user.id
      }).single();
      isSuperRow = r.data ?? null;
    } catch (_e) {
      isSuperRow = null;
    }
    let isAuthorized = isSuperRow === true;
    if (!isAuthorized) {
      const { data: roleRow } = await supabase.from("user_roles").select("role, tenant_id").eq("user_id", user.id).eq("tenant_id", body.tenant_id).in("role", [
        "super_admin",
        "tenant_admin"
      ]).limit(1).maybeSingle();
      isAuthorized = !!roleRow;
    }
    if (!isAuthorized) {
      return json({
        ok: false,
        error: "forbidden — admin role required for this tenant"
      }, 403);
    }
    // Load Mosad ID + ApiPassword for this tenant (service_role bypasses RLS)
    const { data: cfg } = await supabase.from("nedarim_configs").select("mosad_id, api_password").eq("tenant_id", body.tenant_id).maybeSingle();
    const mosadId = cfg?.mosad_id || Deno.env.get("NEDARIM_MOSAD_ID");
    const apiPassword = cfg?.api_password || Deno.env.get("NEDARIM_API_PASSWORD");
    if (!mosadId) return json({
      ok: false,
      error: "Mosad ID not configured for tenant"
    }, 400);
    if (!apiPassword) return json({
      ok: false,
      error: "ApiPassword not configured for tenant"
    }, 500);
    // Build Nedarim API request
    const formData = new URLSearchParams({
      Action: body.action,
      MosadId: mosadId,
      ApiPassword: apiPassword,
      ...body.transaction_id ? {
        TransactionId: body.transaction_id
      } : {},
      ...body.amount ? {
        Amount: String(body.amount)
      } : {},
      ...body.from_date ? {
        FromDate: body.from_date
      } : {},
      ...body.to_date ? {
        ToDate: body.to_date
      } : {},
      ...body.extra ? Object.fromEntries(Object.entries(body.extra).map(([k, v])=>[
          k,
          String(v)
        ])) : {}
    });
    console.log(`[nedarim-admin] ${body.action} for tenant ${body.tenant_id} by ${user.id}`);
    const resp = await fetch(NEDARIM_API_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: formData
    });
    const text = await resp.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch  {
      parsed = text;
    }
    // Audit log
    try {
      await supabase.from("audit_log").insert({
        tenant_id: body.tenant_id,
        user_id: user.id,
        action: `nedarim_admin:${body.action}`,
        entity: "nedarim_transactions",
        entity_id: body.transaction_id || null,
        diff: {
          request: {
            ...body,
            _api_password: "[REDACTED]"
          },
          response: parsed
        }
      });
    } catch (e) {
      console.warn("audit_log insert failed:", e);
    }
    return json({
      ok: resp.ok,
      status: resp.status,
      result: parsed
    });
  } catch (err) {
    console.error("[nedarim-admin] error:", err);
    return json({
      ok: false,
      error: String(err)
    }, 500);
  }
});
function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json"
    }
  });
}
