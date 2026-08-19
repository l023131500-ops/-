import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// core.issues #168 — the invite code is the only check before a confirmed
// account is created and its password handed back. Caps guessing attempts per
// caller IP and per targeted email so a leaked/weak code can't be brute forced
// for free. A real activation takes one request, so no genuine user gets close.
const RATE_LIMIT_PER_HOUR_PER_IP = 10;
const RATE_LIMIT_PER_HOUR_PER_EMAIL = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { code, email } = await req.json();
    if (!code || !email) {
      return new Response(JSON.stringify({ error: "missing code or email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    const windowStart = new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000).toISOString();
    for (const bucket of [`activate-invite:ip:${ip}`, `activate-invite:email:${email.trim().toLowerCase()}`]) {
      const limit = bucket.startsWith("activate-invite:ip:") ? RATE_LIMIT_PER_HOUR_PER_IP : RATE_LIMIT_PER_HOUR_PER_EMAIL;
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
        return new Response(JSON.stringify({ error: "יותר מדי ניסיונות. נסו שוב בעוד שעה." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 1. Validate invite
    const { data: invite, error: invErr } = await admin
      .from("teacher_invites")
      .select("*")
      .eq("invite_code", code)
      .ilike("email", email)
      .eq("used", false)
      .maybeSingle();
    if (invErr) throw invErr;
    if (!invite) {
      return new Response(JSON.stringify({ error: "קוד הזמנה לא תקין או שכבר נוצל" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Create or fetch auth user (auto-confirm)
    let userId: string | null = null;
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email: invite.email,
      password: invite.initial_password,
      email_confirm: true,
      user_metadata: { full_name: invite.full_name },
    });
    if (cErr && !String(cErr.message).toLowerCase().includes("already")) {
      throw cErr;
    }
    userId = created?.user?.id ?? null;
    if (!userId) {
      const { data: list } = await admin.auth.admin.listUsers();
      userId = list?.users?.find((u: any) => u.email?.toLowerCase() === invite.email.toLowerCase())?.id ?? null;
      // Reset password to the initial one so the user can sign in immediately
      if (userId) {
        await admin.auth.admin.updateUserById(userId, { password: invite.initial_password, email_confirm: true });
      }
    }
    if (!userId) throw new Error("cannot create or find user");

    // 3. Upsert profile
    const { data: existing } = await admin.from("profiles").select("id").eq("user_id", userId).maybeSingle();
    const payload = {
      full_name: invite.full_name,
      phone: invite.phone,
      email: invite.email,
      portal_type: invite.portal_type,
      organization_name: invite.organization_name,
      is_approved: true,
    };
    if (existing) {
      await admin.from("profiles").update(payload).eq("id", existing.id);
    } else {
      await admin.from("profiles").insert({ user_id: userId, ...payload });
    }

    // 4. Mark invite used
    await admin.from("teacher_invites").update({ used: true, used_at: new Date().toISOString() }).eq("id", invite.id);

    return new Response(JSON.stringify({
      ok: true,
      email: invite.email,
      password: invite.initial_password,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "activation failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});