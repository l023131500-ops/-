// Server-only helper for the /api/public/* routes: resolves the tenant_id of
// the authenticated caller from a Bearer token, so those routes (which use
// supabaseAdmin and therefore bypass RLS) can reject cross-tenant access
// instead of trusting whatever id the client sends in the request body.
import { supabaseAdmin } from "./client.server";

export async function getCallerTenantId(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getClaims(token);
  const userId = data?.claims?.sub;
  if (error || !userId) return null;

  // Tenant staff live in `profiles`; external partners live in `partners`.
  // Both key off auth_user_id and carry their own tenant_id.
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("tenant_id")
    .eq("auth_user_id", userId)
    .maybeSingle();
  if (profile?.tenant_id) return profile.tenant_id;

  const { data: partner } = await supabaseAdmin
    .from("partners")
    .select("tenant_id")
    .eq("auth_user_id", userId)
    .maybeSingle();
  return partner?.tenant_id ?? null;
}
