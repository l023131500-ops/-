import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { CHANNEL, ENTITLEMENT_STATUS, PARTNER_CATEGORY, REFERRAL_STATUS } from "@/features/clients/constants";
import { isModuleEnabled, type ModulesMap } from "@/features/customize/modules";
import type { MyReferralRequest } from "@/features/clients/consents";

// Client-portal notifications center (flagship spec follow-up to section 4):
// one bell that surfaces every decision/event the client should know about,
// derived entirely from data the portal already reads under RLS — no new
// tables. "Seen" state lives in localStorage per client; pending consent
// requests are sticky and stay counted until the client actually decides.

export type PortalNotificationKind = "consent" | "referral" | "message" | "document" | "entitlement";

export type PortalNotification = {
  /** stable identity; for status-bearing items the status is part of the key so a change re-notifies */
  key: string;
  kind: PortalNotificationKind;
  title: string;
  detail?: string;
  /** ISO timestamp when known (referral updates carry no decision time — their send time is used) */
  at: string | null;
  url: string;
  /** actionable: counted as unseen until resolved server-side, not until viewed */
  sticky?: boolean;
};

type MessageRow = Tables<"messages">;
type DocumentRow = Tables<"documents">;
type EntitlementRow = Tables<"client_entitlements"> & {
  entitlement: { title: string | null } | null;
};

export type PortalNotificationSources = {
  requests: MyReferralRequest[];
  messages: MessageRow[];
  documents: DocumentRow[];
  entitlements: EntitlementRow[];
};

const label = (map: Record<string, string>, key: string) => map[key] ?? key;

const truncate = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

export const MAX_FEED_ITEMS = 30;

/** Pure: turn the raw portal reads into a sorted, capped notification feed. */
export function buildNotifications(src: PortalNotificationSources, modules: ModulesMap | null | undefined): PortalNotification[] {
  const items: PortalNotification[] = [];
  const referralsOn = isModuleEnabled(modules, "referrals");

  if (referralsOn) {
    for (const r of src.requests) {
      if (r.consent_status === "awaiting_client") {
        items.push({
          key: `consent:${r.id}`,
          kind: "consent",
          title: "בקשה להעברת פרטים ממתינה לאישורך",
          detail: `${r.partner_name} · ${label(PARTNER_CATEGORY as Record<string, string>, r.partner_category)}`,
          at: r.sent_at,
          url: "/client-area/consents",
          sticky: true,
        });
      } else if (r.consent_status === "approved" && ["in_progress", "completed", "rejected"].includes(r.status)) {
        // no decision timestamp on the RPC — key on the status so a change
        // re-notifies, and date the item by its send time (best lower bound)
        items.push({
          key: `ref:${r.id}:${r.status}`,
          kind: "referral",
          title: `עדכון טיפול בהפניה: ${label(REFERRAL_STATUS as Record<string, string>, r.status)}`,
          detail: `${r.partner_name} · ${label(PARTNER_CATEGORY as Record<string, string>, r.partner_category)}`,
          at: r.sent_at,
          url: "/client-area/consents",
        });
      }
    }
  }

  for (const m of src.messages) {
    if (m.direction !== "outbound") continue; // only office→client; the client's own messages are not news
    items.push({
      key: `msg:${m.id}`,
      kind: "message",
      title: `הודעה מהמשרד (${label(CHANNEL as Record<string, string>, m.channel)})`,
      detail: m.content ? truncate(m.content, 90) : undefined,
      at: m.created_at,
      url: "/client-area/messages",
    });
  }

  for (const d of src.documents) {
    items.push({
      key: `doc:${d.id}`,
      kind: "document",
      title: "מסמך חדש בתיק שלך",
      detail: d.file_name,
      at: d.created_at,
      url: "/client-area/documents",
    });
  }

  for (const e of src.entitlements) {
    items.push({
      key: `ent:${e.id}:${e.status}`,
      kind: "entitlement",
      title: `עדכון זכאות: ${label(ENTITLEMENT_STATUS as Record<string, string>, e.status)}`,
      detail: e.entitlement?.title ?? undefined,
      at: e.updated_at ?? e.created_at,
      url: "/client-area/entitlements",
    });
  }

  // sticky (action needed) first, then newest first
  items.sort((a, b) => {
    if (!!a.sticky !== !!b.sticky) return a.sticky ? -1 : 1;
    return (b.at ?? "").localeCompare(a.at ?? "");
  });
  return items.slice(0, MAX_FEED_ITEMS);
}

