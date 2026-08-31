// ============================================================================
// Edge Function: admin-users
// CRUD למשתמשים — דורש super_admin או tenant_admin (לטננט שלו)
// פעולות: list | create | update_password | update_role | delete
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jr = (b: any, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jr({ ok: false, error: "method not allowed" }, 405);

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Auth: who is calling?
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jr({ ok: false, error: "אין הרשאה" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: userResp, error: uErr } = await admin.auth.getUser(token);
    if (uErr || !userResp.user) return jr({ ok: false, error: "טוקן לא תקף" }, 401);
    const caller = userResp.user;

    // Check caller's role
    const { data: roles } = await admin
      .from("user_roles")
      .select("role, tenant_id")
      .eq("user_id", caller.id);
    const isSuper = (roles || []).some((r: any) => r.role === "super_admin");
    const tenantAdminTenants = (roles || [])
      .filter((r: any) => r.role === "tenant_admin")
      .map((r: any) => r.tenant_id);
    if (!isSuper && tenantAdminTenants.length === 0)
      return jr({ ok: false, error: "אין הרשאה" }, 403);

    const body = await req.json();
    const { action } = body;

    // ── LIST ─────────────────────────────────────────────────────────────
    if (action === "list") {
      const { data: profiles } = await admin
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      const { data: userRoles } = await admin
        .from("user_roles")
        .select("user_id, role, tenant_id, created_at");

      const { data: tenants } = await admin.from("tenants").select("id, name, slug");
      const tenantMap = Object.fromEntries((tenants || []).map((t: any) => [t.id, t]));

      // Get emails from auth.users via admin API. listUsers() paginates (default
      // 50/page), so page through until exhausted - otherwise users past page 1
      // silently show a blank email/last-login in the admin list.
      const authUsers: any[] = [];
      for (let page = 1; ; page++) {
        const { data: authList } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        authUsers.push(...(authList?.users || []));
        if (!authList?.users || authList.users.length < 1000) break;
      }
      const emailMap = Object.fromEntries(
        authUsers.map((u: any) => [u.id, { email: u.email, last_sign_in_at: u.last_sign_in_at }]),
      );

      const rolesByUser: Record<string, any[]> = {};
      (userRoles || []).forEach((r: any) => {
        rolesByUser[r.user_id] = rolesByUser[r.user_id] || [];
        rolesByUser[r.user_id].push({
          role: r.role,
          tenant_id: r.tenant_id,
          tenant: r.tenant_id ? tenantMap[r.tenant_id] : null,
        });
      });

      let users = (profiles || []).map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        display_name: p.display_name,
        phone: p.phone,
        email: emailMap[p.id]?.email,
        last_sign_in_at: emailMap[p.id]?.last_sign_in_at,
        roles: rolesByUser[p.id] || [],
        created_at: p.created_at,
      }));

      // If tenant_admin only — filter to their tenant's users
      if (!isSuper) {
        users = users.filter((u) =>
          u.roles.some((r: any) => tenantAdminTenants.includes(r.tenant_id)),
        );
      }

      return jr({ ok: true, users, tenants: tenants || [] });
    }

    // ── CREATE ───────────────────────────────────────────────────────────
    if (action === "create") {
      const { email, password, full_name, phone, role, tenant_id } = body;
      if (!email || !password || !full_name)
        return jr({ ok: false, error: "חסרים פרטים: דוא״ל/סיסמה/שם" }, 400);
      if (password.length < 6)
        return jr({ ok: false, error: "סיסמה חייבת 6 תווים לפחות" }, 400);

      // tenant_admin can only create for their tenants
      if (!isSuper) {
        if (!tenant_id || !tenantAdminTenants.includes(tenant_id))
          return jr({ ok: false, error: "אסור ליצור משתמש מחוץ לטננט שלך" }, 403);
        if (role === "super_admin")
          return jr({ ok: false, error: "אסור ליצור super_admin" }, 403);
      }

      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, phone: phone || null },
      });
      if (cErr || !created.user)
        return jr({ ok: false, error: cErr?.message || "כשל ביצירה" }, 500);

      // Update profile (auto-created by trigger)
      await admin
        .from("profiles")
        .update({ full_name, display_name: full_name, phone: phone || null, updated_at: new Date().toISOString() })
        .eq("id", created.user.id);

      // Assign role
      if (role) {
        await admin.from("user_roles").insert({
          user_id: created.user.id,
          tenant_id: tenant_id || null,
          role,
          permissions: {},
        });
      }
      return jr({ ok: true, user_id: created.user.id });
    }

    // ── UPDATE PASSWORD ──────────────────────────────────────────────────
    if (action === "update_password") {
      const { user_id, new_password } = body;
      if (!user_id || !new_password || new_password.length < 6)
        return jr({ ok: false, error: "פרטים שגויים" }, 400);

      if (!isSuper) {
        const { data: targetRoles } = await admin
          .from("user_roles")
          .select("tenant_id, role")
          .eq("user_id", user_id);
        // updateUserById changes the password on the user's single global auth
        // account, not just their access within the caller's tenant. Requiring
        // only ONE matching role (.some) let a tenant_admin reset the password
        // of a user who ALSO holds a role in a tenant they don't manage --
        // hijacking that other tenant's access too. Require EVERY role the
        // target holds to be within tenants the caller manages.
        const allowed =
          (targetRoles || []).length > 0 &&
          (targetRoles || []).every(
            (r: any) => r.role !== "super_admin" && tenantAdminTenants.includes(r.tenant_id),
          );
        if (!allowed) return jr({ ok: false, error: "אין הרשאה למשתמש זה" }, 403);
      }

      const { error } = await admin.auth.admin.updateUserById(user_id, { password: new_password });
      if (error) return jr({ ok: false, error: error.message }, 500);
      return jr({ ok: true });
    }

    // ── UPDATE ROLE ──────────────────────────────────────────────────────
    if (action === "update_role") {
      const { user_id, role, tenant_id } = body;
      if (!user_id || !role) return jr({ ok: false, error: "פרטים חסרים" }, 400);
      if (!isSuper) {
        if (!tenantAdminTenants.includes(tenant_id))
          return jr({ ok: false, error: "אין הרשאה לטננט זה" }, 403);
        if (role === "super_admin") return jr({ ok: false, error: "אסור" }, 403);
      }
      // .eq("tenant_id", null) sends "tenant_id=eq.null" to PostgREST, which
      // 400s (22P02: invalid input syntax for type uuid) instead of matching
      // NULL rows -- a global (tenant_id null) role could never be replaced.
      // .is() is required for a NULL comparison.
      const delQuery = admin.from("user_roles").delete().eq("user_id", user_id);
      const { error: delErr } = tenant_id
        ? await delQuery.eq("tenant_id", tenant_id)
        : await delQuery.is("tenant_id", null);
      if (delErr) return jr({ ok: false, error: delErr.message }, 500);
      const { error: insErr } = await admin.from("user_roles").insert({ user_id, tenant_id: tenant_id || null, role, permissions: {} });
      if (insErr) return jr({ ok: false, error: insErr.message }, 500);
      return jr({ ok: true });
    }

    // ── DELETE ───────────────────────────────────────────────────────────
    if (action === "delete") {
      const { user_id } = body;
      if (!user_id) return jr({ ok: false, error: "user_id חסר" }, 400);
      if (user_id === caller.id) return jr({ ok: false, error: "אסור למחוק את עצמך" }, 400);

      if (!isSuper) {
        const { data: targetRoles } = await admin
          .from("user_roles")
          .select("tenant_id, role")
          .eq("user_id", user_id);
        // deleteUser removes the user's single global auth account outright,
        // not just their membership in the caller's tenant. Requiring only ONE
        // matching role (.some) let a tenant_admin permanently delete a user
        // who ALSO holds a role in a tenant they don't manage -- destroying
        // that other tenant's access too. Require EVERY role the target holds
        // to be within tenants the caller manages (same fix as update_password).
        const allowed =
          (targetRoles || []).length > 0 &&
          (targetRoles || []).every(
            (r: any) => r.role !== "super_admin" && tenantAdminTenants.includes(r.tenant_id),
          );
        if (!allowed) return jr({ ok: false, error: "אין הרשאה" }, 403);
      }

      const { error } = await admin.auth.admin.deleteUser(user_id);
      if (error) return jr({ ok: false, error: error.message }, 500);
      return jr({ ok: true });
    }

    return jr({ ok: false, error: "פעולה לא ידועה" }, 400);
  } catch (e) {
    return jr({ ok: false, error: String(e?.message || e) }, 500);
  }
});
