// ============================================================================
// Edge Function: activate-invite
// הפעלת הזמנה: בודק קוד+סיסמה, יוצר משתמש Auth, מקשר ל-tenant.
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// activate-invite gates account creation on a single plaintext comparison
// (password_input !== invite.initial_password) with no other auth. Caps
// guessing attempts per caller IP and per targeted invite code so a
// leaked/weak initial password can't be brute forced for free. Same shape
// as 15-egod's activate-invite fix (core.issues #168). A real activation
// takes one request, so no genuine user gets close to either cap.
const RATE_LIMIT_PER_HOUR_PER_IP = 10;
const RATE_LIMIT_PER_HOUR_PER_CODE = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { invite_code, password_input, new_password } = await req.json();

    if (!invite_code || !password_input || !new_password) {
      return jr({ ok: false, error: "חסרים פרטים" }, 400);
    }

    // cf-connecting-ip is set by Cloudflare's edge from the real TCP connection
    // and can't be spoofed by the caller. The first entry of x-forwarded-for
    // CAN be spoofed -- Supabase appends the real IP after whatever the caller
    // sent rather than replacing it -- so a caller could mint a fresh fake IP
    // per request and get a fresh rate-limit bucket every time.
    const ip = (req.headers.get("cf-connecting-ip") ?? "").trim() ||
      (req.headers.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean).pop() ||
      "unknown";
    const windowStart = new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000).toISOString();
    for (const bucket of [`activate-invite:ip:${ip}`, `activate-invite:code:${invite_code}`]) {
      const limit = bucket.startsWith("activate-invite:ip:") ? RATE_LIMIT_PER_HOUR_PER_IP : RATE_LIMIT_PER_HOUR_PER_CODE;
      const { data: gate, error: gateError } = await admin.rpc("invite_rate_limit_hit", {
        p_bucket: bucket,
        p_window_start: windowStart,
        p_limit: limit,
      });
      if (gateError) {
        // Fail open: a counter problem must not block real activations.
        console.error("rate limit check failed:", gateError.message);
      } else if (gate?.[0]?.allowed === false) {
        console.warn(`invite rate limited ${bucket}: ${gate[0].hits} hits this hour`);
        return jr({ ok: false, error: "יותר מדי ניסיונות. נסו שוב בעוד שעה." }, 429);
      }
    }

    const { data: invite, error: invErr } = await admin
      .from("tenant_invites")
      .select("id, tenant_id, email, full_name, phone, initial_password, role, used_at, expires_at, tenants(type)")
      .eq("invite_code", invite_code)
      .maybeSingle();

    if (invErr || !invite) return jr({ ok: false, error: "קוד הזמנה לא נמצא" }, 404);
    if (invite.used_at) return jr({ ok: false, error: "ההזמנה כבר מומשה" }, 400);
    if (new Date(invite.expires_at) < new Date()) return jr({ ok: false, error: "ההזמנה פגה" }, 400);
    if (password_input !== invite.initial_password) return jr({ ok: false, error: "סיסמה התחלתית שגויה" }, 401);

    // Create the user with the user's chosen password
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email: invite.email,
      password: new_password,
      email_confirm: true,
      user_metadata: { full_name: invite.full_name, phone: invite.phone },
    });
    if (cErr || !created.user) return jr({ ok: false, error: cErr?.message || "כשל ביצירת משתמש" }, 500);

    // Mark invite used
    await admin.from("tenant_invites")
      .update({ used_at: new Date().toISOString(), user_id: created.user.id })
      .eq("id", invite.id);

    // Membership + role
    await admin.from("memberships").upsert({
      tenant_id: invite.tenant_id,
      user_id: created.user.id,
      role: invite.role,
      status: "active",
    });
    await admin.from("user_roles").upsert({
      user_id: created.user.id,
      tenant_id: invite.tenant_id,
      role: invite.role,
    });

    // Set preferred tenant + the portal_type PortalSidebar.tsx reads to pick
    // the menu (rabbi/synagogue/organization) -- previously left at its
    // 'standard' column default forever, since nothing wrote it here.
    await admin.from("profiles")
      .update({
        preferred_tenant_id: invite.tenant_id,
        portal_type: invite.tenants?.type || "rabbi",
      })
      .eq("id", created.user.id);

    return jr({ ok: true, user_id: created.user.id, tenant_id: invite.tenant_id });
  } catch (err) {
    console.error(err);
    return jr({ ok: false, error: String(err) }, 500);
  }
});

function jr(p: unknown, s = 200) {
  return new Response(JSON.stringify(p), { status: s, headers: { ...corsHeaders, "content-type": "application/json" } });
}
