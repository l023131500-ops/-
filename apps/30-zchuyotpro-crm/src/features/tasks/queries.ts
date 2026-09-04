import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

export const TASK_PRIORITY = { high: "גבוהה", medium: "בינונית", low: "נמוכה" } as const;
export const TASK_PRIORITY_COLOR: Record<string, string> = {
  high: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  medium: "bg-yellow-100 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-200",
  low: "bg-muted text-muted-foreground",
};
export const TASK_STATUS = { open: "פתוח", done: "הושלם" } as const;

export const clientTasksQuery = (clientId: string) =>
  queryOptions({
    queryKey: ["tasks", "client", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, assignee:profiles!tasks_assigned_to_fkey(id, full_name), creator:profiles!tasks_created_by_fkey(id, full_name)")
        .eq("client_id", clientId)
        .order("status")
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const allTasksQuery = (filters: { status?: string; mine?: boolean; myId?: string | null }) =>
  queryOptions({
    queryKey: ["tasks", "all", filters],
    queryFn: async () => {
      let q = supabase
        .from("tasks")
        .select("*, assignee:profiles!tasks_assigned_to_fkey(id, full_name), creator:profiles!tasks_created_by_fkey(id, full_name), client:clients(id, first_name, last_name, file_number)")
        .order("status")
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(500);
      if (filters.status && filters.status !== "all") q = q.eq("status", filters.status as "open" | "done");
      if (filters.mine && filters.myId) q = q.eq("assigned_to", filters.myId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const tasksDueWidgetQuery = () =>
  queryOptions({
    queryKey: ["tasks", "due-widget"],
    queryFn: async () => {
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const [overdue, today] = await Promise.all([
        supabase
          .from("tasks")
          .select("id, title, due_date, priority, client:clients(id, first_name, last_name)")
          .eq("status", "open")
          .lt("due_date", now.toISOString())
          .order("due_date", { ascending: true })
          .limit(20),
        supabase
          .from("tasks")
          .select("id, title, due_date, priority, client:clients(id, first_name, last_name)")
          .eq("status", "open")
          .gte("due_date", now.toISOString())
          .lte("due_date", endOfDay.toISOString())
          .order("due_date", { ascending: true })
          .limit(20),
      ]);
      return { overdue: overdue.data ?? [], today: today.data ?? [] };
    },
  });

export const overdueByClientQuery = () =>
  queryOptions({
    queryKey: ["tasks", "overdue-by-client"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("client_id")
        .eq("status", "open")
        .lt("due_date", new Date().toISOString())
        .not("client_id", "is", null);
      if (error) throw error;
      const map: Record<string, number> = {};
      (data ?? []).forEach((t) => {
        if (t.client_id) map[t.client_id] = (map[t.client_id] ?? 0) + 1;
      });
      return map;
    },
  });
