import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatILS } from "@/lib/utils";

const PRESET_AMOUNTS = [18, 36, 52, 100, 180, 360, 500, 1000];
const DEDICATION_TYPES = [
  { value: "lerefua", label: "לרפואה שלמה" },
  { value: "leiluy_nishmat", label: "לעילוי נשמת" },
  { value: "lehatzlacha", label: "להצלחה" },
  { value: "zivug_hagun", label: "לזיווג הגון" },
  { value: "pri_beten", label: "לפרי בטן" },
  { value: "parnasa", label: "לפרנסה" },
];

export default function DonationPage() {
  const { campaignSlug } = useParams();
  const { tenant } = useTenant();
  const { user } = useAuth();
  const nav = useNavigate();
  const [amount, setAmount] = useState<number>(180);
  const [customAmount, setCustomAmount] = useState("");
  const [paymentType, setPaymentType] = useState<"Ragil" | "HK">("Ragil");
  const [installments, setInstallments] = useState(1);
  const [donor, setDonor] = useState({ name: "", phone: "", email: "" });
  const [dedication, setDedication] = useState({ enabled: false, for_name: "", type: "" });
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: campaign } = useQuery({
    queryKey: ["campaign", campaignSlug, tenant?.id],
    enabled: !!tenant?.id && !!campaignSlug,
    queryFn: async () => {
      const { data } = await supabase
        .from("donation_campaigns")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .eq("slug", campaignSlug!)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (user?.email) setDonor((d) => ({ ...d, email: user.email! }));
  }, [user]);

  const finalAmount = customAmount ? parseFloat(customAmount) : amount;

  const handleDonate = async () => {
    if (loading) return;
    if (!tenant || !finalAmount || finalAmount < 5) {
      toast.error("נא להזין סכום תקין");
      return;
    }
    if (!donor.name || !donor.phone) { toast.error("נא למלא שם וטלפון"); return; }
    setLoading(true);
    try {
      // Create donation row first
      const { data: donation, error: donErr } = await supabase
        .from("donations")
        .insert({
          tenant_id: tenant.id,
          campaign_id: campaign?.id || null,
          donor_name: donor.name,
          donor_phone: donor.phone,
          donor_email: donor.email || null,
          amount_ils: finalAmount,
          payment_type: paymentType,
          installments: paymentType === "HK" ? installments : 1,
          dedication_for_name: dedication.enabled ? dedication.for_name : null,
          dedication_type: dedication.enabled ? dedication.type : null,
          user_id: user?.id || null,
          payment_status: "pending",
        })
        .select()
        .single();
      if (donErr) throw donErr;

      const { data: payRes, error: payErr } = await supabase.functions.invoke("nedarim-create-payment", {
        body: {
          purpose: "donation",
          tenant_id: tenant.id,
          donation_id: donation.id,
          amount: finalAmount,
          payment_type: paymentType,
          installments,
          donor_name: donor.name,
          donor_phone: donor.phone,
          donor_email: donor.email,
          dedication_for_name: dedication.for_name,
          dedication_type: dedication.type,
        },
      });
      if (payErr) throw payErr;
      if (!payRes?.iframe_url) throw new Error("לא הצלחנו ליצור עמוד תשלום");
      setIframeUrl(payRes.iframe_url);
    } catch (err: any) {
      toast.error("שגיאה: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (iframeUrl) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <h2 className="font-heading text-2xl mb-4 text-center">השלמת תשלום</h2>
        <Card>
          <CardContent className="p-0 overflow-hidden">
            <iframe src={iframeUrl} className="w-full" style={{ height: 720, border: 0 }} title="תשלום" />
          </CardContent>
        </Card>
        <div className="text-center mt-4">
          <Button variant="outline" onClick={() => setIframeUrl(null)}>חזור</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <div className="text-center mb-8">
        <Heart className="h-12 w-12 mx-auto text-secondary mb-3 fill-secondary/20" />
        <h1 className="font-heading text-3xl md:text-4xl mb-2">{campaign?.title || "תרומה לחיזוק התורה"}</h1>
        {campaign?.description && <p className="text-muted-foreground">{campaign.description}</p>}
      </div>

      {campaign?.goal_ils && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex justify-between mb-2 text-sm">
              <span>גויס: {formatILS(campaign.raised_ils || 0)}</span>
              <span className="text-muted-foreground">יעד: {formatILS(campaign.goal_ils)}</span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-secondary" style={{ width: `${Math.min(100, ((campaign.raised_ils || 0) / campaign.goal_ils) * 100)}%` }} />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle as="h2">פרטי התרומה</CardTitle><CardDescription>תשלום מאובטח בטכנולוגיית נדרים פלוס</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={paymentType} onValueChange={(v) => setPaymentType(v as any)}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="Ragil">תרומה חד-פעמית</TabsTrigger>
              <TabsTrigger value="HK">הוראת קבע</TabsTrigger>
            </TabsList>
            <TabsContent value="HK" className="pt-3">
              <Label>מספר תשלומים חודשיים</Label>
              <Select value={String(installments)} onValueChange={(v) => setInstallments(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[3, 6, 12, 24, 36, 60].map((n) => <SelectItem key={n} value={String(n)}>{n} חודשים</SelectItem>)}
                </SelectContent>
              </Select>
            </TabsContent>
          </Tabs>

          <div>
            <Label>סכום תרומה (ש״ח)</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {PRESET_AMOUNTS.map((a) => (
                <Button key={a} type="button" variant={amount === a && !customAmount ? "default" : "outline"} onClick={() => { setAmount(a); setCustomAmount(""); }}>{a}</Button>
              ))}
            </div>
            <Input className="mt-2" type="number" inputMode="decimal" min="5" placeholder="סכום אחר..." value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>שם מלא *</Label><Input value={donor.name} onChange={(e) => setDonor({ ...donor, name: e.target.value })} /></div>
            <div><Label>טלפון *</Label><Input type="tel" inputMode="tel" autoComplete="tel" value={donor.phone} onChange={(e) => setDonor({ ...donor, phone: e.target.value })} /></div>
          </div>
          <div><Label>דוא״ל (לקבלת קבלה)</Label><Input type="email" inputMode="email" autoComplete="email" value={donor.email} onChange={(e) => setDonor({ ...donor, email: e.target.value })} /></div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center gap-3">
              <Switch checked={dedication.enabled} onCheckedChange={(v) => setDedication({ ...dedication, enabled: v })} />
              <Label>הקדשה</Label>
            </div>
            {dedication.enabled && (
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>סוג</Label>
                  <Select value={dedication.type} onValueChange={(v) => setDedication({ ...dedication, type: v })}>
                    <SelectTrigger><SelectValue placeholder="בחר..." /></SelectTrigger>
                    <SelectContent>{DEDICATION_TYPES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>שם פרטי</Label><Input value={dedication.for_name} onChange={(e) => setDedication({ ...dedication, for_name: e.target.value })} placeholder="לדוגמה: שרה בת רחל" /></div>
              </div>
            )}
          </div>

          <Button size="lg" className="w-full" onClick={handleDonate} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Heart className="ml-2 h-4 w-4" /> תרום {formatILS(finalAmount || 0)}</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
