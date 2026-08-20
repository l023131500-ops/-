import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

export default function Matching() {
  const { tenant } = useTenant();
  const [form, setForm] = useState({ topic: "", location: "", time_pref: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const run = async () => {
    if (!tenant) return;
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke("ai-match-teacher", { body: { ...form, tenant_id: tenant.id } });
      setResults(data?.matches || []);
      if (!data?.matches?.length) toast.info("לא נמצאו התאמות");
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  return (
    <div>
      <h1 className="font-heading text-3xl mb-6 flex items-center gap-2"><Sparkles className="h-7 w-7 text-secondary" /> התאמת AI</h1>
      <Card className="mb-6">
        <CardHeader><CardTitle as="h2">פרטי חיפוש</CardTitle><CardDescription>המערכת תמצא שיעורים תואמים בעזרת בינה מלאכותית</CardDescription></CardHeader>
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
          <Card key={r.id}><CardContent className="py-4"><div className="font-medium">{r.title}</div><div className="text-sm text-muted-foreground">{r.teacher_name} · {r.location}</div></CardContent></Card>
        ))}
      </div>
    </div>
  );
}
