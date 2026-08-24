import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CHANNEL, PARTNER_CATEGORY, REFERRAL_STATUS } from "@/features/clients/constants";
import { isModuleEnabled, type ModulesMap } from "@/features/customize/modules";
import { meProfileQuery } from "@/features/clients/queries";
import { tenantModulesQuery } from "@/features/customize/queries";
import {
  countUnseen,
  loadSeen,
  saveSeen,
  withSeen,
  type SeenState,
} from "@/features/clients/portalNotifications";

// Staff notifications center (flagship spec follow-up to rounds 10+14): the
// portal bell's mirror image. One bell in the staff header that surfaces the
// client's decisions coming BACK to the office — consent approvals/declines,
// unread inbound messages on any channel, new intake inquiries, partner
// updates on referrals and client-uploaded documents — derived entirely from
// data staff already read under tenant RLS. No new tables. Consent decisions
// and new inquiries are sticky: they stay counted until resolved server-side
// (the decision message marked read / the inquiry triaged), not until glanced.

export type StaffNotificationKind =
  | "consent-approved"
  | "consent-declined"
  | "message"
  | "intake"
  | "referral"
  | "document";

export type StaffNotification = {
  /** stable identity; status-bearing items carry the status so a change re-notifies */
  key: string;
  kind: StaffNotificationKind;
  title: string;
  detail?: string;
  at: string | null;
  url: string;
  /** counted until resolved server-side (read/triaged), not until viewed */
  sticky?: boolean;
  /** renders in destructive tones — a decline needs the office's attention */
  danger?: boolean;
};

// Must match the literals respond_referral_consent() writes to the timeline
// (supabase/migrations/20260824160000_client_consents.sql) — that message row
// IS the decision event, and the only thing that distinguishes a client-made
// approval from a legacy/auto-approved referral.
export const CONSENT_APPROVED_PREFIX = "אישרתי את העברת הפרטים";
export const CONSENT_DECLINED_PREFIX = "דחיתי את העברת הפרטים";

type NamedClient = { id: string; first_name: string | null; last_name: string | null } | null;

export type InboxMessageSrc = {
  id: string;
  client_id: string | null;
  channel: string;
  direction: string;
  content: string | null;
  created_at: string;
  client: NamedClient;
  partner: { company_name: string | null } | null;
};

export type IntakeSrc = {
  id: string;
  full_name: string;
  subject: string | null;
  channel: string;
  created_at: string;
};

export type ReferralSrc = {
  id: string;
  status: string;
  updated_at: string;
  client: NamedClient;
  partner: { company_name: string | null; category: string | null } | null;
};

export type DocumentSrc = {
  id: string;
  client_id: string | null;
  file_name: string;
  uploaded_by: string | null;
  created_at: string;
  client: (NonNullable<NamedClient> & { auth_user_id: string | null }) | null;
};

export type StaffNotificationSources = {
  messages: InboxMessageSrc[];
  intake: IntakeSrc[];
  referrals: ReferralSrc[];
  documents: DocumentSrc[];
};

