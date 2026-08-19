// ============================================================================
// Edge Function: activate-invite
// הפעלת הזמנה: בודק קוד+סיסמה, יוצר משתמש Auth, מקשר ל-tenant.
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { data: invite, error: invErr } = await admin
      .from("tenant_invites")
      .select("id, tenant_id, email, full_name, phone, initial_password, role, used_at, expires_at")
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

    // Set preferred tenant
    await admin.from("profiles")
      .update({ preferred_tenant_id: invite.tenant_id })
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
