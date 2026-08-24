import { createFileRoute } from "@tanstack/react-router";

// Real email dispatch for the messages timeline (flagship spec item 9 —
// email leg of the voice/email/system/WhatsApp sync). The staff client first
// inserts the outbound `messages` row itself under RLS (exactly as before);
// this route only performs the actual delivery and updates the row's status,
// so nothing is ever written outside tenant isolation.
//
// Resend is called over raw HTTP (same frozen-lockfile reasoning as
// /api/ai-extend — no new dependency). TEST MODE is the hard default per the
// platform rule "nothing sends for real without explicit opt-in": a live send
// happens only when BOTH the platform env EMAIL_LIVE_MODE=live AND the
// tenant's settings.email.live_enabled are on (and RESEND_API_KEY exists).
// Anything else marks the message `test_mode` — visible in the timeline, no
// network call to Resend at all.

type EmailSettings = {
  enabled?: boolean;
  inbound_secret?: string;
  live_enabled?: boolean;
  reply_to?: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const Route = createFileRoute("/api/email-send")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const auth = request.headers.get("authorization") ?? "";
          const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
          if (!token) return json({ error: "נדרשת התחברות" }, 401);

          const body = await request.json().catch(() => null);
          const messageId = typeof body?.messageId === "string" ? body.messageId : "";
          const subjectIn = typeof body?.subject === "string" ? body.subject.trim().slice(0, 200) : "";
          if (!messageId) return json({ error: "messageId required" }, 400);

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
          if (userErr || !userData.user) return json({ error: "ההתחברות אינה תקפה" }, 401);

          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("id, role, tenant_id")
            .eq("auth_user_id", userData.user.id)
            .maybeSingle();
          if (!profile) return json({ error: "המשתמש אינו איש צוות" }, 403);
          if (profile.role === "viewer") return json({ error: "לצופה אין הרשאת שליחה" }, 403);

          const { data: message } = await supabaseAdmin
            .from("messages")
            .select("id, tenant_id, client_id, channel, direction, content, status")
            .eq("id", messageId)
            .maybeSingle();
          if (!message || message.tenant_id !== profile.tenant_id) return json({ error: "ההודעה לא נמצאה" }, 404);
          if (message.channel !== "email" || message.direction !== "outbound")
            return json({ error: "רק הודעת מייל יוצאת ניתנת לשליחה" }, 400);
          if (!message.client_id) return json({ error: "ההודעה אינה משויכת ללקוח" }, 400);

          const setStatus = (status: string, externalId?: string) =>
            supabaseAdmin
              .from("messages")
              .update(externalId ? { status, external_message_id: externalId } : { status })
              .eq("id", message.id);

          const { data: client } = await supabaseAdmin
            .from("clients")
            .select("id, first_name, last_name, email")
            .eq("id", message.client_id)
            .maybeSingle();
          if (!client?.email || !EMAIL_RE.test(client.email)) {
            await setStatus("failed");
            return json({ error: "ללקוח אין כתובת מייל תקינה בתיק" }, 400);
          }

          const { data: tenant } = await supabaseAdmin
            .from("tenants")
            .select("id, name, settings")
            .eq("id", profile.tenant_id)
            .maybeSingle();
          const settings = (tenant?.settings ?? {}) as {
            email?: EmailSettings;
            integrations?: { email_sender?: string };
          };
          const email = settings.email ?? {};

          const subject = subjectIn || `הודעה חדשה מ־${tenant?.name ?? "המערכת"}`;
          const apiKey = process.env.RESEND_API_KEY;
          const live = process.env.EMAIL_LIVE_MODE === "live" && email.live_enabled === true && !!apiKey;

          if (!live) {
            await setStatus("test_mode");
            return json({
              ok: true,
              mode: "test",
              detail: apiKey
                ? "מצב טסט — המייל נרשם בציר אך לא נשלח בפועל. הפעלת שליחה חיה: מתג בהגדרות + EMAIL_LIVE_MODE=live בסביבה."
                : "מצב טסט — RESEND_API_KEY אינו מוגדר בסביבה, המייל נרשם בציר בלבד.",
            });
          }

          const from = settings.integrations?.email_sender?.trim() || "onboarding@resend.dev";
          const text = message.content ?? "";
          const html =
            `<div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#111">` +
            `<p style="white-space:pre-wrap">${esc(text)}</p>` +
            `<hr style="border:none;border-top:1px solid #ddd;margin:16px 0">` +
            `<p style="font-size:12px;color:#666">${esc(tenant?.name ?? "")} · הודעה זו נשלחה ממערכת ניהול הלקוחות</p>` +
            `</div>`;

          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 10000);
          let res: Response | null = null;
          try {
            res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
              body: JSON.stringify({
                from,
                to: [client.email],
                subject,
                text,
                html,
                ...(email.reply_to && EMAIL_RE.test(email.reply_to) ? { reply_to: email.reply_to } : {}),
              }),
              signal: controller.signal,
            });
          } catch (e) {
            console.error("[email-send] resend fetch failed", e);
          } finally {
            clearTimeout(timer);
          }

          if (!res?.ok) {
            const errBody = res ? await res.text().catch(() => "") : "network/timeout";
            console.error("[email-send] resend error", res?.status, errBody.slice(0, 500));
            await setStatus("failed");
            return json({ error: "שליחת המייל נכשלה — ראה יומן שרת" }, 502);
          }

          const sent = (await res.json().catch(() => null)) as { id?: string } | null;
          await setStatus("delivered", sent?.id ? `resend:${sent.id}` : undefined);
          return json({ ok: true, mode: "live" });
        } catch (e) {
          console.error("[email-send]", e);
          return json({ error: "internal" }, 500);
        }
      },
    },
  },
});
