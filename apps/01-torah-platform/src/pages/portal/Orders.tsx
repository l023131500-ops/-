import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Phone, Mail, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { formatILS } from "@/lib/utils";

export default function Orders() {
  const { tenant } = useTenant();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data } = useQuery({
    queryKey: ["orders", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      // order_items is nested so fulfillment staff can see exactly what was
      // ordered without a separate query per row -- oi_read RLS already
      // allows this for tenant_admin (see orders_self_read on the parent).
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("tenant_id", tenant!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      return data || [];
    },
  });
  return (
    <div>
      <h1 className="font-heading text-3xl mb-6">הזמנות</h1>
      <div className="space-y-2">
        {(data || []).map((o: any) => {
          const expanded = expandedId === o.id;
          return (
            <Card key={o.id}>
              <CardContent className="py-3">
                <button
                  type="button"
                  className="w-full flex justify-between items-center text-right"
                  onClick={() => setExpandedId(expanded ? null : o.id)}
                >
                  <div>
                    <div className="font-medium">{o.customer_name} — {formatILS(o.total_ils)}</div>
                    <div className="text-sm text-muted-foreground">{new Date(o.created_at).toLocaleDateString("he-IL")} · {o.shipping_city}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={o.payment_status === "captured" ? "success" : "outline"}>{o.payment_status}</Badge>
                    <Badge>{o.status}</Badge>
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </button>
                {expanded && (
                  <div className="mt-3 pt-3 border-t space-y-3 text-sm">
                    <div className="grid sm:grid-cols-2 gap-2">
                      <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {o.customer_phone}</div>
                      {o.customer_email && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> {o.customer_email}</div>}
                      {o.shipping_address && (
                        <div className="flex items-center gap-2 sm:col-span-2">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          {[o.shipping_address, o.shipping_city, o.shipping_zip].filter(Boolean).join(", ")}
                        </div>
                      )}
                    </div>
                    {o.shipping_notes && (
                      <div className="bg-muted/50 rounded p-2">
                        <div className="text-xs text-muted-foreground mb-1">הערות לקוח</div>
                        {o.shipping_notes}
                      </div>
                    )}
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">פריטים</div>
                      <div className="space-y-1">
                        {(o.order_items || []).map((it: any) => (
                          <div key={it.id} className="flex justify-between">
                            <span>{it.product_name} × {it.quantity}</span>
                            <span>{formatILS(it.total_ils)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
