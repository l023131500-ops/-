import { useQuery } from "@tanstack/react-query";
import { Calendar, Users, MessageSquare, FileText, Heart, ShoppingBag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { formatILS } from "@/lib/utils";

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-md bg-primary/10 text-primary flex items-center justify-center"><Icon className="h-6 w-6" /></div>
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-2xl font-heading">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { tenant } = useTenant();
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["portal-stats", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const [lessons, leads, donations, orders] = await Promise.all([
        supabase.from("lessons").select("id", { count: "exact", head: true }).eq("tenant_id", tenant!.id),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("tenant_id", tenant!.id).eq("status", "new"),
        // payment_status enum has no 'paid' member; a captured payment is 'captured' (see admin/Dashboard.tsx).
        supabase.from("donations").select("amount_ils").eq("tenant_id", tenant!.id).eq("payment_status", "captured"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("tenant_id", tenant!.id).eq("payment_status", "captured"),
      ]);
      const totalDonations = (donations.data || []).reduce((s, d: any) => s + Number(d.amount_ils || 0), 0);
      return {
        lessons: lessons.count || 0,
        leads: leads.count || 0,
        donations: totalDonations,
        orders: orders.count || 0,
      };
    },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-3xl mb-1">שלום {user?.email}</h1>
        <p className="text-muted-foreground">{tenant?.branding?.site_name || tenant?.name}</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat icon={Calendar} label="שיעורים" value={stats?.lessons ?? "-"} />
        <Stat icon={MessageSquare} label="פניות חדשות" value={stats?.leads ?? "-"} />
        <Stat icon={Heart} label="תרומות (סה״כ)" value={stats ? formatILS(stats.donations) : "-"} />
        <Stat icon={ShoppingBag} label="הזמנות" value={stats?.orders ?? "-"} />
      </div>
      <Card>
        <CardHeader><CardTitle>ברוך הבא לפורטל הניהול</CardTitle></CardHeader>
        <CardContent>
          <p className="text-foreground/85">בצד ימין תוכל לנווט בין כל חלקי הניהול: שיעורים, משתתפים, פורומים, חומרי לימוד, תרומות, הזמנות והגדרות.</p>
        </CardContent>
      </Card>
    </div>
  );
}
