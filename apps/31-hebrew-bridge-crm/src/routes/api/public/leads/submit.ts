import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(255).optional(),
  phone: z.string().trim().max(50).optional(),
  message: z.string().trim().max(5000).optional(),
  source: z.string().trim().max(60).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/leads/submit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }
        const parsed = schema.safeParse(raw);
        if (!parsed.success) {
          return json({ error: "Invalid payload", details: parsed.error.flatten() }, 400);
        }
        const data = parsed.data;
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
        if (error) return json({ error: error.message }, 500);

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
        // Identifier only — see the note in lib/leads.functions.ts. This is the
        // same lead arriving over HTTP (n8n / external forms), so logging the
        // payload here would leak exactly the same personal details.
        console.log("[api/leads/submit] queueing", {
          lead_id: lead.id,
          source: data.source ?? "web",
        });

        const { error: qErr } = await supabaseAdmin.from("outbox_queue").insert({
          event_type: "new_lead",
          payload,
          status: "pending",
        });
        if (qErr) return json({ error: qErr.message }, 500);

        return json({ ok: true, lead_id: lead.id });
      },
    },
  },
});
