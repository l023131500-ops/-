import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Incoming webhook endpoint for external systems (n8n).
 *
 * Auth: `X-API-Key` header must match `INCOMING_WEBHOOK_API_KEY`.
 *
 * Payload shape:
 *   { type: "client_profile", data: {...} }  → upsert into client_profiles
 *   { type: <any other>,     data: {...} }   → enqueue into outbox_queue
 */

const PayloadSchema = z.object({
  type: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_.-]+$/),
  data: z.record(z.string(), z.any()).default({}),
});

const ClientProfileSchema = z.object({
  id: z.string().uuid().optional(),
  payment_status: z.string().min(1).max(64).optional(),
  lead_source: z.string().min(1).max(128).optional(),
}).passthrough();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/webhooks/incoming")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("x-api-key");
        const expected = process.env.INCOMING_WEBHOOK_API_KEY;
        if (!expected) return json({ error: "Server misconfigured" }, 500);
        if (!apiKey || apiKey !== expected) return json({ error: "Unauthorized" }, 401);

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }

        const parsed = PayloadSchema.safeParse(raw);
        if (!parsed.success) {
          return json({ error: "Invalid payload", details: parsed.error.flatten() }, 400);
        }
        const { type, data } = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (type === "client_profile") {
          const profile = ClientProfileSchema.safeParse(data);
          if (!profile.success) {
            return json({ error: "Invalid client_profile data" }, 400);
          }
          const { error } = await supabaseAdmin
            .from("client_profiles")
            .upsert(profile.data as never, { onConflict: "id" });
          if (error) return json({ error: error.message }, 500);
          return json({ ok: true, type, action: "upserted" }, 200);
        }

        const { data: row, error } = await supabaseAdmin
          .from("outbox_queue")
          .insert({ event_type: type, payload: data, status: "pending" })
          .select("id")
          .single();
        if (error) return json({ error: error.message }, 500);

        return json({ ok: true, type, action: "queued", id: row?.id }, 202);
      },
    },
  },
});
