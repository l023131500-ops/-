import { createFileRoute } from "@tanstack/react-router";

// No-login case-status lookup by share_token (a random, unguessable UUID —
// never the row id, so this cannot be walked/enumerated the way an IDOR bug
// on a sequential/known id could be; see round-35 IDOR fix on this same
// /api/public/* family for the bug class this avoids repeating). Only
// resolves when the assigned agent explicitly turned share_enabled on for
// that client. Returns a minimal, external-safe summary — never id_number,
// address, phone, email, financial/housing/vehicle data, documents,
// messages, or internal notes.
export const Route = createFileRoute("/api/public/case-status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const json = (body: unknown, status = 200) =>
          new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
        try {
          const token = new URL(request.url).searchParams.get("token");
          if (!token) return json({ error: "token required" }, 400);

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const { data: client, error: clientErr } = await supabaseAdmin
            .from("clients")
            .select("id, first_name, last_name, file_number, status, share_enabled, tenant:tenants(name), assigned_agent:profiles!clients_assigned_agent_id_fkey(full_name)")
            .eq("share_token", token)
            .maybeSingle();
          if (clientErr) throw clientErr;
          if (!client || !client.share_enabled) return json({ error: "not found" }, 404);

          const { data: entitlements, error: entErr } = await supabaseAdmin
            .from("client_entitlements")
            .select("status, year, entitlement:entitlements(title, category)")
            .eq("client_id", client.id);
          if (entErr) throw entErr;

          return json({
            first_name: client.first_name,
            last_name: client.last_name,
            file_number: client.file_number,
            status: client.status,
            organization: client.tenant?.name ?? null,
            assigned_agent: client.assigned_agent?.full_name ?? null,
            entitlements: (entitlements ?? []).map((e) => ({
              title: e.entitlement?.title ?? null,
              category: e.entitlement?.category ?? null,
              status: e.status,
              year: e.year,
            })),
          });
        } catch (e) {
          console.error("[case-status]", e);
          return json({ error: "internal" }, 500);
        }
      },
    },
  },
});
