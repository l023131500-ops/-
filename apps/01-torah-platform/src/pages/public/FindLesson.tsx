import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

export default function FindLesson() {
  const { tenant } = useTenant();
  const [form, setForm] = useState({ name: "", phone: "", topic: "", location: "", time_pref: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);

  const { data: topics } = useQuery({
    queryKey: ["topics"],
    queryFn: async () => {
      const { data } = await supabase
        .from("lesson_topics")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      return data || [];
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setLoading(true);
    try {
      // leads stores the kind in `kind` and the free-form answers in `raw_data`;
      // the old `type`/`details` names no longer exist, so every submission of
      // this form was silently rejected by PostgREST.
      const { error } = await supabase.from("leads").insert({
        tenant_id: tenant.id,
        kind: "find_lesson",
        source: "find-lesson-form",
        full_name: form.name,
        phone: form.phone,
        preferred_subject: form.topic || null,
        area: form.location || null,
        message: form.notes || null,
        raw_data: { topic: form.topic, location: form.location, time_pref: form.time_pref, notes: form.notes },
      });
      if (error) throw error;

      // Attempt AI matching
      const { data: match } = await supabase.functions.invoke("ai-match-teacher", {
        body: { topic: form.topic, location: form.location, time_pref: form.time_pref, tenant_id: tenant.id },
      });
      if (match?.matches) setMatches(match.matches);

      toast.success("הפנייה נשלחה — נחזור אליך בהקדם");
      setForm({ name: "", phone: "", topic: "", location: "", time_pref: "", notes: "" });
    } catch (err: any) {
      toast.error("שגיאה: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <div className="text-center mb-8">
        <Sparkles className="h-12 w-12 mx-auto text-secondary mb-3" />
        <h1 className="font-heading text-3xl md:text-4xl mb-2">אתר לי שיעור</h1>
        <p className="text-muted-foreground">מלא פרטים ואנו נמצא לך שיעור מתאים</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle as="h2">פרטי בקשה</CardTitle>
          <CardDescription>נחזור אליך עם הצעות תוך 24 שעות</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>שם מלא *</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>טלפון *</Label>
                <Input required type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>נושא הלימוד</Label>
              <Select value={form.topic} onValueChange={(v) => setForm({ ...form, topic: v })}>
                <SelectTrigger><SelectValue placeholder="בחר נושא" /></SelectTrigger>
                <SelectContent>
                  {topics?.map((t: any) => <SelectItem key={t.id} value={t.name_he}>{t.name_he}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>אזור / עיר</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div>
                <Label>שעות מועדפות</Label>
                <Input value={form.time_pref} onChange={(e) => setForm({ ...form, time_pref: e.target.value })} placeholder="לדוגמה: ערב, אחה״צ" />
              </div>
            </div>
            <div>
              <Label>הערות נוספות</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <Button type="submit" disabled={loading} size="lg" className="w-full">
              {loading ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> שולח...</> : <><Send className="ml-2 h-4 w-4" /> שלח בקשה</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      {matches.length > 0 && (
        <div className="mt-8">
          <h2 className="font-heading text-2xl mb-4">הצעות שמצאנו לך</h2>
          <div className="grid gap-3">
            {matches.map((m: any) => (
              <Card key={m.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{m.title}</CardTitle>
                  <CardDescription>{m.teacher_name} · {m.location}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
