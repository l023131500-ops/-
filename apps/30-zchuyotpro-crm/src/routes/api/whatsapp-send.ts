import { createFileRoute } from "@tanstack/react-router";

// Real WhatsApp dispatch for the messages timeline (flagship spec item 9 —
// the WhatsApp leg of the voice/email/system/WhatsApp sync, sibling of
// /api/email-send). The staff client first inserts the outbound `messages`
// row itself under RLS (exactly as before); this route only performs the
// actual delivery through the tenant's Green API instance and updates the
// row's status, so nothing is ever written outside tenant isolation.
//
// Green API is called over raw HTTP (same frozen-lockfile reasoning as
// /api/email-send — no new dependency). TEST MODE is the hard default per
// the platform rule "nothing sends for real without explicit opt-in": a live
// send happens only when BOTH the platform env WHATSAPP_LIVE_MODE=live AND
// the tenant's settings.whatsapp.live_enabled are on (and the Green API
// instance id + token are configured in the integrations tab). Anything else
// marks the message `test_mode` — visible in the timeline, no network call.

type WhatsappSettings = {
  enabled?: boolean;
  inbound_secret?: string;
  live_enabled?: boolean;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

// Green API credentials are embedded in the request path — refuse anything
// that could not possibly be a credential before it reaches URL construction.
const INSTANCE_RE = /^[A-Za-z0-9-]{4,64}$/;
const TOKEN_RE = /^[A-Za-z0-9_-]{10,128}$/;

/** Israeli-first phone → WhatsApp chatId ("9725…@c.us"), null when hopeless. */
function phoneToChatId(raw: string): string | null {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = `972${d.slice(1)}`; // local 05x-xxxxxxx
  if (d.length < 11 || d.length > 15) return null; // 9725xxxxxxxx is 12
  return `${d}@c.us`;
}

export const Route = createFileRoute("/api/whatsapp-send")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const auth = request.headers.get("authorization") ?? "";
          const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
          if (!token) return json({ error: "נדרשת התחברות" }, 401);

          const body = await request.json().catch(() => null);
          const messageId = typeof body?.messageId === "string" ? body.messageId : "";
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
          if (message.channel !== "whatsapp" || message.direction !== "outbound")
            return json({ error: "רק הודעת וואטסאפ יוצאת ניתנת לשליחה" }, 400);
          if (!message.client_id) return json({ error: "ההודעה אינה משויכת ללקוח" }, 400);

          const setStatus = (status: string, externalId?: string) =>
            supabaseAdmin
              .from("messages")
              .update(externalId ? { status, external_message_id: externalId } : { status })
              .eq("id", message.id);

          const { data: client } = await supabaseAdmin
            .from("clients")
            .select("id, first_name, last_name, phone")
            .eq("id", message.client_id)
            .maybeSingle();
          const chatId = client?.phone ? phoneToChatId(client.phone) : null;
          if (!chatId) {
            await setStatus("failed");
            return json({ error: "ללקוח אין מספר טלפון תקין בתיק" }, 400);
          }

          const { data: tenant } = await supabaseAdmin
            .from("tenants")
            .select("id, name, settings")
            .eq("id", profile.tenant_id)
            .maybeSingle();
          const settings = (tenant?.settings ?? {}) as {
            whatsapp?: WhatsappSettings;
            integrations?: { whatsapp_instance_id?: string; whatsapp_api_token?: string };
          };
          const wa = settings.whatsapp ?? {};
          const instanceId = settings.integrations?.whatsapp_instance_id?.trim() ?? "";
          const apiToken = settings.integrations?.whatsapp_api_token?.trim() ?? "";
          const credsOk = INSTANCE_RE.test(instanceId) && TOKEN_RE.test(apiToken);
          const live = process.env.WHATSAPP_LIVE_MODE === "live" && wa.live_enabled === true && credsOk;

          if (!live) {
            await setStatus("test_mode");
            return json({
              ok: true,
              mode: "test",
              detail: credsOk
                ? "מצב טסט — ההודעה נרשמה בציר אך לא נשלחה בפועל. הפעלת שליחה חיה: מתג בלשונית וואטסאפ + WHATSAPP_LIVE_MODE=live בסביבה."
                : "מצב טסט — פרטי Green API (Instance ID + Token) אינם מוגדרים בלשונית אינטגרציות, ההודעה נרשמה בציר בלבד.",
            });
          }

          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 10000);
          let res: Response | null = null;
          try {
            res = await fetch(
              `https://api.green-api.com/waInstance${encodeURIComponent(instanceId)}/sendMessage/${encodeURIComponent(apiToken)}`,
              {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ chatId, message: message.content ?? "" }),
                signal: controller.signal,
              },
            );
          } catch (e) {
            console.error("[whatsapp-send] green-api fetch failed", e);
          } finally {
            clearTimeout(timer);
          }

          if (!res?.ok) {
            const errBody = res ? await res.text().catch(() => "") : "network/timeout";
            console.error("[whatsapp-send] green-api error", res?.status, errBody.slice(0, 500));
            await setStatus("failed");
            return json({ error: "שליחת הוואטסאפ נכשלה — ראה יומן שרת" }, 502);
          }

          const sent = (await res.json().catch(() => null)) as { idMessage?: string } | null;
          await setStatus("delivered", sent?.idMessage ? `wa:${sent.idMessage}` : undefined);
          return json({ ok: true, mode: "live" });
        } catch (e) {
          console.error("[whatsapp-send]", e);
          return json({ error: "internal" }, 500);
        }
      },
    },
  },
});
