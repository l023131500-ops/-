import { createFileRoute } from "@tanstack/react-router";
import { getCallerTenantId } from "@/integrations/supabase/tenant-auth.server";

// Signature request dispatch — sends a document link to the client for signing via n8n.
export const Route = createFileRoute("/api/public/notify-signature")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => null);
          if (!body || typeof body.documentId !== "string") {
            return new Response(JSON.stringify({ error: "documentId required" }), { status: 400, headers: { "content-type": "application/json" } });
          }
          const callerTenantId = await getCallerTenantId(request);
          if (!callerTenantId) {
            return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "content-type": "application/json" } });
          }
          const webhookUrl = process.env.N8N_NOTIFY_SIGNATURE_URL;
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: doc } = await supabaseAdmin
            .from("documents")
            .select("*, client:clients(id, first_name, last_name, phone, email)")
            .eq("id", body.documentId)
            .maybeSingle();
          if (!doc || doc.tenant_id !== callerTenantId) {
            return new Response(JSON.stringify({ error: "document not found" }), { status: 404, headers: { "content-type": "application/json" } });
          }
          const { error: pendingErr } = await supabaseAdmin.from("documents").update({ signature_status: "pending", requires_signature: true }).eq("id", body.documentId);
          if (pendingErr) console.error("[notify-signature] failed to mark signature_status=pending", pendingErr);
          let signedUrl: string | null = null;
          if (doc.storage_path) {
            const { data: urlData } = await supabaseAdmin.storage.from("client-documents").createSignedUrl(doc.storage_path, 60 * 60 * 24 * 7);
            signedUrl = urlData?.signedUrl ?? null;
          }
          if (!webhookUrl) {
            console.log("[notify-signature] N8N_NOTIFY_SIGNATURE_URL not set; skipping.", { documentId: body.documentId });
            return new Response(JSON.stringify({ ok: true, dispatched: false }), { status: 200, headers: { "content-type": "application/json" } });
          }
          const res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ event: "signature.requested", document: doc, signedUrl }),
          }).catch((e) => { console.warn("[notify-signature] webhook fetch failed", e); return null; });
          return new Response(JSON.stringify({ ok: true, dispatched: !!res?.ok }), { status: 200, headers: { "content-type": "application/json" } });
        } catch (e) {
          console.error("[notify-signature]", e);
          return new Response(JSON.stringify({ error: "internal" }), { status: 500, headers: { "content-type": "application/json" } });
        }
      },
    },
  },
});
