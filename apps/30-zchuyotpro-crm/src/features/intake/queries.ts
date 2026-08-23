import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type IntakeRow = Database["public"]["Tables"]["intake_inquiries"]["Row"];

export const INTAKE_SELECT =
  "*, client:clients(id, file_number, first_name, last_name), referral:partner_referrals(id, status, partner:partners(company_name)), handler:profiles!intake_inquiries_handled_by_fkey(full_name)";

export const intakeListQuery = (filters: { status?: string; channel?: string; search?: string }) =>
  queryOptions({
    queryKey: ["intake-list", filters],
    queryFn: async () => {
      let q = supabase
        .from("intake_inquiries")
        .select(INTAKE_SELECT)
        .order("created_at", { ascending: false })
        .limit(500);
      if (filters.status && filters.status !== "all") q = q.eq("status", filters.status);
      if (filters.channel && filters.channel !== "all") q = q.eq("channel", filters.channel);
      if (filters.search) {
        const s = filters.search.replace(/[%,]/g, "");
        q = q.or(`full_name.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%,subject.ilike.%${s}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const intakeStatsQuery = () =>
  queryOptions({
    queryKey: ["intake-stats"],
    queryFn: async () => {
      const count = (status?: string) => {
        let q = supabase.from("intake_inquiries").select("id", { count: "exact", head: true });
        if (status) q = q.eq("status", status);
        return q;
      };
      const [total, fresh, triage, converted, routed, rejected] = await Promise.all([
        count(), count("new"), count("in_triage"), count("converted"), count("routed"), count("rejected"),
      ]);
      return {
        total: total.count ?? 0,
        new: fresh.count ?? 0,
        in_triage: triage.count ?? 0,
        converted: converted.count ?? 0,
        routed: routed.count ?? 0,
        rejected: rejected.count ?? 0,
      };
    },
  });

// Candidate existing clients for an inquiry, matched by exact phone/email —
// so staff link instead of creating a duplicate client.
export const intakeClientMatchesQuery = (inquiry: { phone: string | null; email: string | null }) =>
  queryOptions({
    queryKey: ["intake-client-matches", inquiry.phone, inquiry.email],
    queryFn: async () => {
      const clauses: string[] = [];
      if (inquiry.phone) clauses.push(`phone.eq.${inquiry.phone.replace(/[%,]/g, "")}`);
      if (inquiry.email) clauses.push(`email.eq.${inquiry.email.replace(/[%,]/g, "")}`);
      if (clauses.length === 0) return [];
      const { data, error } = await supabase
        .from("clients")
        .select("id, file_number, first_name, last_name, phone, email, status")
        .or(clauses.join(","))
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

export function useInvalidateIntake() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["intake-list"] });
    void qc.invalidateQueries({ queryKey: ["intake-stats"] });
  };
}
