import { createFileRoute } from "@tanstack/react-router";
import { createHmac } from "crypto";

/**
 * Outbox dispatcher.
 *
 * Called internally by the `outbox_queue_dispatch_after_insert` trigger via
 * pg_net. Authenticated by the standard `apikey` header (Supabase anon key).
 *
 * Body: { id?: string }
 *   - if `id` supplied, dispatch that row only
 *   - otherwise drain all pending rows (safety: max 50/run)
 */

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/hooks/outbox-dispatch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey");
        const expected =
          process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
        if (!apiKey || !expected || apiKey !== expected) {
          return json({ error: "Unauthorized" }, 401);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Resolve outbound URL
        const { data: settings } = await supabaseAdmin
          .from("webhook_settings")
          .select("outbound_url")
          .limit(1)
          .maybeSingle();
        const outboundUrl = settings?.outbound_url?.trim();
        if (!outboundUrl) {
          return json({ ok: false, error: "No outbound_url configured" }, 200);
        }

        let body: { id?: string } = {};
        try {
          body = (await request.json()) as { id?: string };
        } catch {
          body = {};
        }

        let query = supabaseAdmin
          .from("outbox_queue")
          .select("id, event_type, payload, attempts")
          .eq("status", "pending")
          .order("created_at", { ascending: true })
          .limit(50);
        if (body.id) query = query.eq("id", body.id) as typeof query;

        const { data: rows, error: readErr } = await query;
        if (readErr) return json({ error: readErr.message }, 500);

        const secret = process.env.INCOMING_WEBHOOK_API_KEY ?? "";
        let sent = 0;
        let failed = 0;

        for (const row of rows ?? []) {
          const payload = JSON.stringify({
            id: row.id,
            event_type: row.event_type,
            data: row.payload,
            dispatched_at: new Date().toISOString(),
          });
          const signature = secret
            ? createHmac("sha256", secret).update(payload).digest("hex")
            : "";

          try {
            console.log("[outbox-dispatch] sending", {
              id: row.id,
              event_type: row.event_type,
              target: outboundUrl,
              payload: JSON.parse(payload),
            });
            const res = await fetch(outboundUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Webhook-Signature": signature,
                "X-Event-Type": row.event_type,
                "X-API-Key": secret,
              },
              body: payload,
            });
            if (!res.ok) throw new Error(`Outbound ${res.status}: ${await res.text().catch(() => "")}`);
            console.log("[outbox-dispatch] sent", { id: row.id, status: res.status });
            await supabaseAdmin
              .from("outbox_queue")
              .update({
                status: "sent",
                sent_at: new Date().toISOString(),
                target_url: outboundUrl,
                attempts: (row.attempts ?? 0) + 1,
                last_error: null,
              })
              .eq("id", row.id);
            sent++;
          } catch (e) {
            const msg = e instanceof Error ? e.message : "unknown error";
            console.error("[outbox-dispatch] failed", { id: row.id, error: msg });
            await supabaseAdmin
              .from("outbox_queue")
              .update({
                status: "failed",
                target_url: outboundUrl,
                attempts: (row.attempts ?? 0) + 1,
                last_error: msg.slice(0, 1000),
              })
              .eq("id", row.id);
            failed++;
          }
        }

        return json({ ok: true, checked: rows?.length ?? 0, sent, failed });
      },
    },
  },
});
