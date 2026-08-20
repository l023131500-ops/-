import { useState } from "react";
import { Mail, Phone, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Contact() {
  const { tenant } = useTenant();
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setLoading(true);
    try {
      // leads names the category `kind` and the free text `message`/`raw_data`;
      // `type` and `details` were dropped, so every message sent from this page
      // was rejected by PostgREST.
      const { error } = await supabase.from("leads").insert({
        tenant_id: tenant.id,
        kind: "contact",
        source: "contact-page",
        full_name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        message: form.message,
        raw_data: { message: form.message },
      });
      if (error) throw error;
      toast.success("ההודעה נשלחה, נחזור אליך");
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch (err: any) { toast.error(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <h1 className="font-heading text-3xl md:text-4xl mb-6 text-center">צור קשר</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>פרטי קשר</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> 02-3131600</div>
            <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> a023131600@gmail.com</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>שלח הודעה</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-3">
              <div><Label>שם *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>דוא״ל</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>טלפון</Label><Input type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>הודעה *</Label><Textarea required rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="ml-2 h-4 w-4" /> שלח</>}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
