import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";

export default function Analytics() {
  const { data } = useQuery({
    queryKey: ["donations-by-day"],
    queryFn: async () => {
      // payment_status enum has no 'paid' member; a captured payment is 'captured' (see admin/Dashboard.tsx).
      const { data } = await supabase.from("donations").select("amount_ils, created_at, payment_status").eq("payment_status", "captured");
      const buckets: Record<string, number> = {};
      (data || []).forEach((d: any) => {
        const day = new Date(d.created_at).toISOString().slice(0, 10);
        buckets[day] = (buckets[day] || 0) + Number(d.amount_ils);
      });
      return Object.entries(buckets).map(([day, total]) => ({ day, total })).sort((a, b) => a.day.localeCompare(b.day));
    },
  });
  return (
    <div>
      <h1 className="font-heading text-3xl mb-6">ניתוחים</h1>
      <Card>
        <CardHeader><CardTitle>תרומות לפי יום</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer>
            <BarChart data={data || []}>
              <XAxis dataKey="day" />
              <YAxis />
              <RTooltip />
              <Bar dataKey="total" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
