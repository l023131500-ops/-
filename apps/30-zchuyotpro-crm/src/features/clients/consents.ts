import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
export type ClientConsentRow = Tables["client_consents"]["Row"];

export type ReferralConsentStatus = "awaiting_client" | "approved" | "declined";

export const CONSENT_STATUS_LABELS: Record<ReferralConsentStatus, string> = {
  awaiting_client: "ממתין לאישור הלקוח",
  approved: "אושר",
  declined: "נדחה ע״י הלקוח",
};

/** Staff side: the client's standing per-topic consents (tenant RLS). */
export const clientConsentsQuery = (clientId: string) =>
  queryOptions({
    queryKey: ["client-consents", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_consents")
        .select("*")
        .eq("client_id", clientId);
      if (error) throw error;
      return data ?? [];
    },
  });

/** Does this client hold a standing granted consent for the given topic? */
export function hasStandingConsent(consents: ClientConsentRow[] | undefined, category: string | undefined): boolean {
  if (!consents || !category) return false;
  return consents.some((c) => c.category === category && c.is_granted);
}

// ---------- client portal (SECURITY DEFINER RPCs) ----------

export type MyReferralRequest = {
  id: string;
  status: string;
  consent_status: ReferralConsentStatus;
  notes: string | null;
  sent_at: string;
  partner_name: string;
  partner_category: string;
  allowed_fields: string[];
};

export const myReferralRequestsQuery = () =>
  queryOptions({
    queryKey: ["my-referral-requests"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_referral_requests");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        consent_status: r.consent_status as ReferralConsentStatus,
        allowed_fields: Array.isArray(r.allowed_fields) ? (r.allowed_fields as string[]) : [],
      })) as MyReferralRequest[];
    },
  });

export type MyConsentTopic = {
  category: string;
  partner_count: number;
  fields: string[];
  is_granted: boolean | null;
  decided_at: string | null;
};

export const myConsentStateQuery = () =>
  queryOptions({
    queryKey: ["my-consent-state"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_consent_state");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        fields: Array.isArray(r.fields) ? (r.fields as string[]) : [],
      })) as MyConsentTopic[];
    },
  });

export async function respondReferralConsent(referralId: string, approve: boolean) {
  const { data, error } = await supabase.rpc("respond_referral_consent", {
    _referral_id: referralId,
    _approve: approve,
  });
  if (error) throw error;
  const res = data as { ok: boolean; error?: string; consent_status?: string } | null;
  if (!res?.ok) {
    throw new Error(res?.error === "already_decided" ? "הבקשה כבר הוכרעה" : "הבקשה לא נמצאה");
  }
  return res;
}

export async function setMyConsent(category: string, grant: boolean) {
  const { data, error } = await supabase.rpc("set_my_consent", {
    _category: category,
    _grant: grant,
  });
  if (error) throw error;
  const res = data as { ok: boolean; error?: string } | null;
  if (!res?.ok) throw new Error("עדכון ההסכמה נכשל");
  return res;
}
