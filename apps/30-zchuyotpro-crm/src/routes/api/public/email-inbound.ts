import { createFileRoute } from "@tanstack/react-router";

// Inbound email webhook (flagship spec item 9 — the receiving half of the
// two-way email sync). The tenant points their inbound-mail provider (Resend
// inbound, n8n mail trigger, CloudMailin, …) at
//   <origin>/crm/api/public/email-inbound?tenant=<tenant_id>&key=<inbound_secret>
// and every parsed email POSTed here lands in the CRM:
//
//   sender matches a client's email  → inbound `messages` row on the client's
//     timeline (channel email, status received → feeds the existing unread
//     badge and the realtime subscription in MessagesTab/inbox)
//   unknown sender                   → intake_inquiries row (channel email) on
//     the Intake board, so no email is ever silently dropped
//
// Auth is the same tenant-uuid + per-tenant secret convention as
// /api/public/yemot-ivr (the secret lives in tenants.settings.email and is
// generated from the settings screen). Idempotency: the provider message id is
// stored as external_message_id (`mail:<id>`), and a replayed webhook with the
// same id is acknowledged without inserting twice.

type EmailSettings = { enabled?: boolean; inbound_secret?: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]+/;

const clip = (v: unknown, max: number) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

/** "Full Name <a@b.c>" | "a@b.c" | {email,name} | {address,name} → parts. */
function parseSender(raw: unknown): { email: string | null; name: string | null } {
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const email = clip(o.email ?? o.address, 160);
    return { email: email && EMAIL_RE.test(email) ? email.match(EMAIL_RE)![0] : null, name: clip(o.name, 120) };
  }
  if (typeof raw === "string") {
    const email = raw.match(EMAIL_RE)?.[0] ?? null;
    const name = raw.replace(/<[^>]*>/g, "").replace(/["']/g, "").trim().slice(0, 120) || null;
    return { email, name: name && name !== email ? name : null };
  }
  return { email: null, name: null };
}

/** Crude but dependency-free: html → readable text for the timeline. */
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

export const Route = createFileRoute("/api/public/email-inbound")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const tenantId = url.searchParams.get("tenant") ?? "";
          const key = url.searchParams.get("key") ?? "";
          if (!UUID_RE.test(tenantId) || !key) return json({ error: "unauthorized" }, 401);

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: tenant, error: tenantErr } = await supabaseAdmin
            .from("tenants").select("id, settings").eq("id", tenantId).maybeSingle();
          if (tenantErr) throw tenantErr;
          const email = ((tenant?.settings as Record<string, unknown> | null)?.email ?? {}) as EmailSettings;
          if (!tenant || email.enabled !== true || !email.inbound_secret || email.inbound_secret !== key)
            return json({ error: "unauthorized" }, 401);

          const raw = (await request.json().catch(() => null)) as Record<string, unknown> | null;
          if (!raw) return json({ error: "invalid body" }, 400);
          // Resend webhooks wrap the email under `data`; flat payloads (n8n,
          // CloudMailin, custom forwarders) put the fields at the top level.
          const d = (raw.data && typeof raw.data === "object" ? raw.data : raw) as Record<string, unknown>;

          const sender = parseSender(d.from ?? d.sender ?? d.From);
          if (!sender.email) return json({ error: "no sender address" }, 400);

          const subject = clip(d.subject ?? d.Subject, 200);
          const textBody = clip(d.text ?? d.plain ?? d.body ?? d.text_body, 8000);
          const htmlBody = clip(d.html ?? d.html_body, 20000);
          const content = textBody ?? (htmlBody ? htmlToText(htmlBody).slice(0, 8000) : null);
          const providerId = clip(d.email_id ?? d.message_id ?? d.messageId ?? d.id, 180);
          const externalId = providerId ? `mail:${providerId}` : null;

          // Replay guard — same provider message id for this tenant → no-op.
          if (externalId) {
            const { data: dup } = await supabaseAdmin
              .from("messages").select("id")
              .eq("tenant_id", tenantId).eq("external_message_id", externalId)
              .maybeSingle();
            if (dup) return json({ ok: true, deduped: true });
          }

          // Match the sender to a client of this tenant (case-insensitive).
          // % and _ are ilike wildcards — escape them so an address like
          // a_b@x.com can only match itself.
          const { data: matches, error: matchErr } = await supabaseAdmin
            .from("clients")
            .select("id, first_name, last_name, email")
            .eq("tenant_id", tenantId)
            .ilike("email", sender.email.replace(/([%_\\])/g, "\\$1"))
            .limit(2);
          if (matchErr) throw matchErr;
          const client = matches && matches.length === 1 ? matches[0] : null;

          if (client) {
            const { error: insertErr } = await supabaseAdmin.from("messages").insert({
              tenant_id: tenantId,
              client_id: client.id,
              channel: "email",
              direction: "inbound",
              status: "received",
              external_message_id: externalId,
              content: subject ? `נושא: ${subject}\n\n${content ?? ""}`.trim() : content ?? "(מייל ללא תוכן)",
            });
            if (insertErr) throw insertErr;

            // Optional staff alert, same fire-and-forget n8n convention as
            // notify-message; gated by the existing notifications toggle.
            const notif = ((tenant.settings as Record<string, unknown> | null)?.notifications ?? {}) as {
              admin_email_inbound_msg?: boolean;
            };
            const webhookUrl = process.env.N8N_NOTIFY_MESSAGE_URL;
            if (webhookUrl && notif.admin_email_inbound_msg) {
              void fetch(webhookUrl, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  event: "message.inbound",
                  tenantId,
                  clientId: client.id,
                  channel: "email",
                  from: sender.email,
                  subject,
                }),
              }).catch((e) => console.warn("[email-inbound] notify webhook failed", e));
            }
            return json({ ok: true, matched: "client" });
          }

          // Unknown sender → Intake board, never a silent drop.
          const { error: intakeErr } = await supabaseAdmin.from("intake_inquiries").insert({
            tenant_id: tenantId,
            channel: "email",
            full_name: sender.name ?? sender.email,
            email: sender.email,
            phone: null,
            subject,
            body: content ? content.slice(0, 4000) : null,
            suggested_category: null,
            source_meta: { via: "email-inbound", provider_id: providerId },
          });
          if (intakeErr) throw intakeErr;
          return json({ ok: true, matched: "intake" });
        } catch (e) {
          console.error("[email-inbound]", e);
          return json({ error: "internal" }, 500);
        }
      },
    },
  },
});
