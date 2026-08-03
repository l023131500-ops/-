import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Alert = {
  id: string;
  kind: "inactive" | "expiring" | "overdue_task" | "stale_referral";
  text: string;
  clientId?: string | null;
  clientName?: string;
  severity: "warning" | "danger";
};

export const smartAlertsQuery = () =>
  queryOptions({
    queryKey: ["smart-alerts"],
    queryFn: async () => {
      const now = new Date();
      const in30Days = new Date(); in30Days.setDate(in30Days.getDate() + 30);
      const ago30 = new Date(); ago30.setDate(ago30.getDate() - 30);
      const ago7 = new Date(); ago7.setDate(ago7.getDate() - 7);

      const [inactive, vehicles, refs, overdueTasks] = await Promise.all([
        // clients with no activity (updated_at < 30 days ago)
        supabase
          .from("clients")
          .select("id, first_name, last_name, updated_at")
          .lt("updated_at", ago30.toISOString())
          .eq("status", "active")
          .order("updated_at", { ascending: true })
          .limit(10),
        // vehicles with insurance expiring in 30 days
        supabase
          .from("client_vehicles")
          .select("id, license_plate, insurance_expiry, client:clients(id, first_name, last_name)")
          .lte("insurance_expiry", in30Days.toISOString().slice(0, 10))
          .gte("insurance_expiry", now.toISOString().slice(0, 10))
          .limit(20),
        // referrals stale > 7 days
        supabase
          .from("partner_referrals")
          .select("id, status, updated_at, client:clients(id, first_name, last_name), partner:partners(company_name)")
          .in("status", ["sent", "pending", "in_progress"])
          .lt("updated_at", ago7.toISOString())
          .limit(15),
        // overdue tasks
        supabase
          .from("tasks")
          .select("id, title, due_date, client:clients(id, first_name, last_name)")
          .eq("status", "open")
          .lt("due_date", now.toISOString())
          .limit(15),
      ]);

      const alerts: Alert[] = [];

      (inactive.data ?? []).forEach((c) => {
        alerts.push({
          id: `i-${c.id}`,
          kind: "inactive",
          text: `אין פעילות מעל 30 יום`,
          clientId: c.id,
          clientName: `${c.first_name} ${c.last_name}`,
          severity: "warning",
        });
      });
      (vehicles.data ?? []).forEach((v) => {
        const c = (v as { client?: { id: string; first_name: string; last_name: string } | null }).client;
        alerts.push({
          id: `v-${v.id}`,
          kind: "expiring",
          text: `ביטוח רכב (${v.license_plate ?? ""}) פג בקרוב`,
          clientId: c?.id ?? null,
          clientName: c ? `${c.first_name} ${c.last_name}` : "",
          severity: "warning",
        });
      });
      (refs.data ?? []).forEach((r) => {
        const c = (r as { client?: { id: string; first_name: string; last_name: string } | null }).client;
        const p = (r as { partner?: { company_name: string } | null }).partner;
        alerts.push({
          id: `r-${r.id}`,
          kind: "stale_referral",
          text: `הפניה ל${p?.company_name ?? "שותף"} ללא עדכון 7+ ימים`,
          clientId: c?.id ?? null,
          clientName: c ? `${c.first_name} ${c.last_name}` : "",
          severity: "warning",
        });
      });
      (overdueTasks.data ?? []).forEach((t) => {
        const c = (t as { client?: { id: string; first_name: string; last_name: string } | null }).client;
        alerts.push({
          id: `t-${t.id}`,
          kind: "overdue_task",
          text: `משימה באיחור: ${t.title}`,
          clientId: c?.id ?? null,
          clientName: c ? `${c.first_name} ${c.last_name}` : "",
          severity: "danger",
        });
      });

      return alerts;
    },
  });