// ---------- seen state (localStorage, per client) ----------

export type SeenState = { keys: string[] };

const SEEN_KEY_CAP = 1000;
const storageKey = (clientId: string) => `crm30-portal-seen:${clientId}`;

export function loadSeen(clientId: string): SeenState {
  try {
    const raw = localStorage.getItem(storageKey(clientId));
    if (!raw) return { keys: [] };
    const parsed = JSON.parse(raw) as SeenState;
    return Array.isArray(parsed?.keys) ? { keys: parsed.keys.filter((k) => typeof k === "string") } : { keys: [] };
  } catch {
    return { keys: [] };
  }
}

/** Pure: mark every non-sticky item as seen, keeping older keys (capped). */
export function withSeen(prev: SeenState, items: PortalNotification[]): SeenState {
  const next = new Set(prev.keys);
  for (const i of items) if (!i.sticky) next.add(i.key);
  const keys = [...next];
  return { keys: keys.length > SEEN_KEY_CAP ? keys.slice(keys.length - SEEN_KEY_CAP) : keys };
}

export function saveSeen(clientId: string, state: SeenState) {
  try {
    localStorage.setItem(storageKey(clientId), JSON.stringify(state));
  } catch {
    // storage full/blocked — the bell just stays conservative and re-shows
  }
}

export function isUnseen(item: PortalNotification, seen: SeenState): boolean {
  return !!item.sticky || !seen.keys.includes(item.key);
}

export function countUnseen(items: PortalNotification[], seen: SeenState): number {
  return items.filter((i) => isUnseen(i, seen)).length;
}

// ---------- data hook ----------

// Each source is guarded separately: a missing table/RPC (pending migration)
// degrades that source to empty instead of blanking the whole portal header.
async function safe<T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T | []> {
  try {
    const { data, error } = await p;
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export const portalNotificationSourcesQuery = (clientId: string | undefined) => ({
  queryKey: ["portal-notifications", clientId],
  enabled: !!clientId,
  refetchInterval: 60_000,
  queryFn: async (): Promise<PortalNotificationSources> => {
    if (!clientId) return { requests: [], messages: [], documents: [], entitlements: [] };
    const [requests, messages, documents, entitlements] = await Promise.all([
      safe(supabase.rpc("get_my_referral_requests")),
      safe(
        supabase
          .from("messages")
          .select("*")
          .eq("client_id", clientId)
          .eq("direction", "outbound")
          .order("created_at", { ascending: false })
          .limit(50),
      ),
      safe(
        supabase
          .from("documents")
          .select("*")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false })
          .limit(50),
      ),
      safe(
        supabase
          .from("client_entitlements")
          .select("*, entitlement:entitlements(title)")
          .eq("client_id", clientId)
          .order("updated_at", { ascending: false })
          .limit(100),
      ),
    ]);
    return {
      requests: (requests as MyReferralRequest[]).map((r) => ({
        ...r,
        allowed_fields: Array.isArray(r.allowed_fields) ? r.allowed_fields : [],
      })),
      messages: messages as MessageRow[],
      documents: documents as DocumentRow[],
      entitlements: entitlements as EntitlementRow[],
    };
  },
});

export function usePortalNotifications(clientId: string | undefined, modules: ModulesMap | null | undefined) {
  const { data } = useQuery(portalNotificationSourcesQuery(clientId));
  const [seen, setSeen] = useState<SeenState>({ keys: [] });

  useEffect(() => {
    if (clientId) setSeen(loadSeen(clientId));
  }, [clientId]);

  const items = useMemo(
    () => (data ? buildNotifications(data, modules) : []),
    [data, modules],
  );

  const unseenCount = useMemo(() => countUnseen(items, seen), [items, seen]);
  const pendingConsentCount = useMemo(() => items.filter((i) => i.sticky).length, [items]);

  const markAllSeen = useCallback(() => {
    if (!clientId) return;
    setSeen((prev) => {
      const next = withSeen(prev, items);
      saveSeen(clientId, next);
      return next;
    });
  }, [clientId, items]);

  return { items, seen, unseenCount, pendingConsentCount, markAllSeen };
}
