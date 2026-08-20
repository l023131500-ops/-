import { createFileRoute } from "@tanstack/react-router";
import { getCallerTenantId } from "@/integrations/supabase/tenant-auth.server";

export const Route = createFileRoute("/api/public/notify-partner")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => null);
          if (!body || typeof body.referralId !== "string") {
            return new Response(JSON.stringify({ error: "referralId required" }), { status: 400, headers: { "content-type": "application/json" } });
          }
          const callerTenantId = await getCallerTenantId(request);
          if (!callerTenantId) {
            return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "content-type": "application/json" } });
          }
          const webhookUrl = process.env.N8N_NOTIFY_PARTNER_URL;
          if (!webhookUrl) {
            console.log("[notify-partner] N8N_NOTIFY_PARTNER_URL not set; skipping. payload=", body);
            return new Response(JSON.stringify({ ok: true, dispatched: false }), { status: 200, headers: { "content-type": "application/json" } });
          }
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: referral } = await supabaseAdmin
            .from("partner_referrals")
            .select("*, partner:partners(*), client:clients(*)")
            .eq("id", body.referralId)
            .maybeSingle();
          if (!referral || referral.tenant_id !== callerTenantId) {
            return new Response(JSON.stringify({ error: "referral not found" }), { status: 404, headers: { "content-type": "application/json" } });
          }
          const res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ event: "referral.created", referral }),
          }).catch((e) => { console.warn("[notify-partner] webhook fetch failed", e); return null; });
          return new Response(JSON.stringify({ ok: true, dispatched: !!res?.ok }), { status: 200, headers: { "content-type": "application/json" } });
        } catch (e) {
          console.error("[notify-partner]", e);
          return new Response(JSON.stringify({ error: "internal" }), { status: 500, headers: { "content-type": "application/json" } });
        }
      },
    },
  },
});
