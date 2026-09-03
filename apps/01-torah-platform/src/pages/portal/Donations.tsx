import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
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
              <div className="text-sm text-muted-foreground">
                {new Date(d.created_at).toLocaleDateString("he-IL")}
                {d.dedication_for_name ? ` · ${d.dedication_for_name}${d.dedication_father_name ? ` בן ${d.dedication_father_name}` : ""}` : ""}
                {(d.donor_city || d.donor_address) ? ` · ${[d.donor_address, d.donor_city].filter(Boolean).join(", ")}` : ""}
              </div>
              <ReceiptStatus donation={d} />
            </div>
            <Badge variant={d.payment_status === "captured" ? "success" : "outline"}>{d.payment_status}</Badge>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}
