import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid } from "recharts";
import { ENTITLEMENT_STATUS, REFERRAL_STATUS } from "@/features/clients/constants";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "אנליטיקה | זכויות פרו" }] }),
  component: AnalyticsPage,
});

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

const analyticsQuery = () =>
  queryOptions({
    queryKey: ["analytics"],
    queryFn: async () => {
      const since6mo = new Date();
      since6mo.setMonth(since6mo.getMonth() - 5);
      since6mo.setDate(1); since6mo.setHours(0, 0, 0, 0);

      const [clients, ents, refs, agents] = await Promise.all([
        supabase.from("clients").select("created_at").gte("created_at", since6mo.toISOString()),
        supabase.from("client_entitlements").select("status"),
        supabase.from("partner_referrals").select("status, partner:partners(company_name)"),
        supabase.from("clients").select("assigned_agent_id, assigned_agent:profiles!clients_assigned_agent_id_fkey(full_name)"),
      ]);

      // clients per month
      const monthMap: Record<string, number> = {};
      const months: string[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        months.push(k);
        monthMap[k] = 0;
      }
      (clients.data ?? []).forEach((c) => {
        const d = new Date(c.created_at);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (k in monthMap) monthMap[k]++;
      });
      const clientsPerMonth = months.map((m) => ({ month: m.slice(5) + "/" + m.slice(2, 4), count: monthMap[m] }));

      // entitlements by status
      const eMap: Record<string, number> = {};
      (ents.data ?? []).forEach((e) => { eMap[e.status] = (eMap[e.status] ?? 0) + 1; });
      const entitlementsByStatus = Object.entries(eMap).map(([k, v]) => ({
        name: (ENTITLEMENT_STATUS as Record<string, string>)[k] ?? k,
        value: v,
      }));

      // referrals by partner
      const pMap: Record<string, Record<string, number>> = {};
      (refs.data ?? []).forEach((r) => {
        const name = (r as { partner?: { company_name: string } | null }).partner?.company_name ?? "—";
        pMap[name] = pMap[name] ?? {};
        pMap[name][r.status] = (pMap[name][r.status] ?? 0) + 1;
      });
      const referralsByPartner = Object.entries(pMap).slice(0, 10).map(([name, statuses]) => ({
        name: name.length > 16 ? name.slice(0, 14) + "…" : name,
        ...statuses,
      }));

      // top agents
      const aMap: Record<string, { name: string; count: number }> = {};
      (agents.data ?? []).forEach((c) => {
        const id = c.assigned_agent_id;
        if (!id) return;
        const name = (c as { assigned_agent?: { full_name: string } | null }).assigned_agent?.full_name ?? "—";
        aMap[id] = aMap[id] ?? { name, count: 0 };
        aMap[id].count++;
      });
      const topAgents = Object.values(aMap).sort((a, b) => b.count - a.count).slice(0, 5);

      return { clientsPerMonth, entitlementsByStatus, referralsByPartner, topAgents };
    },
  });

function AnalyticsPage() {
  const { data, isLoading } = useQuery(analyticsQuery());

  if (isLoading || !data) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const refStatuses = Object.keys(REFERRAL_STATUS);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">אנליטיקה</h2>
        <p className="text-muted-foreground text-sm mt-1">סטטיסטיקות וביצועים</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">לקוחות חדשים לפי חודש</CardTitle></CardHeader>
          <CardContent style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.clientsPerMonth}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">זכאויות לפי סטטוס</CardTitle></CardHeader>
          <CardContent style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.entitlementsByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {data.entitlementsByStatus.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">הפניות לפי שותף וסטטוס</CardTitle></CardHeader>
          <CardContent style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.referralsByPartner}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                {refStatuses.map((s, i) => (
                  <Bar key={s} dataKey={s} stackId="a" fill={COLORS[i % COLORS.length]} name={(REFERRAL_STATUS as Record<string, string>)[s]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">5 הסוכנים המובילים (לפי תיקים)</CardTitle></CardHeader>
          <CardContent>
            {data.topAgents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">אין נתונים</p>
            ) : (
              <div className="space-y-2">
                {data.topAgents.map((a, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">{i + 1}</div>
                    <span className="flex-1 font-medium">{a.name}</span>
                    <div className="w-48 bg-muted rounded-full h-2 overflow-hidden">
                      <div className="bg-primary h-full" style={{ width: `${(a.count / data.topAgents[0].count) * 100}%` }} />
                    </div>
                    <span className="text-sm text-muted-foreground w-12 text-end">{a.count}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 text-sm">
              <Link to="/clients" className="text-primary hover:underline">צפה בכל הלקוחות →</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
