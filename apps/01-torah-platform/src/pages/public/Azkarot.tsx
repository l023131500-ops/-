import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Send, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

export default function Azkarot() {
  const { tenant } = useTenant();
  const [form, setForm] = useState({ submitter_name: "", submitter_phone: "", deceased_name: "", hebrew_date: "", relation: "" });
  const [loading, setLoading] = useState(false);

  const { data: upcoming } = useQuery({
    queryKey: ["azkarot-upcoming", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase.from("azkarot").select("*").eq("tenant_id", tenant!.id).order("created_at", { ascending: false }).limit(30);
      return data || [];
    },
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("azkarot").insert({ tenant_id: tenant.id, ...form });
      if (error) throw error;
      toast.success("האזכרה נרשמה");
      setForm({ submitter_name: "", submitter_phone: "", deceased_name: "", hebrew_date: "", relation: "" });
    } catch (err: any) { toast.error(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <div className="text-center mb-8"><Heart className="h-12 w-12 mx-auto text-primary mb-3" /><h1 className="font-heading text-3xl md:text-4xl">אזכרות ויארצייט</h1></div>
      <Card className="mb-8">
        <CardHeader><CardTitle>רישום אזכרה חדשה</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>שם נפטר *</Label><Input required aria-required="true" value={form.deceased_name} onChange={(e) => setForm({ ...form, deceased_name: e.target.value })} /></div>
              <div><Label>תאריך עברי *</Label><Input required aria-required="true" value={form.hebrew_date} onChange={(e) => setForm({ ...form, hebrew_date: e.target.value })} placeholder="י' בניסן" /></div>
            </div>
            <div><Label>קרבת משפחה</Label><Input value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })} placeholder="אבא, אמא, סבא..." /></div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>שם מבקש *</Label><Input required aria-required="true" value={form.submitter_name} onChange={(e) => setForm({ ...form, submitter_name: e.target.value })} /></div>
              <div><Label>טלפון *</Label><Input required aria-required="true" type="tel" inputMode="tel" autoComplete="tel" value={form.submitter_phone} onChange={(e) => setForm({ ...form, submitter_phone: e.target.value })} /></div>
            </div>
            <Button type="submit" disabled={loading} className="w-full">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="ml-2 h-4 w-4" /> רשום</>}</Button>
          </form>
        </CardContent>
      </Card>
      <h2 className="font-heading text-2xl mb-4">אזכרות אחרונות</h2>
      <div className="space-y-2">
        {(upcoming || []).map((a: any) => (
          <Card key={a.id}><CardContent className="py-3 flex justify-between items-center"><div><div className="font-medium">{a.deceased_name}</div><div className="text-sm text-muted-foreground">{a.hebrew_date}{a.relation ? ` · ${a.relation}` : ""}</div></div></CardContent></Card>
        ))}
      </div>
    </div>
  );
}
