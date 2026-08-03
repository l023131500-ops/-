import { createFileRoute } from "@tanstack/react-router";

// Pay-stub analysis dispatch — forwards a document to n8n which runs OCR/LLM extraction
// and writes the result back via PATCH to /api/public/paystub-result (or directly via service role).
export const Route = createFileRoute("/api/public/analyze-paystub")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => null);
          if (!body || typeof body.documentId !== "string") {
            return new Response(JSON.stringify({ error: "documentId required" }), { status: 400, headers: { "content-type": "application/json" } });
          }
          const webhookUrl = process.env.N8N_ANALYZE_PAYSTUB_URL;
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: doc } = await supabaseAdmin
            .from("documents")
            .select("*")
            .eq("id", body.documentId)
            .maybeSingle();
          if (!doc) return new Response(JSON.stringify({ error: "document not found" }), { status: 404, headers: { "content-type": "application/json" } });

          let signedUrl: string | null = null;
          if (doc.storage_path) {
            const { data: urlData } = await supabaseAdmin.storage.from("client-documents").createSignedUrl(doc.storage_path, 60 * 60);
            signedUrl = urlData?.signedUrl ?? null;
          }
          await supabaseAdmin.from("documents").update({ processing_status: "processing" }).eq("id", body.documentId);

          if (!webhookUrl) {
            // Demo / no-webhook fallback: write a plausible mock result so UI flows can be tested
            const mock = {
              gross_salary: 12500,
              net_salary: 9800,
              employer: "—",
              deductions: { tax: 1200, social: 800, health: 700 },
              period: new Date().toISOString().slice(0, 7),
              mock: true,
            };
            await supabaseAdmin.from("documents").update({ processing_status: "completed", analysis_result: mock }).eq("id", body.documentId);
            return new Response(JSON.stringify({ ok: true, dispatched: false, result: mock }), { status: 200, headers: { "content-type": "application/json" } });
          }

          const res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ event: "paystub.analyze", document: doc, signedUrl }),
          }).catch((e) => { console.warn("[analyze-paystub] webhook fetch failed", e); return null; });
          return new Response(JSON.stringify({ ok: true, dispatched: !!res?.ok }), { status: 200, headers: { "content-type": "application/json" } });
        } catch (e) {
          console.error("[analyze-paystub]", e);
          return new Response(JSON.stringify({ error: "internal" }), { status: 500, headers: { "content-type": "application/json" } });
        }
      },
    },
  },
});
