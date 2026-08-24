import { createFileRoute } from "@tanstack/react-router";

// Inbound WhatsApp webhook (flagship spec item 9 — the receiving half of the
// two-way WhatsApp sync, sibling of /api/public/email-inbound). The tenant
// points their Green API instance's "Webhook URL" at
//   <origin>/crm/api/public/whatsapp-inbound?tenant=<tenant_id>&key=<inbound_secret>
// and every incoming message lands in the CRM:
//
//   sender matches a client's phone  → inbound `messages` row on the client's
//     timeline (channel whatsapp, status received → feeds the existing unread
//     badge and the realtime subscription in MessagesTab/inbox)
//   unknown sender                   → intake_inquiries row (channel whatsapp)
//     on the Intake board, so no message is ever silently dropped
//
// Auth is the same tenant-uuid + per-tenant secret convention as
// /api/public/email-inbound and /api/public/yemot-ivr (the secret lives in
// tenants.settings.whatsapp and is generated from the settings screen).
// Idempotency: Green API's idMessage is stored as external_message_id
// (`wa:<id>`), and a replayed webhook with the same id is acknowledged
// without inserting twice. Non-message webhooks (state changes, outgoing
// status callbacks) are acknowledged and ignored so Green API never retries.

type WhatsappSettings = { enabled?: boolean; inbound_secret?: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const clip = (v: unknown, max: number) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

const digitsOnly = (v: string) => v.replace(/\D/g, "");
/** 9725x… → 05x…; keeps local numbers as-is (same rule as yemot-ivr). */
const normPhone = (v: string) => {
  const d = digitsOnly(v);
  return d.startsWith("972") ? `0${d.slice(3)}` : d;
};

// Human-readable fallbacks for Green API's non-text message types, so a
// photo or voice note still shows up on the timeline instead of vanishing.
const TYPE_LABEL: Record<string, string> = {
  imageMessage: "תמונה",
  videoMessage: "סרטון",
  audioMessage: "הודעה קולית",
  documentMessage: "מסמך",
  stickerMessage: "מדבקה",
  locationMessage: "מיקום",
  contactMessage: "איש קשר",
  pollMessage: "סקר",
};

type MessageData = {
  typeMessage?: string;
  textMessageData?: { textMessage?: string };
  extendedTextMessageData?: { text?: string };
  fileMessageData?: { caption?: string; fileName?: string };
  quotedMessage?: { textMessage?: string };
};

/** Green API messageData → timeline text (never empty for a known type). */
function extractText(md: MessageData | null | undefined): string | null {
  if (!md) return null;
  const text =
    clip(md.textMessageData?.textMessage, 8000) ??
    clip(md.extendedTextMessageData?.text, 8000) ??
    clip(md.fileMessageData?.caption, 8000);
  if (text) return text;
  const label = md.typeMessage ? TYPE_LABEL[md.typeMessage] : null;
  if (label) {
    const fileName = clip(md.fileMessageData?.fileName, 200);
    return fileName ? `(${label}: ${fileName})` : `(${label} — ללא טקסט)`;
  }
  return null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

export const Route = createFileRoute("/api/public/whatsapp-inbound")({
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
          const wa = ((tenant?.settings as Record<string, unknown> | null)?.whatsapp ?? {}) as WhatsappSettings;
          if (!tenant || wa.enabled !== true || !wa.inbound_secret || wa.inbound_secret !== key)
            return json({ error: "unauthorized" }, 401);

          const raw = (await request.json().catch(() => null)) as Record<string, unknown> | null;
          if (!raw) return json({ error: "invalid body" }, 400);

          // Green API posts every event type to one URL — only incoming
          // messages belong on the timeline. A flat payload (n8n, custom
          // bridge) has no typeWebhook and is treated as an incoming message.
          const typeWebhook = typeof raw.typeWebhook === "string" ? raw.typeWebhook : null;
          if (typeWebhook && typeWebhook !== "incomingMessageReceived")
            return json({ ok: true, ignored: typeWebhook });

          const senderData = (raw.senderData ?? {}) as Record<string, unknown>;
          const chatId = clip(senderData.chatId ?? raw.chatId ?? raw.from ?? raw.phone, 64);
          if (!chatId) return json({ error: "no sender" }, 400);
          // Group chats: the "sender" is the group, not a person — a client's
          // file must never collect an entire group's chatter.
          if (chatId.endsWith("@g.us")) return json({ ok: true, ignored: "group" });

          const senderPhone = normPhone(chatId.split("@")[0]);
          if (senderPhone.length < 7) return json({ error: "no sender" }, 400);
          const senderName = clip(senderData.senderName ?? raw.senderName ?? raw.name, 120);

          const content =
            extractText(raw.messageData as MessageData | undefined) ??
            clip(raw.text ?? raw.message ?? raw.body, 8000) ??
            "(הודעה ללא תוכן)";

          const providerId = clip(raw.idMessage ?? raw.id ?? raw.message_id, 180);
          const externalId = providerId ? `wa:${providerId}` : null;

          // Replay guard — same Green API message id for this tenant → no-op.
          if (externalId) {
            const { data: dup } = await supabaseAdmin
              .from("messages").select("id")
              .eq("tenant_id", tenantId).eq("external_message_id", externalId)
              .maybeSingle();
            if (dup) return json({ ok: true, deduped: true });
          }

          // Match the sender to a client of this tenant by phone — same
          // last-7-digits prefilter + exact normalized comparison as the
          // Yemot voice extension, so "0501234567" and "+972501234567" meet.
          const last7 = senderPhone.slice(-7);
          const { data: candidates, error: matchErr } = await supabaseAdmin
            .from("clients")
            .select("id, first_name, last_name, phone")
            .eq("tenant_id", tenantId)
            .ilike("phone", `%${last7}`)
            .limit(10);
          if (matchErr) throw matchErr;
          const matches = (candidates ?? []).filter((c) => normPhone(c.phone ?? "") === senderPhone);
          const client = matches.length === 1 ? matches[0] : null;

          if (client) {
            const { error: insertErr } = await supabaseAdmin.from("messages").insert({
              tenant_id: tenantId,
              client_id: client.id,
              channel: "whatsapp",
              direction: "inbound",
              status: "received",
              external_message_id: externalId,
              content,
            });
            if (insertErr) throw insertErr;

            // Optional staff alert, same fire-and-forget n8n convention and
            // the same inbound-message toggle the email webhook honours.
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
                  channel: "whatsapp",
                  from: senderPhone,
                }),
              }).catch((e) => console.warn("[whatsapp-inbound] notify webhook failed", e));
            }
            return json({ ok: true, matched: "client" });
          }

          // Unknown (or ambiguous) sender → Intake board, never a silent drop.
          const { error: intakeErr } = await supabaseAdmin.from("intake_inquiries").insert({
            tenant_id: tenantId,
            channel: "whatsapp",
            full_name: senderName ?? senderPhone,
            email: null,
            phone: senderPhone,
            subject: null,
            body: content.slice(0, 4000),
            suggested_category: null,
            source_meta: {
              via: "whatsapp-inbound",
              provider_id: providerId,
              ...(matches.length > 1 ? { ambiguous_client_matches: matches.length } : {}),
            },
          });
          if (intakeErr) throw intakeErr;
          return json({ ok: true, matched: "intake" });
        } catch (e) {
          console.error("[whatsapp-inbound]", e);
          return json({ error: "internal" }, 500);
        }
      },
    },
  },
});
