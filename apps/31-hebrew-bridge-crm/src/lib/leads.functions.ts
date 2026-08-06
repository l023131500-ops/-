import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const leadInput = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(255).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  phone: z.string().trim().max(50).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  message: z.string().trim().max(5000).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  source: z.string().trim().max(60).default("web"),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Public lead intake. Called from the public /contact form (no auth) and
 * mirrored by the /api/public/leads/submit HTTP route for n8n / external forms.
 * Creates a lead row and enqueues a `new_lead` event on outbox_queue.
 */
export const submitLead = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => leadInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: lead, error } = await supabaseAdmin
      .from("leads")
      .insert({
        name: data.name,
        email: data.email ?? null,
        phone: data.phone ?? null,
        message: data.message ?? null,
        source: data.source ?? "web",
        metadata: data.metadata ?? {},
      })
      .select("id, created_at")
      .single();
    if (error) throw new Error(error.message);

    const payload = {
      lead_id: lead.id,
      name: data.name,
      email: data.email ?? null,
      phone: data.phone ?? null,
      message: data.message ?? null,
      source: data.source ?? "web",
      metadata: data.metadata ?? {},
      created_at: lead.created_at,
    };

    // ⚠️ Log the identifier, never the payload. `payload` carries the name,
    // e-mail, phone and free-text message of a member of the public, and
    // console output on this host goes to the platform log, which is a wider
    // audience than the CRM's own consent rules allow. The lead id is enough
    // to find the row.
    console.log("[submit-lead] queueing", { lead_id: lead.id, source: data.source ?? "web" });

    const { error: qErr } = await supabaseAdmin.from("outbox_queue").insert({
      event_type: "new_lead",
      payload,
      status: "pending",
    });
    if (qErr) throw new Error(qErr.message);

    return { ok: true, lead_id: lead.id };
  });
