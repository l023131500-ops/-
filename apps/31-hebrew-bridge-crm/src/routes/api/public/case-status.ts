import { createFileRoute } from "@tanstack/react-router";

// No-login case-status lookup by share_token (a random, unguessable UUID —
// never the row id; same IDOR-avoiding shape as the identical route just
// built for the sibling CRM 30-zchuyotpro-crm). Only resolves when an admin
// explicitly turned share_enabled on for that client_profiles row. Returns a
// minimal, external-safe summary — never email, phone, internal admin
// notes, voicemail transcription, or document contents/links.
export const Route = createFileRoute("/api/public/case-status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const json = (body: unknown, status = 200) =>
          new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
        try {
          const token = new URL(request.url).searchParams.get("token");
          if (!token) return json({ error: "token required" }, 400);

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const { data: client, error: clientErr } = await supabaseAdmin
            .from("client_profiles")
            .select("id, share_enabled, created_at, profiles:profiles!client_profiles_id_fkey(full_name)")
            .eq("share_token", token)
            .maybeSingle();
          if (clientErr) throw clientErr;
          if (!client || !client.share_enabled) return json({ error: "not found" }, 404);

          const { data: assignment, error: assignErr } = await supabaseAdmin
            .from("partner_assignments")
            .select("treatment_status, partner_id, created_at")
            .eq("client_id", client.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (assignErr) throw assignErr;

          let partnerName: string | null = null;
          if (assignment?.partner_id) {
            const { data: pProfile } = await supabaseAdmin
              .from("profiles")
              .select("full_name")
              .eq("id", assignment.partner_id)
              .maybeSingle();
            partnerName = pProfile?.full_name ?? null;
          }

          const { count: documentCount } = await supabaseAdmin
            .from("documents")
            .select("id", { count: "exact", head: true })
            .eq("owner_client_id", client.id);

          const profile = Array.isArray(client.profiles) ? client.profiles[0] : client.profiles;

          return json({
            full_name: profile?.full_name ?? null,
            treatment_status: assignment?.treatment_status ?? "not_started",
            assigned_partner_name: partnerName,
            document_count: documentCount ?? 0,
            registered_at: client.created_at,
          });
        } catch (e) {
          console.error("[case-status]", e);
          return json({ error: "internal" }, 500);
        }
      },
    },
  },
});
