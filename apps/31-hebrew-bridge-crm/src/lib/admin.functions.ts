import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error("Authorization check failed");
  if (!data) throw new Error("Forbidden: admin role required");
}

export type AdminClientRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  lead_source: string | null;
  payment_status: string;
  registered_at: string;
  internal_admin_notes: string | null;
  raw_voicemail_transcription: string | null;
  assigned_partner_id: string | null;
  assigned_partner_name: string | null;
  treatment_status: string | null;
};

export const listClientsForAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminClientRow[]> => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: clients, error } = await supabaseAdmin
      .from("client_profiles")
      .select(`
        id, lead_source, payment_status, internal_admin_notes,
        raw_voicemail_transcription, created_at,
        profiles:profiles!client_profiles_id_fkey ( full_name, email, phone )
      `)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: assignments } = await supabaseAdmin
      .from("partner_assignments")
      .select("client_id, partner_id, treatment_status, created_at")
      .order("created_at", { ascending: false });

    const partnerIds = Array.from(new Set((assignments ?? []).map((a) => a.partner_id)));
    const { data: partnerProfiles } = partnerIds.length
      ? await supabaseAdmin.from("profiles").select("id, full_name").in("id", partnerIds)
      : { data: [] as any[] };
    const partnerNameById = new Map((partnerProfiles ?? []).map((p: any) => [p.id, p.full_name]));

    const latestByClient = new Map<string, any>();
    for (const a of assignments ?? []) {
      if (!latestByClient.has(a.client_id)) latestByClient.set(a.client_id, a);
    }

    return (clients ?? []).map((c: any) => {
      const a = latestByClient.get(c.id);
      const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
      return {
        id: c.id,
        full_name: profile?.full_name ?? null,
        email: profile?.email ?? null,
        phone: profile?.phone ?? null,
        lead_source: c.lead_source,
        payment_status: c.payment_status,
        registered_at: c.created_at,
        internal_admin_notes: c.internal_admin_notes,
        raw_voicemail_transcription: c.raw_voicemail_transcription,
        assigned_partner_id: a?.partner_id ?? null,
        assigned_partner_name: a ? partnerNameById.get(a.partner_id) ?? null : null,
        treatment_status: a?.treatment_status ?? null,
      };
    });
  });

export type PartnerForAssignment = {
  id: string;
  full_name: string | null;
  company_name: string | null;
  specialization_category: string | null;
};

export const listPartnersForAssignment = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PartnerForAssignment[]> => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("partner_profiles")
      .select("id, company_name, specialization_category, profiles:profiles!partner_profiles_id_fkey(full_name)");
    if (error) throw new Error(error.message);
    return (data ?? []).map((p: any) => ({
      id: p.id,
      company_name: p.company_name,
      specialization_category: p.specialization_category,
      full_name: (Array.isArray(p.profiles) ? p.profiles[0]?.full_name : p.profiles?.full_name) ?? null,
    }));
  });

export const assignPartnerToClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { clientId: string; partnerId: string }) =>
    z.object({ clientId: z.string().uuid(), partnerId: z.string().uuid() }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("partner_assignments")
      .insert({ client_id: data.clientId, partner_id: data.partnerId, treatment_status: "sent" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateClientAdminNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { clientId: string; notes: string }) =>
    z.object({ clientId: z.string().uuid(), notes: z.string().max(5000) }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("client_profiles")
      .update({ internal_admin_notes: data.notes })
      .eq("id", data.clientId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type AdminPartnerRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  company_name: string | null;
  specialization_category: string | null;
  joined_at: string;
  active_clients_count: number;
};

export const listPartnersForAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminPartnerRow[]> => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: partners, error } = await supabaseAdmin
      .from("partner_profiles")
      .select("id, company_name, specialization_category, created_at, profiles:profiles!partner_profiles_id_fkey(full_name, email)");
    if (error) throw new Error(error.message);

    const { data: assignments } = await supabaseAdmin
      .from("partner_assignments")
      .select("partner_id, treatment_status")
      .eq("treatment_status", "in_progress");
    const counts = new Map<string, number>();
    for (const a of assignments ?? []) counts.set(a.partner_id, (counts.get(a.partner_id) ?? 0) + 1);

    return (partners ?? []).map((p: any) => {
      const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
      return {
        id: p.id,
        full_name: profile?.full_name ?? null,
        email: profile?.email ?? null,
        company_name: p.company_name,
        specialization_category: p.specialization_category,
        joined_at: p.created_at,
        active_clients_count: counts.get(p.id) ?? 0,
      };
    });
  });

export type VisibilityRule = {
  id: string;
  partner_category: string;
  allowed_schema_fields: string[];
};

export const listVisibilityRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<VisibilityRule[]> => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("visibility_rules")
      .select("id, partner_category, allowed_schema_fields")
      .order("partner_category");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      id: r.id,
      partner_category: r.partner_category,
      allowed_schema_fields: Array.isArray(r.allowed_schema_fields) ? r.allowed_schema_fields : [],
    }));
  });

export const upsertVisibilityRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { category: string; allowedFields: string[] }) =>
    z.object({
      category: z.string().min(1).max(100),
      allowedFields: z.array(z.string().min(1).max(100)).max(50),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("visibility_rules")
      .upsert({ partner_category: data.category, allowed_schema_fields: data.allowedFields }, { onConflict: "partner_category" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
