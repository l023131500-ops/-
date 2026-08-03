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

const MOCK_CLIENTS = [
  {
    email: "mock.israel.cohen@crm.local",
    full_name: "ישראל כהן",
    phone: "050-1234567",
    lead_source: "whatsapp" as const,
    voicemail: "שלום, שמי ישראל כהן. פניתי בעקבות המלצה של חבר בנוגע לתכנון פנסיוני. אשמח שיחזרו אליי בהקדם.",
  },
  {
    email: "mock.sara.levi@crm.local",
    full_name: "שרה לוי",
    phone: "052-9876543",
    lead_source: "email" as const,
    voicemail: "ערב טוב, אני שרה לוי, מעוניינת בייעוץ משפטי בנושא ירושה. נא ליצור איתי קשר בשעות הבוקר.",
  },
  {
    email: "mock.moshe.friedman@crm.local",
    full_name: "משה פרידמן",
    phone: "054-3344556",
    lead_source: "yemot_hamashiach" as const,
    voicemail: "שלום, משה פרידמן מדבר. השארתי הודעה במערכת לגבי תכנון פיננסי משפחתי. תודה רבה.",
  },
  {
    email: "mock.rachel.biton@crm.local",
    full_name: "רחל ביטון",
    phone: "053-2233445",
    lead_source: "nedarim_plus" as const,
    voicemail: "אהלן, רחל ביטון מדברת. אני מעוניינת לשמוע על אפשרויות חיסכון לטווח ארוך. תודה.",
  },
  {
    email: "mock.david.avraham@crm.local",
    full_name: "דוד אברהם",
    phone: "058-7788990",
    lead_source: "whatsapp" as const,
    voicemail: "בוקר טוב, מדבר דוד אברהם. מחפש ייעוץ דחוף בנושא קרן השתלמות. אנא חזרו אליי היום.",
  },
];

export const seedMockClients = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let created = 0;
    let skipped = 0;

    for (const m of MOCK_CLIENTS) {
      const { data: existing } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", m.email)
        .maybeSingle();

      let id: string;
      if (existing?.id) {
        id = existing.id;
        skipped++;
      } else {
        const password = crypto.randomUUID() + "Aa1!";
        const { data: created_user, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: m.email,
          password,
          email_confirm: true,
          user_metadata: { full_name: m.full_name, phone: m.phone },
        });
        if (createErr || !created_user.user) throw new Error(createErr?.message ?? "Failed to create user");
        id = created_user.user.id;
        created++;
      }

      await supabaseAdmin
        .from("profiles")
        .update({ full_name: m.full_name, phone: m.phone })
        .eq("id", id);

      await supabaseAdmin
        .from("client_profiles")
        .update({
          lead_source: m.lead_source,
          raw_voicemail_transcription: m.voicemail,
        })
        .eq("id", id);
    }

    return { created, skipped, total: MOCK_CLIENTS.length };
  });
