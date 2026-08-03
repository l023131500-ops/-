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

export type WebhookSettings = {
  id: string | null;
  outbound_url: string | null;
  updated_at: string | null;
};

export const getWebhookSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WebhookSettings> => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("webhook_settings")
      .select("id, outbound_url, updated_at")
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      id: data?.id ?? null,
      outbound_url: data?.outbound_url ?? null,
      updated_at: data?.updated_at ?? null,
    };
  });

export const updateWebhookSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { outbound_url: string }) =>
    z.object({ outbound_url: z.string().url().max(2000) }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("webhook_settings")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabaseAdmin
        .from("webhook_settings")
        .update({ outbound_url: data.outbound_url, updated_by: userId, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("webhook_settings")
        .insert({ outbound_url: data.outbound_url, updated_by: userId });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export type OutboxRow = {
  id: string;
  event_type: string;
  status: string;
  target_url: string | null;
  attempts: number;
  last_error: string | null;
  created_at: string;
  sent_at: string | null;
};

export const listOutboxQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OutboxRow[]> => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("outbox_queue")
      .select("id, event_type, status, target_url, attempts, last_error, created_at, sent_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []) as OutboxRow[];
  });

export const retryOutboxItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("outbox_queue")
      .update({ status: "pending", last_error: null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
