import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// Personal-areas & passwords vault (flagship spec item 3): the per-topic list
// of the client's online personal areas with their login details. Shown to the
// client in the portal and to staff in the client file; never to partners
// (the table has no partner RLS policy) and never in the printed report.

type Tables = Database["public"]["Tables"];
export type PersonalAreaRow = Tables["client_personal_areas"]["Row"];

// Topic keys are stored as-is; the list mirrors the bodies an Israeli
// rights-realization office signs into most. 'other' is the free bucket.
export const VAULT_TOPICS = {
  health_fund: "קופת חולים",
  national_insurance: "ביטוח לאומי",
  gov_il: "gov.il / ממשל זמין",
  tax_authority: "רשות המסים",
  bank: "בנק",
  credit_card: "כרטיס אשראי",
  pension: "פנסיה / קרן השתלמות",
  insurance: "ביטוח",
  mortgage: "משכנתא",
  municipality: "עירייה / ארנונה",
  utilities: "חשמל / מים / גז",
  communication: "תקשורת / אינטרנט",
  email: "אימייל",
  education: "חינוך / מוסדות לימוד",
  employment: "תעסוקה / תלושי שכר",
  other: "אחר",
} as const;

export type VaultTopic = keyof typeof VAULT_TOPICS;

export function vaultTopicLabel(topic: string): string {
  return (VAULT_TOPICS as Record<string, string>)[topic] ?? topic;
}

export const personalAreasQuery = (clientId: string | undefined) =>
  queryOptions({
    queryKey: ["client-personal-areas", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("client_personal_areas")
        .select("*")
        .eq("client_id", clientId)
        .order("topic")
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clientId,
  });

export function useInvalidatePersonalAreas(clientId: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["client-personal-areas", clientId] });
  };
}

/** Group rows by topic, preserving the VAULT_TOPICS order and appending unknown topics at the end. */
export function groupByTopic(rows: PersonalAreaRow[]): { topic: string; rows: PersonalAreaRow[] }[] {
  const byTopic = new Map<string, PersonalAreaRow[]>();
  for (const r of rows) {
    const list = byTopic.get(r.topic) ?? [];
    list.push(r);
    byTopic.set(r.topic, list);
  }
  const ordered: { topic: string; rows: PersonalAreaRow[] }[] = [];
  for (const key of Object.keys(VAULT_TOPICS)) {
    const list = byTopic.get(key);
    if (list) {
      ordered.push({ topic: key, rows: list });
      byTopic.delete(key);
    }
  }
  for (const [topic, list] of byTopic) ordered.push({ topic, rows: list });
  return ordered;
}

/** Normalize a user-typed address into something clickable; empty stays null. */
export function normalizeUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}
