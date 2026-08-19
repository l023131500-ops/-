import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  loadPartnerVisibility,
  partnerFacingName,
  visibleFieldsFor,
} from "@/lib/partner-visibility";

export type TreatmentStatus = "sent" | "in_progress" | "completed";

export type PartnerClientField = { key: string; value: string | null };

export type PartnerClientRow = {
  assignment_id: string;
  client_id: string;
  treatment_status: TreatmentStatus;
  assigned_at: string;
  /** The client granted this partner's category consent AND the category has fields. */
  consent_granted: boolean;
  /** Full name if the category may see it and consent was given, otherwise the withheld label. */
  display_name: string;
  /** Only the fields this partner is actually allowed to see, in the admin's configured order. */
  fields: PartnerClientField[];
  /** The partner's own feedback note on this assignment — the one column he may write. */
  feedback_notes: string | null;
};

// Where each allowed_schema_fields key is read from. uploaded_documents is deliberately
// absent: documents live in their own table behind their own RLS, so a partner is not
// handed them from here even when the admin ticks the box — see partner-visibility.ts.
const PROFILE_FIELDS = ["full_name", "email", "phone"] as const;
const CLIENT_PROFILE_FIELDS = [
  "lead_source",
  "payment_status",
  "raw_voicemail_transcription",
  "internal_admin_notes",
] as const;

export const listMyClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PartnerClientRow[]> => {
    const { supabase, userId } = context as any;

    // RLS ("Partners read own assignments") already scopes this to the caller; the
    // explicit filter keeps the intent readable and the query index-backed.
    const { data: assignments, error } = await supabase
      .from("partner_assignments")
      .select("id, client_id, treatment_status, partner_feedback_notes, created_at")
      .eq("partner_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    if (!assignments?.length) return [];

    const clientIds: string[] = Array.from(
      new Set<string>(assignments.map((a: any) => a.client_id as string))
    );

    // Everything below is read as service_role — client_profiles has no partner policy
    // at all — so the consent check must be made here, in code.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const visibility = await loadPartnerVisibility(supabaseAdmin, userId, clientIds);

    const needsProfile = PROFILE_FIELDS.some((f) => visibility.allowedFields.includes(f));
    const needsClientProfile = CLIENT_PROFILE_FIELDS.some((f) => visibility.allowedFields.includes(f));

    const { data: profiles } = needsProfile
      ? await supabaseAdmin.from("profiles").select("id, full_name, email, phone").in("id", clientIds)
      : { data: [] as any[] };
    const { data: clientProfiles } = needsClientProfile
      ? await supabaseAdmin
          .from("client_profiles")
          .select("id, lead_source, payment_status, raw_voicemail_transcription, internal_admin_notes")
          .in("id", clientIds)
      : { data: [] as any[] };

    const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const clientProfileById = new Map((clientProfiles ?? []).map((c: any) => [c.id, c]));

    const rawValue = (clientId: string, field: string): string | null => {
      const source = (PROFILE_FIELDS as readonly string[]).includes(field)
        ? profileById.get(clientId)
        : clientProfileById.get(clientId);
      const v = source?.[field];
      return v === undefined || v === null || v === "" ? null : String(v);
    };

    return assignments.map((a: any) => {
      const clientId = a.client_id as string;
      const readField = (field: string) => rawValue(clientId, field);
      return {
        assignment_id: a.id as string,
        client_id: clientId,
        treatment_status: a.treatment_status as TreatmentStatus,
        assigned_at: a.created_at as string,
        consent_granted: visibility.grantedClientIds.has(clientId),
        display_name: partnerFacingName(visibility, clientId, readField),
        fields: visibleFieldsFor(visibility, clientId, readField),
        feedback_notes: (a.partner_feedback_notes as string | null) ?? null,
      };
    });
  });

export const updateTreatmentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { assignmentId: string; status: TreatmentStatus }) =>
    z
      .object({
        assignmentId: z.string().uuid(),
        status: z.enum(["sent", "in_progress", "completed"]),
      })
      .parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    // Read as the caller: "Partners read own assignments" scopes this to rows that are his,
    // so a foreign or missing id both come back empty and both answer Forbidden.
    const { data: row } = await supabase
      .from("partner_assignments")
      .select("partner_id")
      .eq("id", data.assignmentId)
      .maybeSingle();
    if (!row || row.partner_id !== userId) throw new Error("Forbidden");

    // The write cannot go through the caller. Migration 20260605003212 revoked UPDATE on this
    // table from `authenticated` and granted back exactly one column — partner_feedback_notes —
    // so a partner writing treatment_status himself gets 42501 (verified against production).
    // That revoke is deliberate: it stops a partner from moving his own row through the funnel
    // by hand, or rewriting partner_id past the USING-only policy. Honour it and make the one
    // legitimate transition here, as service_role, on the single column, after the check above.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("partner_assignments")
      .update({ treatment_status: data.status })
      .eq("id", data.assignmentId)
      .eq("partner_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** How much free text a partner may leave on one assignment. */
export const FEEDBACK_MAX_LENGTH = 4000;

export const savePartnerFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { assignmentId: string; notes: string }) =>
    z
      .object({
        assignmentId: z.string().uuid(),
        notes: z.string().max(FEEDBACK_MAX_LENGTH),
      })
      .parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    // Same ownership gate as updateTreatmentStatus: "Partners read own assignments" scopes
    // the read to the caller, so a foreign or missing id both come back empty.
    const { data: row } = await supabase
      .from("partner_assignments")
      .select("partner_id")
      .eq("id", data.assignmentId)
      .maybeSingle();
    if (!row || row.partner_id !== userId) throw new Error("Forbidden");

    // Unlike treatment_status, this write does NOT need service_role: migration
    // 20260605003212 revoked UPDATE on the table from `authenticated` and granted back
    // exactly this column, and "Partners update own assignments" scopes the row. So the
    // partner writes his own note as himself, which is also what the grant was written for.
    const notes = data.notes.trim();
    const { error } = await supabase
      .from("partner_assignments")
      .update({ partner_feedback_notes: notes === "" ? null : notes })
      .eq("id", data.assignmentId)
      .eq("partner_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
