import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  CONSENT_WITHHELD_NAME,
  NO_PARTNER_VISIBILITY,
  canPartnerSeeField,
  loadPartnerVisibility,
} from "@/lib/partner-visibility";

export type TaskStatus = "pending" | "in_progress" | "completed";
export type TaskPriority = "low" | "medium" | "high";

export type TaskRow = {
  id: string;
  client_id: string;
  partner_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  created_at: string;
  client_name: string | null;
  partner_name: string | null;
};

async function isAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

type Viewer = { userId: string; isAdmin: boolean };

async function decorateTasks(rows: any[], viewer: Viewer): Promise<TaskRow[]> {
  if (!rows.length) return [];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const ids = Array.from(new Set([
    ...rows.map((r) => r.client_id),
    ...rows.map((r) => r.partner_id).filter(Boolean),
  ]));
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name")
    .in("id", ids);
  const nameById = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));

  // The names above were read as service_role, so RLS did not filter them. A partner
  // may only be shown a client's name if that client consented to their category and
  // the category is allowed the full_name field — see partner-visibility.ts.
  const clientIds = Array.from(new Set(rows.map((r) => r.client_id as string)));
  const visibility = viewer.isAdmin
    ? NO_PARTNER_VISIBILITY
    : await loadPartnerVisibility(supabaseAdmin, viewer.userId, clientIds);

  const clientNameFor = (clientId: string): string | null => {
    if (viewer.isAdmin) return nameById.get(clientId) ?? null;
    // A client reading their own tasks is not a partner disclosure.
    if (clientId === viewer.userId) return nameById.get(clientId) ?? null;
    if (canPartnerSeeField(visibility, clientId, "full_name")) {
      return nameById.get(clientId) ?? null;
    }
    return CONSENT_WITHHELD_NAME;
  };

  return rows.map((r) => ({
    id: r.id,
    client_id: r.client_id,
    partner_id: r.partner_id,
    title: r.title,
    description: r.description,
    due_date: r.due_date,
    status: r.status,
    priority: r.priority,
    created_at: r.created_at,
    client_name: clientNameFor(r.client_id as string),
    partner_name: r.partner_id ? nameById.get(r.partner_id) ?? null : null,
  }));
}

export const listTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TaskRow[]> => {
    const { supabase, userId } = context as any;
    const admin = await isAdmin(supabase, userId);
    const query = admin
      ? supabase.from("tasks").select("*").order("created_at", { ascending: false })
      : supabase.from("tasks").select("*").eq("partner_id", userId).order("created_at", { ascending: false });
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return decorateTasks(data ?? [], { userId, isAdmin: admin });
  });

export const listTasksForClient = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { clientId: string }) => z.object({ clientId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<TaskRow[]> => {
    const { supabase, userId } = context as any;
    const admin = await isAdmin(supabase, userId);
    if (!admin && userId !== data.clientId) {
      // Allow partners currently assigned to this client
      const { data: assigned } = await supabase
        .from("partner_assignments")
        .select("id")
        .eq("client_id", data.clientId)
        .eq("partner_id", userId)
        .maybeSingle();
      if (!assigned) throw new Error("Forbidden");
    }
    const { data: rows, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("client_id", data.clientId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return decorateTasks(rows ?? [], { userId, isAdmin: admin });
  });

const createTaskSchema = z.object({
  clientId: z.string().uuid(),
  partnerId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

export const createTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof createTaskSchema>) => createTaskSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const admin = await isAdmin(supabase, userId);
    if (!admin) throw new Error("Forbidden: admin role required");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("tasks").insert({
      client_id: data.clientId,
      partner_id: data.partnerId ?? null,
      title: data.title,
      description: data.description ?? null,
      due_date: data.dueDate ?? null,
      priority: data.priority,
      created_by: userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function assertCanMutateTask(supabase: any, userId: string, taskId: string) {
  const admin = await isAdmin(supabase, userId);
  if (admin) return;
  const { data: task } = await supabase
    .from("tasks")
    .select("partner_id")
    .eq("id", taskId)
    .maybeSingle();
  if (!task || task.partner_id !== userId) throw new Error("Forbidden");
}

export const updateTaskStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: TaskStatus }) =>
    z.object({ id: z.string().uuid(), status: z.enum(["pending", "in_progress", "completed"]) }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertCanMutateTask(supabase, userId, data.id);
    const { error } = await supabase.from("tasks").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateTaskPriority = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; priority: TaskPriority }) =>
    z.object({ id: z.string().uuid(), priority: z.enum(["low", "medium", "high"]) }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertCanMutateTask(supabase, userId, data.id);
    const { error } = await supabase.from("tasks").update({ priority: data.priority }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const admin = await isAdmin(supabase, userId);
    if (!admin) throw new Error("Forbidden: admin role required");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("tasks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
