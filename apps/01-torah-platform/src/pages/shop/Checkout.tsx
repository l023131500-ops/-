import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatILS } from "@/lib/utils";

export default function Checkout() {
  const items = useCart((s) => s.items);
  const total = useCart((s) => s.total());
  const { user } = useAuth();
  const { tenant } = useTenant();
  const nav = useNavigate();

  const [customer, setCustomer] = useState({ name: "", phone: "", email: "", address: "", city: "", notes: "" });
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (items.length === 0 && !iframeUrl) nav("/cart");
  }, [items.length, iframeUrl, nav]);

  useEffect(() => {
    if (user?.email) setCustomer((c) => ({ ...c, email: user.email! }));
  }, [user]);

  const submit = async () => {
    if (!tenant || items.length === 0) return;
    if (!customer.name || !customer.phone || !customer.address) { toast.error("חסרים פרטים חובה"); return; }
    setLoading(true);
    try {
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          tenant_id: tenant.id,
          user_id: user?.id || null,
          customer_name: customer.name,
          customer_phone: customer.phone,
          customer_email: customer.email || null,
          shipping_address: customer.address,
          shipping_city: customer.city,
          notes: customer.notes,
          total_ils: total,
          status: "pending",
          payment_status: "pending",
        })
        .select()
        .single();
      if (error) throw error;

      // Insert order_items
      const { error: itemsErr } = await supabase.from("order_items").insert(
        items.map((it) => ({
          order_id: order.id,
          product_id: it.product_id,
          product_name: it.product_name,
          unit_price_ils: it.unit_price_ils,
          quantity: it.quantity,
          subtotal_ils: it.unit_price_ils * it.quantity,
        })),
      );
      if (itemsErr) throw itemsErr;

      const { data: pay, error: payErr } = await supabase.functions.invoke("nedarim-create-payment", {
        body: {
          purpose: "shop_order",
          tenant_id: tenant.id,
          order_id: order.id,
          amount: total,
          payment_type: "Ragil",
          donor_name: customer.name,
          donor_phone: customer.phone,
          donor_email: customer.email,
        },
      });
      if (payErr) throw payErr;
      if (!pay?.iframe_url) throw new Error("לא ניתן ליצור עמוד תשלום");
      setIframeUrl(pay.iframe_url);
    } catch (err: any) { toast.error(err.message); } finally { setLoading(false); }
  };

  if (iframeUrl) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <h2 className="font-heading text-2xl mb-4 text-center">השלמת תשלום</h2>
        <Card><CardContent className="p-0 overflow-hidden">
          <iframe src={iframeUrl} className="w-full" style={{ height: 720, border: 0 }} title="תשלום" />
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <h1 className="font-heading text-3xl mb-6">תשלום</h1>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader><CardTitle>פרטי משלוח ולקוח</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label>שם מלא *</Label><Input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} /></div>
                <div><Label>טלפון *</Label><Input type="tel" inputMode="tel" autoComplete="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} /></div>
              </div>
              <div><Label>דוא״ל</Label><Input type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} /></div>
              <div><Label>כתובת *</Label><Input value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} /></div>
              <div><Label>עיר</Label><Input value={customer.city} onChange={(e) => setCustomer({ ...customer, city: e.target.value })} /></div>
              <div><Label>הערות</Label><Textarea value={customer.notes} onChange={(e) => setCustomer({ ...customer, notes: e.target.value })} /></div>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card className="sticky top-20">
            <CardHeader><CardTitle>סיכום הזמנה</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {items.map((it) => (
                <div key={it.product_id} className="flex justify-between text-sm">
                  <span>{it.product_name} × {it.quantity}</span>
                  <span dir="ltr">{formatILS(it.unit_price_ils * it.quantity)}</span>
                </div>
              ))}
              <div className="border-t pt-3 flex justify-between font-heading text-lg">
                <span>סה״כ</span>
                <span className="text-primary" dir="ltr">{formatILS(total)}</span>
              </div>
              <Button size="lg" className="w-full" onClick={submit} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CreditCard className="ml-2 h-4 w-4" /> לתשלום</>}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
