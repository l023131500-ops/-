import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatILS } from "@/lib/utils";

function ReceiptStatus({ donation }: { donation: any }) {
  if (donation.payment_status !== "captured") return null;
  if (!donation.receipt_number && !donation.receipt_url) {
    return <div className="text-xs text-muted-foreground mt-1">קבלה: ממתינה</div>;
  }
  return (
    <div className="text-xs text-muted-foreground mt-1">
      קבלה {donation.receipt_number ? `#${donation.receipt_number}` : ""}
      {donation.receipt_url ? (
        <a href={donation.receipt_url} target="_blank" rel="noopener noreferrer" className="underline mr-1">
          צפייה
        </a>
      ) : null}
    </div>
  );
}

export default function Commerce() {
  const { data: donations } = useQuery({
    queryKey: ["all-donations"],
    queryFn: async () => {
      const { data } = await supabase.from("donations").select("*, tenants(name)").order("created_at", { ascending: false }).limit(500);
      return data || [];
    },
  });
  const { data: orders } = useQuery({
    queryKey: ["all-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*, tenants(name)").order("created_at", { ascending: false }).limit(500);
      return data || [];
    },
  });
  return (
    <div>
      <h1 className="font-heading text-3xl mb-6">מסחר ותרומות</h1>
      <Tabs defaultValue="donations">
        <TabsList>
          <TabsTrigger value="donations">תרומות</TabsTrigger>
          <TabsTrigger value="orders">הזמנות</TabsTrigger>
        </TabsList>
        <TabsContent value="donations" className="pt-4 space-y-2">
          {(donations || []).map((d: any) => (
            <Card key={d.id}><CardContent className="py-3 flex justify-between items-center">
              <div>
                <div className="font-medium">{d.donor_name} · {formatILS(d.amount_ils)}</div>
                <div className="text-sm text-muted-foreground">{d.tenants?.name} · {new Date(d.created_at).toLocaleDateString("he-IL")}</div>
                <ReceiptStatus donation={d} />
              </div>
              <Badge variant={d.payment_status === "captured" ? "success" : "outline"}>{d.payment_status}</Badge>
            </CardContent></Card>
          ))}
        </TabsContent>
        <TabsContent value="orders" className="pt-4 space-y-2">
          {(orders || []).map((o: any) => (
            <Card key={o.id}><CardContent className="py-3 flex justify-between items-center">
              <div>
                <div className="font-medium">{o.customer_name} · {formatILS(o.total_ils)}</div>
                <div className="text-sm text-muted-foreground">{o.tenants?.name}</div>
              </div>
              <div className="flex gap-2">
                <Badge variant={o.payment_status === "captured" ? "success" : "outline"}>{o.payment_status}</Badge>
                <Badge>{o.status}</Badge>
              </div>
            </CardContent></Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
