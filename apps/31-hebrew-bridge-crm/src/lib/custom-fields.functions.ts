import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: any) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

const entity = z.enum(["client", "partner", "professional", "topic"]);
const fieldType = z.enum(["text", "number", "date", "boolean", "select", "multiselect"]);

const defSchema = z.object({
  id: z.string().uuid().optional(),
  entity_type: entity,
  key: z.string().min(1).max(64).regex(/^[a-z0-9_]+$/),
  label: z.string().min(1).max(200),
  type: fieldType,
  options: z.array(z.string()).default([]),
  required: z.boolean().default(false),
  visible_to_roles: z.array(z.string()).default(["admin"]),
  sort_order: z.number().int().default(0),
});

export const listCustomFieldDefinitions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ entity_type: entity.optional() }).parse(d))
  .handler(async ({ data, context }) => {
    let q = (context as any).supabase.from("custom_field_definitions").select("*").order("entity_type").order("sort_order");
    if (data.entity_type) q = q.eq("entity_type", data.entity_type);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { definitions: rows ?? [] };
  });

export const upsertCustomFieldDefinition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => defSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const payload = { ...data, options: data.options ?? [] };
    const { error } = await (context as any).supabase
      .from("custom_field_definitions").upsert(payload, { onConflict: "entity_type,key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCustomFieldDefinition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { error } = await (context as any).supabase
      .from("custom_field_definitions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setCustomFieldValue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      definition_id: z.string().uuid(),
      entity_id: z.string().uuid(),
      value: z.any(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await (context as any).supabase
      .from("custom_field_values")
      .upsert(data, { onConflict: "definition_id,entity_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getCustomFieldValues = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ entity_type: entity, entity_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = (context as any).supabase;
    const { data: defs, error: defErr } = await sb
      .from("custom_field_definitions").select("*").eq("entity_type", data.entity_type).order("sort_order");
    if (defErr) throw new Error(defErr.message);
    const ids = (defs ?? []).map((d: any) => d.id);
    if (ids.length === 0) return { definitions: [], values: [] };
    const { data: values, error: valErr } = await sb
      .from("custom_field_values").select("*").eq("entity_id", data.entity_id).in("definition_id", ids);
    if (valErr) throw new Error(valErr.message);
    return { definitions: defs ?? [], values: values ?? [] };
  });
