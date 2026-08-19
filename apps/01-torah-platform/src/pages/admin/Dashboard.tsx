import { useQuery } from "@tanstack/react-query";
import { Building2, Users, Heart, ShoppingBag, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatILS } from "@/lib/utils";

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <Card><CardContent className="pt-6 flex items-center gap-4">
      <div className="w-12 h-12 rounded-md bg-primary/10 text-primary flex items-center justify-center"><Icon className="h-6 w-6" /></div>
      <div><div className="text-sm text-muted-foreground">{label}</div><div className="text-2xl font-heading">{value}</div></div>
    </CardContent></Card>
  );
}

export default function AdminDashboard() {
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [tenants, users, donations, orders, leads] = await Promise.all([
        supabase.from("tenants").select("id", { count: "exact", head: true }),
        // profiles.id is the auth user id — there is no user_id column. And the
        // payment_status enum has no 'paid' member; a captured payment is
        // 'captured', so both of these counters read zero before this.
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("donations").select("amount_ils").eq("payment_status", "captured"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("payment_status", "captured"),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "new"),
      ]);
      const totalDon = (donations.data || []).reduce((s, d: any) => s + Number(d.amount_ils || 0), 0);
      return {
        tenants: tenants.count || 0,
        users: users.count || 0,
        donations: totalDon,
        orders: orders.count || 0,
        leads: leads.count || 0,
      };
    },
  });

  return (
    <div>
      <h1 className="font-heading text-3xl mb-6">סקירה כללית</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Stat icon={Building2} label="ארגונים" value={data?.tenants ?? "-"} />
        <Stat icon={Users} label="משתמשים" value={data?.users ?? "-"} />
        <Stat icon={Heart} label="תרומות (סה״כ)" value={data ? formatILS(data.donations) : "-"} />
        <Stat icon={ShoppingBag} label="הזמנות" value={data?.orders ?? "-"} />
        <Stat icon={MessageSquare} label="פניות חדשות" value={data?.leads ?? "-"} />
      </div>
    </div>
  );
}
