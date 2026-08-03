import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const dashboardStatsQuery = () =>
  queryOptions({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const iso = startOfMonth.toISOString();

      const [activeClients, newMonth, openRefs, entChecked, unreadMsgs] = await Promise.all([
        supabase.from("clients").select("*", { head: true, count: "exact" }).eq("status", "active"),
        supabase.from("clients").select("*", { head: true, count: "exact" }).gte("created_at", iso),
        supabase.from("partner_referrals").select("*", { head: true, count: "exact" }).in("status", ["sent", "in_progress", "pending"]),
        supabase.from("client_entitlements").select("*", { head: true, count: "exact" }).gte("updated_at", iso).neq("status", "to_check"),
        supabase.from("messages").select("*", { head: true, count: "exact" }).eq("direction", "inbound").neq("status", "read"),
      ]);

      return {
        activeClients: activeClients.count ?? 0,
        newMonth: newMonth.count ?? 0,
        openReferrals: openRefs.count ?? 0,
        entitlementsChecked: entChecked.count ?? 0,
        unreadMessages: unreadMsgs.count ?? 0,
      };
    },
  });

export const recentActivityQuery = () =>
  queryOptions({
    queryKey: ["dashboard-activity"],
    queryFn: async () => {
      const [clients, refs, msgs, docs] = await Promise.all([
        supabase
          .from("clients")
          .select("id, first_name, last_name, created_at")
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("partner_referrals")
          .select("id, status, updated_at, client:clients(id, first_name, last_name), partner:partners(company_name)")
          .order("updated_at", { ascending: false })
          .limit(8),
        supabase
          .from("messages")
          .select("id, channel, direction, created_at, client:clients(id, first_name, last_name)")
          .eq("direction", "inbound")
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("documents")
          .select("id, file_name, created_at, client:clients(id, first_name, last_name)")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

      type Item = {
        id: string;
        kind: "client" | "referral" | "message" | "document";
        when: string;
        clientId?: string | null;
        clientName?: string;
        text: string;
      };
      const items: Item[] = [];
      (clients.data ?? []).forEach((c) =>
        items.push({
          id: `c-${c.id}`,
          kind: "client",
          when: c.created_at,
          clientId: c.id,
          clientName: `${c.first_name} ${c.last_name}`,
          text: "לקוח חדש נוסף",
        }),
      );
      (refs.data ?? []).forEach((r) =>
        items.push({
          id: `r-${r.id}`,
          kind: "referral",
          when: r.updated_at,
          clientId: r.client?.id ?? null,
          clientName: r.client ? `${r.client.first_name} ${r.client.last_name}` : "",
          text: `הפניה ל${r.partner?.company_name ?? "שותף"} — ${r.status}`,
        }),
      );
      (msgs.data ?? []).forEach((m) =>
        items.push({
          id: `m-${m.id}`,
          kind: "message",
          when: m.created_at,
          clientId: m.client?.id ?? null,
          clientName: m.client ? `${m.client.first_name} ${m.client.last_name}` : "",
          text: `הודעה נכנסת (${m.channel})`,
        }),
      );
      (docs.data ?? []).forEach((d) =>
        items.push({
          id: `d-${d.id}`,
          kind: "document",
          when: d.created_at,
          clientId: d.client?.id ?? null,
          clientName: d.client ? `${d.client.first_name} ${d.client.last_name}` : "",
          text: `מסמך הועלה: ${d.file_name}`,
        }),
      );
      items.sort((a, b) => (b.when ?? "").localeCompare(a.when ?? ""));
      return items.slice(0, 20);
    },
  });

export const referralsBoardQuery = () =>
  queryOptions({
    queryKey: ["dashboard-referrals-board"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_referrals")
        .select(
          "id, status, sent_at, notes, client:clients(id, first_name, last_name, file_number), partner:partners(id, company_name)",
        )
        .order("sent_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });

export const globalSearchQuery = (search: string) =>
  queryOptions({
    queryKey: ["global-search", search],
    queryFn: async () => {
      const s = search.trim().replace(/[%,]/g, "");
      if (!s) return [];
      const { data, error } = await supabase
        .from("clients")
        .select("id, file_number, first_name, last_name, phone, id_number")
        .or(`first_name.ilike.%${s}%,last_name.ilike.%${s}%,phone.ilike.%${s}%,id_number.ilike.%${s}%,file_number.ilike.%${s}%`)
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: search.trim().length >= 2,
  });
