import { createFileRoute } from "@tanstack/react-router";

// No-login case-status lookup by share_token (a random, unguessable UUID —
// never the row id, so this cannot be walked/enumerated the way an IDOR bug
// on a sequential/known id could be; see round-35 IDOR fix on this same
// /api/public/* family for the bug class this avoids repeating). Only
// resolves when the assigned agent explicitly turned share_enabled on for
// that client. Returns a minimal, external-safe summary — never id_number,
// address, phone, email, financial/housing/vehicle data, documents,
// messages, or internal notes. Property photos/videos ARE included (the
// client's own property media, uploaded for their case) but only as
// short-lived signed URLs generated here with the service role — the
// property-media bucket is private and its storage.objects RLS only grants
// "authenticated", so an anon visitor could never sign these themselves.
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

          const { data: media, error: mediaErr } = await supabaseAdmin
            .from("property_media")
            .select("id, property_label, media_type, file_name, storage_path, created_at")
            .eq("client_id", client.id)
            .order("created_at", { ascending: false });
          if (mediaErr) throw mediaErr;

          const propertyMedia = await Promise.all(
            (media ?? []).map(async (m) => {
              const { data: signed } = await supabaseAdmin.storage
                .from("property-media")
                .createSignedUrl(m.storage_path, 3600);
              return {
                id: m.id,
                property_label: m.property_label,
                media_type: m.media_type as "photo" | "video",
                file_name: m.file_name,
                url: signed?.signedUrl ?? null,
              };
            }),
          );

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
            property_media: propertyMedia.filter((m) => m.url),
          });
        } catch (e) {
          console.error("[case-status]", e);
          return json({ error: "internal" }, 500);
        }
      },
    },
  },
});
