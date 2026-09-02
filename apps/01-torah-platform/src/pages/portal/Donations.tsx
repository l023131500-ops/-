import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { formatILS } from "@/lib/utils";

export default function Donations() {
  const { tenant } = useTenant();
  const { data } = useQuery({
    queryKey: ["donations", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase.from("donations").select("*").eq("tenant_id", tenant!.id).order("created_at", { ascending: false }).limit(200);
      return data || [];
    },
  });
  return (
    <div>
      <h1 className="font-heading text-3xl mb-6">תרומות</h1>
      <div className="space-y-2">
        {(data || []).map((d: any) => (
          <Card key={d.id}><CardContent className="py-3 flex justify-between items-center">
            <div>
              <div className="font-medium">{d.donor_name} — {formatILS(d.amount_ils)}</div>
              <div className="text-sm text-muted-foreground">{new Date(d.created_at).toLocaleDateString("he-IL")}{d.dedication_for_name ? ` · ${d.dedication_for_name}` : ""}</div>
            </div>
            <Badge variant={d.payment_status === "captured" ? "success" : "outline"}>{d.payment_status}</Badge>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}
