import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Matching() {
  const [form, setForm] = useState({ topic: "", location: "", time_pref: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const run = async () => {
    if (!form.topic && !form.location && !form.notes) {
      toast.error("יש למלא לפחות נושא, אזור או הערות לחיפוש");
      return;
    }
    setLoading(true);
    try {
      // ai-match-teacher only reads an existing `leads` row by id (it has no
      // free-text search path) — this ad-hoc search form has to create one
      // first, exactly like the lead a public visitor would have left.
      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .insert({
          tenant_id: null,
          kind: "lesson_request",
          full_name: "חיפוש התאמה (ניהול)",
          area: form.location || null,
          preferred_subject: form.topic || null,
          message: [form.time_pref && `שעות מועדפות: ${form.time_pref}`, form.notes].filter(Boolean).join(" | ") || null,
          source: "admin_matching_search",
        })
        .select("id")
        .single();
      if (leadError) throw leadError;

      const { data, error } = await supabase.functions.invoke("ai-match-teacher", { body: { lead_id: lead.id } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const matches = data?.matches || [];

      // The function returns {user_id, score, reason} — resolve names/cities
      // for display the same way MatchingGuru.tsx does.
      const userIds = matches.map((m: any) => m.user_id).filter(Boolean);
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("id, full_name, city").in("id", userIds)
        : { data: [] as any[] };
      const profileById = new Map((profiles || []).map((p: any) => [p.id, p]));

      setResults(matches.map((m: any) => ({
        id: m.user_id,
        full_name: profileById.get(m.user_id)?.full_name || m.user_id,
        city: profileById.get(m.user_id)?.city,
        score: m.score,
        reason: m.reason,
      })));
      if (!matches.length) toast.info("לא נמצאו התאמות");
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  return (
    <div>
      <h1 className="font-heading text-3xl mb-6 flex items-center gap-2"><Sparkles className="h-7 w-7 text-secondary" /> התאמת AI</h1>
      <Card className="mb-6">
        <CardHeader><CardTitle>פרטי חיפוש</CardTitle><CardDescription>המערכת תמצא שיעורים תואמים בעזרת בינה מלאכותית</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>נושא</Label><Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>אזור</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <div><Label>שעות</Label><Input value={form.time_pref} onChange={(e) => setForm({ ...form, time_pref: e.target.value })} /></div>
          </div>
          <div><Label>הערות</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <Button onClick={run} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "מצא התאמות"}</Button>
        </CardContent>
      </Card>
      <div className="space-y-3">
        {results.map((r: any) => (
          <Card key={r.id}>
            <CardContent className="py-4">
              <div className="font-medium">{r.full_name}{r.score != null ? ` (${r.score}%)` : ""}</div>
              {r.city && <div className="text-sm text-muted-foreground">{r.city}</div>}
              {r.reason && <div className="text-sm mt-1">{r.reason}</div>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
