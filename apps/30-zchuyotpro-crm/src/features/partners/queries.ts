import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { authedFetch } from "@/lib/authed-fetch";

export const partnersListQuery = (filters: { search?: string; category?: string; active?: string }) =>
  queryOptions({
    queryKey: ["partners-list", filters],
    queryFn: async () => {
      let q = supabase
        .from("partners")
        .select("*, referrals:partner_referrals(count)")
        .order("company_name");
      if (filters.category && filters.category !== "all") q = q.eq("category", filters.category);
      if (filters.active === "active") q = q.eq("is_active", true);
      if (filters.active === "inactive") q = q.eq("is_active", false);
      if (filters.search) {
        const s = filters.search.replace(/[%,]/g, "");
        q = q.or(`company_name.ilike.%${s}%,contact_name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((p) => ({
        ...p,
        referrals_count: Array.isArray(p.referrals) ? (p.referrals[0]?.count ?? 0) : 0,
      }));
    },
  });

export const partnerQuery = (id: string) =>
  queryOptions({
    queryKey: ["partner", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("partners").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("שותף לא נמצא");
      return data;
    },
  });

export const partnerReferralsQuery = (partnerId: string) =>
  queryOptions({
    queryKey: ["partner-referrals", partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_referrals")
        .select("*, client:clients(id, file_number, first_name, last_name)")
        .eq("partner_id", partnerId)
        .order("sent_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const allReferralsQuery = (filters: {
  partnerId?: string;
  status?: string;
  from?: string;
  to?: string;
  search?: string;
}) =>
  queryOptions({
    queryKey: ["all-referrals", filters],
    queryFn: async () => {
      let q = supabase
        .from("partner_referrals")
        .select("*, partner:partners(id, company_name, category), client:clients(id, file_number, first_name, last_name), referrer:profiles!partner_referrals_referred_by_fkey(full_name)")
        .order("sent_at", { ascending: false })
        .limit(500);
      if (filters.partnerId && filters.partnerId !== "all") q = q.eq("partner_id", filters.partnerId);
      if (filters.status && filters.status !== "all") q = q.eq("status", filters.status);
      if (filters.from) q = q.gte("sent_at", filters.from);
      if (filters.to) q = q.lte("sent_at", filters.to);
      const { data, error } = await q;
      if (error) throw error;
      let rows = data ?? [];
      if (filters.search) {
        const s = filters.search.toLowerCase();
        rows = rows.filter((r) => {
          const cn = `${r.client?.first_name ?? ""} ${r.client?.last_name ?? ""}`.toLowerCase();
          return cn.includes(s) || (r.client?.file_number ?? "").toLowerCase().includes(s);
        });
      }
      return rows;
    },
  });

export const referralsStatsQuery = () =>
  queryOptions({
    queryKey: ["referrals-stats"],
    queryFn: async () => {
      const statuses = ["sent", "pending", "in_progress", "completed", "rejected"] as const;
      const counts = await Promise.all(
        statuses.map((s) =>
          supabase.from("partner_referrals").select("*", { head: true, count: "exact" }).eq("status", s),
        ),
      );
      const totalRes = await supabase.from("partner_referrals").select("*", { head: true, count: "exact" });
      const out: Record<string, number> = { total: totalRes.count ?? 0 };
      statuses.forEach((s, i) => (out[s] = counts[i].count ?? 0));
      return out;
    },
  });

// Partner portal queries
export const myPartnerQuery = () =>
  queryOptions({
    queryKey: ["my-partner"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data, error } = await supabase.from("partners").select("*").eq("auth_user_id", u.user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const portalReferralsQuery = () =>
  queryOptions({
    queryKey: ["portal-referrals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_referrals")
        .select("*, client:clients(id, file_number, first_name, last_name, phone, email)")
        .order("sent_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const portalReferralQuery = (referralId: string) =>
  queryOptions({
    queryKey: ["portal-referral", referralId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_referrals")
        .select(`
          *,
          client:clients(*),
          partner:partners(*)
        `)
        .eq("id", referralId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("הפניה לא נמצאה");
      return data;
    },
  });

export function useInvalidatePartners() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["partners-list"] });
    qc.invalidateQueries({ queryKey: ["partners-active"] });
    qc.invalidateQueries({ queryKey: ["all-referrals"] });
    qc.invalidateQueries({ queryKey: ["referrals-stats"] });
  };
}

// Fire-and-forget webhook trigger. Server route handles the actual n8n call.
export async function dispatchNotify(endpoint: "notify-partner" | "notify-admin", payload: Record<string, unknown>) {
  try {
    await authedFetch(`/api/public/${endpoint}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.warn(`[${endpoint}] dispatch failed`, e);
  }
}
