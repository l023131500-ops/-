import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { TenantSettings } from "@/features/settings/queries";

// Proactive client notification over the real channels (flagship spec items
// 4+9 seam): a consent request parked in the portal is invisible to a client
// who never logs in, so the referral stalls. This helper mirrors the staff
// timeline's manual send — insert the outbound `messages` row under RLS, then
// let /api/email-send and /api/whatsapp-send perform delivery — so every
// existing safety gate applies unchanged: TEST MODE is the hard default and a
// live send still requires the per-office switch AND the platform env flag.
//
// Best-effort by design: it must never break the action that triggered it.
// Every failure is caught, summarized in a toast, and reported in the return
// value; nothing throws.

export type ClientNotifyChannel = "email" | "whatsapp";

export type ClientNotifyOutcome = {
  channel: ClientNotifyChannel;
  ok: boolean;
  /** "test" | "live" on success, undefined on failure/skip */
  mode?: string;
  error?: string;
};

/**
 * Which channels the office wants for client-facing consent notices.
 * Missing key = enabled (same "default on, opt out" convention as modules) —
 * safe because delivery itself is test-mode gated server-side.
 */
export function consentNotifyChannels(settings: TenantSettings | null | undefined): ClientNotifyChannel[] {
  const n = settings?.notifications ?? {};
  const channels: ClientNotifyChannel[] = [];
  if (n.client_consent_email !== false) channels.push("email");
  if (n.client_consent_whatsapp !== false) channels.push("whatsapp");
  return channels;
}

export function consentRequestText(opts: {
  clientFirstName?: string | null;
  tenantName?: string | null;
  partnerName?: string | null;
  portalUrl: string;
}): string {
  const greeting = opts.clientFirstName ? `שלום ${opts.clientFirstName},` : "שלום,";
  const office = opts.tenantName ? `משרד ${opts.tenantName}` : "המשרד המטפל";
  const partner = opts.partnerName ?? "גורם מקצועי";
  return (
    `${greeting}\n` +
    `${office} מבקש את אישורך להעביר פרטים מהתיק שלך אל ${partner}.\n` +
    `לפני כל החלטה תוכל לראות בדיוק אילו פרטים יועברו — שום מידע לא עובר בלי אישורך.\n` +
    `לאישור או דחייה היכנס לאזור האישי, לשונית "שיתופי פעולה": ${opts.portalUrl}`
  );
}

const sendEndpoint: Record<ClientNotifyChannel, string> = {
  email: "email-send",
  whatsapp: "whatsapp-send",
};

const channelHe: Record<ClientNotifyChannel, string> = {
  email: "מייל",
  whatsapp: "וואטסאפ",
};

/**
 * Notify a client that a consent request awaits them in the portal.
 * Fire-and-forget from call sites (`void notifyClientConsentRequest(...)`).
 */
export async function notifyClientConsentRequest(opts: {
  tenantId: string;
  clientId: string;
  /** staff profile id recorded as messages.sent_by */
  sentBy: string | null;
  partnerName?: string | null;
}): Promise<ClientNotifyOutcome[]> {
  const outcomes: ClientNotifyOutcome[] = [];
  try {
    const [{ data: tenant }, { data: client }] = await Promise.all([
      supabase.from("tenants").select("name, settings").eq("id", opts.tenantId).maybeSingle(),
      supabase.from("clients").select("first_name, email, phone").eq("id", opts.clientId).maybeSingle(),
    ]);
    if (!client) return outcomes;

    const channels = consentNotifyChannels((tenant?.settings ?? {}) as TenantSettings);
    // Skip a channel entirely when the client has no address for it — a row
    // that can only ever fail helps nobody. Present-but-invalid values are
    // still attempted so the strict server-side check surfaces them as a
    // visible "failed" on the timeline, where staff can fix the record.
    const reachable = channels.filter((c) => (c === "email" ? !!client.email?.trim() : !!client.phone?.trim()));
    if (reachable.length === 0) return outcomes;

    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) return outcomes;

    const content = consentRequestText({
      clientFirstName: client.first_name,
      tenantName: tenant?.name,
      partnerName: opts.partnerName,
      portalUrl: `${window.location.origin}${import.meta.env.BASE_URL}client-area/consents`,
    });

    for (const channel of reachable) {
      try {
        const { data: inserted, error } = await supabase.from("messages").insert({
          tenant_id: opts.tenantId,
          client_id: opts.clientId,
          channel,
          direction: "outbound",
          status: "sent",
          content,
          sent_by: opts.sentBy,
        }).select("id").single();
        if (error || !inserted?.id) {
          outcomes.push({ channel, ok: false, error: error?.message ?? "insert failed" });
          continue;
        }
        const res = await fetch(`${import.meta.env.BASE_URL}api/${sendEndpoint[channel]}`, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
          body: JSON.stringify({
            messageId: inserted.id,
            ...(channel === "email" ? { subject: "בקשת אישור להעברת מידע ממתינה לך" } : {}),
          }),
        });
        const out = (await res.json().catch(() => null)) as { mode?: string; error?: string } | null;
        if (!res.ok) outcomes.push({ channel, ok: false, error: out?.error ?? `שגיאה ${res.status}` });
        else outcomes.push({ channel, ok: true, mode: out?.mode });
      } catch (e) {
        outcomes.push({ channel, ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    }

    const parts = outcomes.map((o) =>
      `${channelHe[o.channel]} — ${o.ok ? (o.mode === "test" ? "מצב טסט" : "נשלח") : "נכשל"}`,
    );
    if (parts.length > 0) {
      const anyFail = outcomes.some((o) => !o.ok);
      (anyFail ? toast.warning : toast.info)("התראה ללקוח על בקשת האישור", { description: parts.join(" · ") });
    }
  } catch (e) {
    // never let a notification failure surface as a referral failure
    console.error("[notifyClientConsentRequest]", e);
  }
  return outcomes;
}
