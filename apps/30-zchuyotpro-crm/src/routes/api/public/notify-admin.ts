import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/notify-admin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => null);
          if (!body || typeof body.referralId !== "string") {
            return new Response(JSON.stringify({ error: "referralId required" }), { status: 400, headers: { "content-type": "application/json" } });
          }
          const webhookUrl = process.env.N8N_NOTIFY_ADMIN_URL;
          if (!webhookUrl) {
            console.log("[notify-admin] N8N_NOTIFY_ADMIN_URL not set; skipping. payload=", body);
            return new Response(JSON.stringify({ ok: true, dispatched: false }), { status: 200, headers: { "content-type": "application/json" } });
          }
          const res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ event: "referral.updated", ...body }),
          }).catch((e) => { console.warn("[notify-admin] webhook fetch failed", e); return null; });
          return new Response(JSON.stringify({ ok: true, dispatched: !!res?.ok }), { status: 200, headers: { "content-type": "application/json" } });
        } catch (e) {
          console.error("[notify-admin]", e);
          return new Response(JSON.stringify({ error: "internal" }), { status: 500, headers: { "content-type": "application/json" } });
        }
      },
    },
  },
});
