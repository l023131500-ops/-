import { createFileRoute } from "@tanstack/react-router";
import { getCallerTenantId } from "@/integrations/supabase/tenant-auth.server";

// Pay-stub analysis dispatch — forwards a document to n8n which runs OCR/LLM extraction.
// n8n is expected to write documents.analysis_result back itself via the service role;
// there is no /api/public/paystub-result route in this app to receive it.
export const Route = createFileRoute("/api/public/analyze-paystub")({
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
          const webhookUrl = process.env.N8N_ANALYZE_PAYSTUB_URL;
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: doc } = await supabaseAdmin
            .from("documents")
            .select("*")
            .eq("id", body.documentId)
            .maybeSingle();
          if (!doc || doc.tenant_id !== callerTenantId) {
            return new Response(JSON.stringify({ error: "document not found" }), { status: 404, headers: { "content-type": "application/json" } });
          }

          let signedUrl: string | null = null;
          if (doc.storage_path) {
            const { data: urlData } = await supabaseAdmin.storage.from("client-documents").createSignedUrl(doc.storage_path, 60 * 60);
            signedUrl = urlData?.signedUrl ?? null;
          }
          await supabaseAdmin.from("documents").update({ processing_status: "processing" }).eq("id", body.documentId);

          // Never invent an analysis_result. AnalysisView reads gross_salary/net_salary out of it
          // and the "עדכון פרופיל הלקוח" button writes those numbers into client_financial_profile,
          // where they are indistinguishable from extracted data. If the analysis did not run, say so.
          if (!webhookUrl) {
            await supabaseAdmin.from("documents").update({ processing_status: "failed" }).eq("id", body.documentId);
            return new Response(
              JSON.stringify({ ok: false, dispatched: false, error: "ניתוח תלושים אינו מוגדר בסביבה זו — לא הוגדר N8N_ANALYZE_PAYSTUB_URL" }),
              { status: 503, headers: { "content-type": "application/json" } },
            );
          }

          const res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ event: "paystub.analyze", document: doc, signedUrl }),
          }).catch((e) => { console.warn("[analyze-paystub] webhook fetch failed", e); return null; });
          if (!res?.ok) {
            // The document was already marked "processing" above; leaving it there would show
            // "בעיבוד" forever for a dispatch that never landed.
            await supabaseAdmin.from("documents").update({ processing_status: "failed" }).eq("id", body.documentId);
            return new Response(
              JSON.stringify({ ok: false, dispatched: false, error: "שליחת המסמך לניתוח נכשלה" }),
              { status: 502, headers: { "content-type": "application/json" } },
            );
          }
          return new Response(JSON.stringify({ ok: true, dispatched: true }), { status: 200, headers: { "content-type": "application/json" } });
        } catch (e) {
          console.error("[analyze-paystub]", e);
          return new Response(JSON.stringify({ error: "internal" }), { status: 500, headers: { "content-type": "application/json" } });
        }
      },
    },
  },
});
