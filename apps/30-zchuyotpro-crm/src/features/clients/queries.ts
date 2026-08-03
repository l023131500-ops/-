import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
export type ClientRow = Tables["clients"]["Row"];
export type FamilyMember = Tables["client_family_members"]["Row"];
export type Financial = Tables["client_financial_profile"]["Row"];
export type Housing = Tables["client_housing_profile"]["Row"];
export type Vehicle = Tables["client_vehicles"]["Row"];
export type Entitlement = Tables["entitlements"]["Row"];
export type ClientEntitlement = Tables["client_entitlements"]["Row"];
export type Message = Tables["messages"]["Row"];
export type DocumentRow = Tables["documents"]["Row"];
export type PartnerRow = Tables["partners"]["Row"];
export type ReferralRow = Tables["partner_referrals"]["Row"];
export type ProfileRow = Tables["profiles"]["Row"];

// ---------- profile (me) ----------
export const meProfileQuery = () =>
  queryOptions({
    queryKey: ["me-profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("auth_user_id", u.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const tenantAgentsQuery = () =>
  queryOptions({
    queryKey: ["tenant-agents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

// ---------- clients ----------
export const clientsListQuery = (filters: { search?: string; status?: string }) =>
  queryOptions({
    queryKey: ["clients", filters],
    queryFn: async () => {
      let q = supabase
        .from("clients")
        .select("id, file_number, first_name, last_name, phone, email, status, assigned_agent_id, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (filters.status && filters.status !== "all") q = q.eq("status", filters.status);
      if (filters.search) {
        const s = filters.search.replace(/[%,]/g, "");
        q = q.or(
          `first_name.ilike.%${s}%,last_name.ilike.%${s}%,file_number.ilike.%${s}%,phone.ilike.%${s}%,id_number.ilike.%${s}%`,
        );
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const clientStatsQuery = () =>
  queryOptions({
    queryKey: ["client-stats"],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [total, active, pending, monthly] = await Promise.all([
        supabase.from("clients").select("*", { head: true, count: "exact" }),
        supabase.from("clients").select("*", { head: true, count: "exact" }).eq("status", "active"),
        supabase.from("clients").select("*", { head: true, count: "exact" }).eq("status", "pending"),
        supabase.from("clients").select("*", { head: true, count: "exact" }).gte("created_at", startOfMonth.toISOString()),
      ]);
      return {
        total: total.count ?? 0,
        active: active.count ?? 0,
        pending: pending.count ?? 0,
        monthly: monthly.count ?? 0,
      };
    },
  });

export const clientQuery = (id: string) =>
  queryOptions({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*, assigned_agent:profiles!clients_assigned_agent_id_fkey(id, full_name)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Client not found");
      return data;
    },
  });

// ---------- family ----------
export const familyQuery = (clientId: string) =>
  queryOptions({
    queryKey: ["family", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_family_members")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

// ---------- financial ----------
export const financialQuery = (clientId: string) =>
  queryOptions({
    queryKey: ["financial", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_financial_profile")
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

// ---------- housing ----------
export const housingQuery = (clientId: string) =>
  queryOptions({
    queryKey: ["housing", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_housing_profile")
        .select("*")
        .eq("client_id", clientId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

// ---------- vehicles ----------
export const vehiclesQuery = (clientId: string) =>
  queryOptions({
    queryKey: ["vehicles", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_vehicles")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

// ---------- entitlements ----------
export const entitlementsCatalogQuery = (filters: { year?: number; category?: string }) =>
  queryOptions({
    queryKey: ["entitlements", filters],
    queryFn: async () => {
      let q = supabase.from("entitlements").select("*").eq("is_active", true).order("title");
      if (filters.year) q = q.eq("year", filters.year);
      if (filters.category && filters.category !== "all") q = q.eq("category", filters.category);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const clientEntitlementsQuery = (clientId: string) =>
  queryOptions({
    queryKey: ["client-entitlements", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_entitlements")
        .select("*")
        .eq("client_id", clientId);
      if (error) throw error;
      return data ?? [];
    },
  });

// ---------- messages ----------
export const messagesQuery = (clientId: string) =>
  queryOptions({
    queryKey: ["messages", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

// ---------- documents ----------
export const documentsQuery = (clientId: string) =>
  queryOptions({
    queryKey: ["documents", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

// ---------- referrals ----------
export const referralsQuery = (clientId: string) =>
  queryOptions({
    queryKey: ["referrals", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_referrals")
        .select("*, partner:partners(id, company_name, category)")
        .eq("client_id", clientId)
        .order("sent_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const partnersQuery = () =>
  queryOptions({
    queryKey: ["partners-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .eq("is_active", true)
        .order("company_name");
      if (error) throw error;
      return data ?? [];
    },
  });

// Helper to invalidate everything for a client
export function useInvalidateClient() {
  const qc = useQueryClient();
  return (clientId: string) => {
    qc.invalidateQueries({ queryKey: ["client", clientId] });
    qc.invalidateQueries({ queryKey: ["family", clientId] });
    qc.invalidateQueries({ queryKey: ["financial", clientId] });
    qc.invalidateQueries({ queryKey: ["housing", clientId] });
    qc.invalidateQueries({ queryKey: ["vehicles", clientId] });
    qc.invalidateQueries({ queryKey: ["client-entitlements", clientId] });
    qc.invalidateQueries({ queryKey: ["messages", clientId] });
    qc.invalidateQueries({ queryKey: ["documents", clientId] });
    qc.invalidateQueries({ queryKey: ["referrals", clientId] });
    qc.invalidateQueries({ queryKey: ["clients"] });
    qc.invalidateQueries({ queryKey: ["client-stats"] });
  };
}
