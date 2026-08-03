import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Professional = {
  id: string;
  name: string;
  email: string | null;
  contact_info: Record<string, any>;
  category_id: string | null;
  category_name?: string | null;
  created_at: string;
  updated_at: string;
};

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

export const listProfessionals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Professional[]> => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("professionals")
      .select("id, name, email, contact_info, category_id, created_at, updated_at, categories(name)")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      ...r,
      category_name: r.categories?.name ?? null,
    })) as Professional[];
  });

const professionalInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  email: z.string().email().max(255).nullable().optional(),
  contact_info: z.record(z.string(), z.any()).default({}),
  category_id: z.string().uuid().nullable().optional(),
});

export const upsertProfessional = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => professionalInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      name: data.name,
      email: data.email ?? null,
      contact_info: data.contact_info ?? {},
      category_id: data.category_id ?? null,
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("professionals").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("professionals")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const deleteProfessional = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("professionals").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type ClientProfessionalRow = Professional & { is_assigned: boolean };

export const listClientProfessionals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { clientId: string }) =>
    z.object({ clientId: z.string().uuid() }).parse(d)
  )
  .handler(async ({ data, context }): Promise<ClientProfessionalRow[]> => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [profRes, assignRes] = await Promise.all([
      supabaseAdmin
        .from("professionals")
        .select("id, name, email, contact_info, category_id, created_at, updated_at, categories(name)")
        .order("name", { ascending: true }),
      supabaseAdmin
        .from("client_professional_assignments")
        .select("professional_id")
        .eq("client_id", data.clientId),
    ]);
    if (profRes.error) throw new Error(profRes.error.message);
    if (assignRes.error) throw new Error(assignRes.error.message);
    const assigned = new Set((assignRes.data ?? []).map((r: any) => r.professional_id));
    return (profRes.data ?? []).map((r: any) => ({
      ...r,
      category_name: r.categories?.name ?? null,
      is_assigned: assigned.has(r.id),
    })) as ClientProfessionalRow[];
  });

export const setClientProfessionalAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { clientId: string; professionalId: string; assigned: boolean }) =>
    z.object({
      clientId: z.string().uuid(),
      professionalId: z.string().uuid(),
      assigned: z.boolean(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.assigned) {
      const { error } = await supabaseAdmin
        .from("client_professional_assignments")
        .upsert(
          { client_id: data.clientId, professional_id: data.professionalId },
          { onConflict: "client_id,professional_id" }
        );
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("client_professional_assignments")
        .delete()
        .eq("client_id", data.clientId)
        .eq("professional_id", data.professionalId);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
