import { createFileRoute } from "@tanstack/react-router";

// Outbound message dispatch — forwards a newly-created `messages` row to n8n
// which performs the actual WA/Email/SMS send.
export const Route = createFileRoute("/api/public/notify-message")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => null);
          if (!body || typeof body.messageId !== "string") {
            return new Response(JSON.stringify({ error: "messageId required" }), { status: 400, headers: { "content-type": "application/json" } });
          }
          const webhookUrl = process.env.N8N_NOTIFY_MESSAGE_URL;
          if (!webhookUrl) {
            console.log("[notify-message] N8N_NOTIFY_MESSAGE_URL not set; skipping.", body);
            return new Response(JSON.stringify({ ok: true, dispatched: false }), { status: 200, headers: { "content-type": "application/json" } });
          }
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: message } = await supabaseAdmin
            .from("messages")
            .select("*, client:clients(id, first_name, last_name, phone, email), partner:partners(id, company_name, email, phone)")
            .eq("id", body.messageId)
            .maybeSingle();
          if (!message) return new Response(JSON.stringify({ error: "message not found" }), { status: 404, headers: { "content-type": "application/json" } });
          const res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ event: "message.outbound", message }),
          }).catch((e) => { console.warn("[notify-message] webhook fetch failed", e); return null; });
          return new Response(JSON.stringify({ ok: true, dispatched: !!res?.ok }), { status: 200, headers: { "content-type": "application/json" } });
        } catch (e) {
          console.error("[notify-message]", e);
          return new Response(JSON.stringify({ error: "internal" }), { status: 500, headers: { "content-type": "application/json" } });
        }
      },
    },
  },
});
