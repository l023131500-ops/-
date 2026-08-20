import { useState } from "react";
import { Loader2, Send, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

export default function RequestLesson() {
  const { tenant } = useTenant();
  const [form, setForm] = useState({ name: "", phone: "", email: "", topic: "", audience: "", location: "", details: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("leads").insert({
        tenant_id: tenant.id,
        // leads has `kind`/`raw_data`, not `type`/`details` — see Contact.tsx.
        // "lesson_request" matches what MatchingGuru.tsx filters for the
        // request-a-lesson column.
        kind: "lesson_request",
        full_name: form.name,
        phone: form.phone,
        email: form.email,
        raw_data: { topic: form.topic, audience: form.audience, location: form.location, details: form.details },
      });
      if (error) throw error;
      toast.success("הבקשה התקבלה — נחזור אליך בהקדם");
      setForm({ name: "", phone: "", email: "", topic: "", audience: "", location: "", details: "" });
    } catch (err: any) { toast.error("שגיאה: " + err.message); } finally { setLoading(false); }
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl">
      <div className="text-center mb-8">
        <BookOpen className="h-12 w-12 mx-auto text-primary mb-3" />
        <h1 className="font-heading text-3xl md:text-4xl mb-2">בקש פתיחת שיעור</h1>
        <p className="text-muted-foreground">רוצה לפתוח שיעור חדש באזור שלך? מלא את הפרטים</p>
      </div>
      <Card>
        <CardHeader><CardTitle>פרטי הבקשה</CardTitle><CardDescription>נסייע במציאת מגיד שיעור ומקום מתאים</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>שם מלא *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>טלפון *</Label><Input required type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div><Label>דוא״ל</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>נושא רצוי</Label><Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} /></div>
              <div><Label>קהל יעד</Label><Input value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} placeholder="גברים / נשים / נוער" /></div>
            </div>
            <div><Label>אזור / עיר *</Label><Input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <div><Label>פרטים נוספים</Label><Textarea value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} /></div>
            <Button type="submit" disabled={loading} size="lg" className="w-full">
              {loading ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> שולח...</> : <><Send className="ml-2 h-4 w-4" /> שלח בקשה</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
