import { createSupabaseService } from "./supabase/server";

export async function audit(
  action: string,
  entity_type: string,
  entity_id: string | null,
  actor_email: string | null,
  details?: Record<string, unknown>
) {
  try {
    const svc = createSupabaseService();
    await svc.from("ad_audit_log").insert({
      actor_email,
      action,
      entity_type,
      entity_id,
      details: details || null,
    });
  } catch (e) {
    console.error("audit log failed", e);
  }
}
