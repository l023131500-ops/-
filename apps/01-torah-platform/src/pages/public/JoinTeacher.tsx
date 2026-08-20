import { useState } from "react";
import { Loader2, Send, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

export default function JoinTeacher() {
  const { tenant } = useTenant();
  const [form, setForm] = useState({ name: "", phone: "", email: "", topics: "", experience: "", location: "", bio: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("leads").insert({
        tenant_id: tenant.id,
        // leads has `kind`/`raw_data`, not `type`/`details` — see Contact.tsx.
        // "teacher_offer" matches what MatchingGuru.tsx filters for teacher
        // candidates "from JoinTeacher form".
        kind: "teacher_offer",
        full_name: form.name,
        phone: form.phone,
        email: form.email,
        raw_data: { topics: form.topics, experience: form.experience, location: form.location, bio: form.bio },
      });
      if (error) throw error;
      toast.success("בקשת ההצטרפות נשלחה — נחזור אליך בהקדם");
      setForm({ name: "", phone: "", email: "", topics: "", experience: "", location: "", bio: "" });
    } catch (err: any) { toast.error("שגיאה: " + err.message); } finally { setLoading(false); }
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl">
      <div className="text-center mb-8">
        <GraduationCap className="h-12 w-12 mx-auto text-primary mb-3" />
        <h1 className="font-heading text-3xl md:text-4xl mb-2">הצטרף כמגיד שיעור</h1>
        <p className="text-muted-foreground">הרחב את קהל הלומדים שלך — חבר אליך לומדים חדשים</p>
      </div>
      <Card>
        <CardHeader><CardTitle>פרטי המגיד</CardTitle><CardDescription>אנו נצור איתך קשר לקבלת פרטים נוספים</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>שם מלא *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>טלפון *</Label><Input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div><Label>דוא״ל</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>נושאים שאתה מלמד</Label><Input value={form.topics} onChange={(e) => setForm({ ...form, topics: e.target.value })} placeholder="לדוגמה: חומש, גמרא, הלכה" /></div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>שנות ניסיון</Label><Input value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} /></div>
              <div><Label>אזור פעילות</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            </div>
            <div><Label>אודות / רקע</Label><Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={4} /></div>
            <Button type="submit" disabled={loading} size="lg" className="w-full">
              {loading ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> שולח...</> : <><Send className="ml-2 h-4 w-4" /> שלח בקשה</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
