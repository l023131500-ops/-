import { createFileRoute } from "@tanstack/react-router";

// Public no-login intake endpoint, same service-role convention as the other
// /api/public/* routes. GET resolves a tenant id to its display name so the
// public form page can brand itself; POST records an inbound inquiry onto the
// tenant's intake board. The tenant id is not a secret (it only lets you
// *send* the org an inquiry — reads stay behind tenant-isolation RLS), but
// inserts are validated hard: whitelisted channel, length caps, name plus at
// least one contact detail, and a honeypot field that silently swallows bots.
const CHANNELS = new Set(["form", "email", "whatsapp", "voice", "phone", "other"]);
const CATEGORIES = new Set(["mortgage", "insurance", "housing", "employment", "health", "legal", "other"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const clip = (v: unknown, max: number) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

export const Route = createFileRoute("/api/public/intake-submit")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const json = (body: unknown, status = 200) =>
          new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
        try {
          const tenantId = new URL(request.url).searchParams.get("tenant");
          if (!tenantId || !UUID_RE.test(tenantId)) return json({ error: "tenant required" }, 400);
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: tenant, error } = await supabaseAdmin
            .from("tenants").select("name").eq("id", tenantId).maybeSingle();
          if (error) throw error;
          if (!tenant) return json({ error: "not found" }, 404);
          return json({ name: tenant.name });
        } catch (e) {
          console.error("[intake-submit GET]", e);
          return json({ error: "internal" }, 500);
        }
      },
      POST: async ({ request }) => {
        const json = (body: unknown, status = 200) =>
          new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
        try {
          const raw = (await request.json().catch(() => null)) as Record<string, unknown> | null;
          if (!raw) return json({ error: "invalid body" }, 400);

          // Honeypot: real users never see/fill this field. Pretend success.
          if (typeof raw.website === "string" && raw.website.trim()) return json({ ok: true });

          const tenantId = typeof raw.tenant_id === "string" ? raw.tenant_id : "";
          if (!UUID_RE.test(tenantId)) return json({ error: "tenant_id required" }, 400);

          const fullName = clip(raw.full_name, 120);
          const phone = clip(raw.phone, 30);
          const email = clip(raw.email, 160);
          if (!fullName) return json({ error: "full_name required" }, 400);
          if (!phone && !email) return json({ error: "phone or email required" }, 400);
          if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "invalid email" }, 400);

          const channel = typeof raw.channel === "string" && CHANNELS.has(raw.channel) ? raw.channel : "form";
          const suggested = typeof raw.suggested_category === "string" && CATEGORIES.has(raw.suggested_category)
            ? raw.suggested_category : null;

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: tenant, error: tenantErr } = await supabaseAdmin
            .from("tenants").select("id").eq("id", tenantId).maybeSingle();
          if (tenantErr) throw tenantErr;
          if (!tenant) return json({ error: "tenant not found" }, 404);

          const { error: insertErr } = await supabaseAdmin.from("intake_inquiries").insert({
            tenant_id: tenantId,
            channel,
            full_name: fullName,
            phone,
            email,
            subject: clip(raw.subject, 200),
            body: clip(raw.body, 4000),
            suggested_category: suggested,
            source_meta: { via: "public-form", user_agent: request.headers.get("user-agent")?.slice(0, 200) ?? null },
          });
          if (insertErr) throw insertErr;

          return json({ ok: true });
        } catch (e) {
          console.error("[intake-submit POST]", e);
          return json({ error: "internal" }, 500);
        }
      },
    },
  },
});