const label = (map: Record<string, string>, key: string) => map[key] ?? key;
const truncate = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
const clientName = (c: NamedClient) =>
  c ? `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "לקוח" : null;

export const MAX_STAFF_FEED_ITEMS = 30;

/** Pure: turn the raw staff reads into a sorted, capped notification feed. */
export function buildStaffNotifications(
  src: StaffNotificationSources,
  modules: ModulesMap | null | undefined,
): StaffNotification[] {
  const items: StaffNotification[] = [];
  const referralsOn = isModuleEnabled(modules, "referrals");

  for (const m of src.messages) {
    if (m.direction !== "inbound") continue; // outbound is the office's own voice
    const sender = clientName(m.client) ?? m.partner?.company_name ?? "שולח לא מזוהה";
    const isDecision =
      m.channel === "internal" &&
      !!m.content &&
      (m.content.startsWith(CONSENT_APPROVED_PREFIX) || m.content.startsWith(CONSENT_DECLINED_PREFIX));

    if (isDecision) {
      if (!referralsOn) continue; // consent flow lives inside the referrals module
      const approved = m.content!.startsWith(CONSENT_APPROVED_PREFIX);
      items.push({
        key: `decision:${m.id}`,
        kind: approved ? "consent-approved" : "consent-declined",
        title: approved ? "הלקוח אישר את העברת הפרטים" : "הלקוח דחה את העברת הפרטים",
        detail: `${sender} · ${truncate(m.content!, 90)}`,
        at: m.created_at,
        // the client-file timeline marks the decision message read = resolves it
        url: m.client_id ? `/clients/${m.client_id}` : "/messages",
        sticky: true,
        danger: !approved,
      });
    } else {
      items.push({
        key: `msg:${m.id}`,
        kind: "message",
        title: `הודעה נכנסת · ${label(CHANNEL as Record<string, string>, m.channel)}`,
        detail: m.content ? `${sender} · ${truncate(m.content, 90)}` : sender,
        at: m.created_at,
        url: "/messages",
      });
    }
  }

  for (const q of src.intake) {
    items.push({
      key: `intake:${q.id}`,
      kind: "intake",
      title: "פנייה חדשה ממתינה בלוח הפניות",
      detail: q.subject ? `${q.full_name} · ${truncate(q.subject, 70)}` : q.full_name,
      at: q.created_at,
      url: "/intake",
      sticky: true, // stays counted until the inquiry is actually triaged
    });
  }

  if (referralsOn) {
    for (const r of src.referrals) {
      const bits = [clientName(r.client), r.partner?.company_name].filter(Boolean) as string[];
      const cat = r.partner?.category
        ? label(PARTNER_CATEGORY as Record<string, string>, r.partner.category)
        : null;
      items.push({
        key: `ref:${r.id}:${r.status}`,
        kind: "referral",
        title: `עדכון מהשותף: ${label(REFERRAL_STATUS as Record<string, string>, r.status)}`,
        detail: [bits.join(" · "), cat].filter(Boolean).join(" · ") || undefined,
        at: r.updated_at,
        url: "/referrals",
      });
    }
  }

  for (const d of src.documents) {
    // only documents the client uploaded from the portal are news to staff
    if (!d.uploaded_by || !d.client?.auth_user_id || d.uploaded_by !== d.client.auth_user_id) continue;
    items.push({
      key: `doc:${d.id}`,
      kind: "document",
      title: "הלקוח העלה מסמך לתיק",
      detail: [clientName(d.client), d.file_name].filter(Boolean).join(" · "),
      at: d.created_at,
      url: d.client_id ? `/clients/${d.client_id}` : "/documents",
    });
  }

  // sticky (action needed) first, then newest first
  items.sort((a, b) => {
    if (!!a.sticky !== !!b.sticky) return a.sticky ? -1 : 1;
    return (b.at ?? "").localeCompare(a.at ?? "");
  });
  return items.slice(0, MAX_STAFF_FEED_ITEMS);
}

// ---------- data ----------

// Each source is guarded separately: a missing table (pending migration on the
// live project) degrades that source to empty instead of blanking the header.
async function safe<T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T | []> {
  try {
    const { data, error } = await p;
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export const staffNotificationSourcesQuery = (enabled: boolean) => ({
  queryKey: ["staff-notifications"],
  enabled,
  refetchInterval: 60_000,
  queryFn: async (): Promise<StaffNotificationSources> => {
    const [messages, intake, referrals, documents] = await Promise.all([
      safe(
        supabase
          .from("messages")
          .select(
            "id, client_id, channel, direction, content, created_at, client:clients(id, first_name, last_name), partner:partners(company_name)",
          )
          .eq("direction", "inbound")
          .neq("status", "read")
          .order("created_at", { ascending: false })
          .limit(50),
      ),
      safe(
        supabase
          .from("intake_inquiries")
          .select("id, full_name, subject, channel, created_at")
          .eq("status", "new")
          .order("created_at", { ascending: false })
          .limit(30),
      ),
      safe(
        supabase
          .from("partner_referrals")
          .select(
            "id, status, updated_at, client:clients(id, first_name, last_name), partner:partners(company_name, category)",
          )
          .eq("consent_status", "approved")
          .in("status", ["in_progress", "completed", "rejected"])
          .order("updated_at", { ascending: false })
          .limit(30),
      ),
      safe(
        supabase
          .from("documents")
          .select(
            "id, client_id, file_name, uploaded_by, created_at, client:clients(id, first_name, last_name, auth_user_id)",
          )
          .not("client_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(50),
      ),
    ]);
    return {
      messages: messages as InboxMessageSrc[],
      intake: intake as IntakeSrc[],
      referrals: referrals as ReferralSrc[],
      documents: documents as DocumentSrc[],
    };
  },
});

const SEEN_NS = "staff";

export function useStaffNotifications() {
  // gate on a staff profile row: partner-portal users share the auth shell but
  // have no profiles row, so for them the bell simply never mounts
  const { data: profile } = useQuery(meProfileQuery());
  const { data: modules } = useQuery({ ...tenantModulesQuery(), enabled: !!profile });
  const { data } = useQuery(staffNotificationSourcesQuery(!!profile));
  const [seen, setSeen] = useState<SeenState>({ keys: [] });

  const seenId = profile?.auth_user_id ?? null;

  useEffect(() => {
    if (seenId) setSeen(loadSeen(seenId, SEEN_NS));
  }, [seenId]);

  const items = useMemo(() => (data ? buildStaffNotifications(data, modules) : []), [data, modules]);

  const unseenCount = useMemo(() => countUnseen(items, seen), [items, seen]);

  const markAllSeen = useCallback(() => {
    if (!seenId) return;
    setSeen((prev) => {
      const next = withSeen(prev, items);
      saveSeen(seenId, next, SEEN_NS);
      return next;
    });
  }, [seenId, items]);

  return { isStaff: !!profile, items, seen, unseenCount, markAllSeen };
}
