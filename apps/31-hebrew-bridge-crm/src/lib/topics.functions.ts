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

export type Topic = {
  id: string;
  name: string;
  client_subject: string;
  client_html_body: string;
  notify_partner: boolean;
  category_id: string | null;
  category_name?: string | null;
  response_template_html: string | null;
  created_at: string;
  updated_at: string;
};

export const listTopics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Topic[]> => {
    const { supabase } = context as any;
    const { data, error } = await supabase
      .from("topics")
      .select(
        "id, name, client_subject, client_html_body, notify_partner, category_id, response_template_html, created_at, updated_at, categories(name)"
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((t: any) => ({
      ...t,
      category_name: t.categories?.name ?? null,
    })) as Topic[];
  });

const topicInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  client_subject: z.string().min(1).max(500),
  client_html_body: z.string().min(1).max(50000),
  notify_partner: z.boolean(),
  category_id: z.string().uuid().nullable().optional(),
  response_template_html: z.string().max(50000).nullable().optional(),
});

export const upsertTopic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => topicInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      name: data.name,
      client_subject: data.client_subject,
      client_html_body: data.client_html_body,
      notify_partner: data.notify_partner,
      category_id: data.category_id ?? null,
      response_template_html: data.response_template_html ?? null,
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("topics").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("topics")
      .insert({ ...payload, created_by: userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const deleteTopic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("topics").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type ClientTopicRow = Topic & { is_relevant: boolean };

export const listClientTopics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { clientId: string }) =>
    z.object({ clientId: z.string().uuid() }).parse(d)
  )
  .handler(async ({ data, context }): Promise<ClientTopicRow[]> => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [topicsRes, statesRes] = await Promise.all([
      supabaseAdmin
        .from("topics")
        .select(
          "id, name, client_subject, client_html_body, notify_partner, category_id, response_template_html, created_at, updated_at, categories(name)"
        )
        .order("name", { ascending: true }),
      supabaseAdmin
        .from("client_topic_states")
        .select("topic_id, is_relevant")
        .eq("client_id", data.clientId),
    ]);
    if (topicsRes.error) throw new Error(topicsRes.error.message);
    if (statesRes.error) throw new Error(statesRes.error.message);
    const stateMap = new Map((statesRes.data ?? []).map((s: any) => [s.topic_id, s.is_relevant]));
    return (topicsRes.data ?? []).map((t: any) => ({
      ...t,
      category_name: t.categories?.name ?? null,
      is_relevant: stateMap.get(t.id) ?? false,
    })) as ClientTopicRow[];
  });

export const setClientTopicRelevance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { clientId: string; topicId: string; isRelevant: boolean }) =>
    z.object({
      clientId: z.string().uuid(),
      topicId: z.string().uuid(),
      isRelevant: z.boolean(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("client_topic_states")
      .upsert(
        {
          client_id: data.clientId,
          topic_id: data.topicId,
          is_relevant: data.isRelevant,
        },
        { onConflict: "client_id,topic_id" }
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendTopicToClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { clientId: string; topicId: string }) =>
    z.object({
      clientId: z.string().uuid(),
      topicId: z.string().uuid(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [topicRes, clientRes] = await Promise.all([
      supabaseAdmin
        .from("topics")
        .select(
          "id, name, client_subject, client_html_body, notify_partner, category_id, response_template_html, categories(name)"
        )
        .eq("id", data.topicId)
        .maybeSingle(),
      supabaseAdmin
        .from("profiles")
        .select("id, full_name, email, phone")
        .eq("id", data.clientId)
        .maybeSingle(),
    ]);
    if (topicRes.error) throw new Error(topicRes.error.message);
    if (!topicRes.data) throw new Error("Topic not found");
    if (clientRes.error) throw new Error(clientRes.error.message);
    if (!clientRes.data) throw new Error("Client not found");

    // Partner email (most recent assignment)
    let partnerEmail: string | null = null;
    const { data: assignment } = await supabaseAdmin
      .from("partner_assignments")
      .select("partner_id")
      .eq("client_id", data.clientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (assignment?.partner_id) {
      const { data: partner } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("id", assignment.partner_id)
        .maybeSingle();
      partnerEmail = partner?.email ?? null;
    }

    // Professionals assigned to this client (optionally narrowed to topic category)
    const { data: assigns } = await supabaseAdmin
      .from("client_professional_assignments")
      .select("professional_id")
      .eq("client_id", data.clientId);
    const profIds = (assigns ?? []).map((a: any) => a.professional_id);
    let professionals: any[] = [];
    if (profIds.length) {
      let q = supabaseAdmin
        .from("professionals")
        .select("id, name, email, contact_info, category_id, categories(name)")
        .in("id", profIds);
      if (topicRes.data.category_id) q = q.eq("category_id", topicRes.data.category_id);
      const { data: profs } = await q;
      professionals = (profs ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        contact_info: p.contact_info,
        category: p.categories?.name ?? null,
      }));
    }

    const payload = {
      client_data: {
        id: clientRes.data.id,
        name: clientRes.data.full_name,
        email: clientRes.data.email,
        phone: clientRes.data.phone,
      },
      topic_data: {
        id: topicRes.data.id,
        name: topicRes.data.name,
        subject: topicRes.data.client_subject,
        body: topicRes.data.client_html_body,
        category: (topicRes.data as any).categories?.name ?? null,
        notify_partner: topicRes.data.notify_partner,
      },
      professional_data: professionals,
      template_body: topicRes.data.response_template_html ?? null,
      partner_email: partnerEmail,
    };

    // Identifiers only — see the note in lib/leads.functions.ts. This payload is
    // the worst of the four: a named client's e-mail and phone, the full body
    // of the message, and the contact details of every professional attached.
    console.log("[send-topic] queueing", {
      client_id: clientRes.data.id,
      topic_id: topicRes.data.id,
      professionals: professionals.length,
      notify_partner: topicRes.data.notify_partner,
    });

    const { data: row, error } = await supabaseAdmin
      .from("outbox_queue")
      .insert({
        event_type: "topic_send",
        payload,
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // Client-visible copy, snapshotted now: outbox_queue is an internal
    // delivery job (and its payload carries partner/professional contact
    // details the client must never see), not something the client portal
    // reads. Best-effort -- a failure here must not roll back a send that
    // already left for the external channel.
    const { error: cmErr } = await supabaseAdmin.from("client_messages").insert({
      client_id: clientRes.data.id,
      topic_id: topicRes.data.id,
      subject: topicRes.data.client_subject,
      body_html: topicRes.data.client_html_body,
      sent_by: userId,
    });
    if (cmErr) console.error("[send-topic] client_messages insert failed", cmErr.message);

    return { ok: true, outboxId: row.id };
  });
