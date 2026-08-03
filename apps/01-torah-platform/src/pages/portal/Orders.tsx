import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { formatILS } from "@/lib/utils";

export default function Orders() {
  const { tenant } = useTenant();
  const { data } = useQuery({
    queryKey: ["orders", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").eq("tenant_id", tenant!.id).order("created_at", { ascending: false }).limit(200);
      return data || [];
    },
  });
  return (
    <div>
      <h1 className="font-heading text-3xl mb-6">הזמנות</h1>
      <div className="space-y-2">
        {(data || []).map((o: any) => (
          <Card key={o.id}><CardContent className="py-3 flex justify-between items-center">
            <div>
              <div className="font-medium">{o.customer_name} — {formatILS(o.total_ils)}</div>
              <div className="text-sm text-muted-foreground">{new Date(o.created_at).toLocaleDateString("he-IL")} · {o.shipping_city}</div>
            </div>
            <div className="flex gap-2">
              <Badge variant={o.payment_status === "paid" ? "success" : "outline"}>{o.payment_status}</Badge>
              <Badge>{o.status}</Badge>
            </div>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}
