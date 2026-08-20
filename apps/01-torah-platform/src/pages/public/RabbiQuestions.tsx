import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

export default function RabbiQuestions() {
  const { tenant } = useTenant();
  const [form, setForm] = useState({ name: "", email: "", question: "", anonymous: false });
  const [loading, setLoading] = useState(false);

  const { data: answered } = useQuery({
    queryKey: ["rabbi-answered", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("rabbi_questions")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .eq("is_public", true)
        .not("answer", "is", null)
        .order("answered_at", { ascending: false })
        .limit(30);
      return data || [];
    },
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("rabbi_questions").insert({
        tenant_id: tenant.id,
        question: form.question,
        asker_name: form.anonymous ? null : form.name,
        asker_email: form.email || null,
        is_anonymous: form.anonymous,
        is_public: true,
      });
      if (error) throw error;
      toast.success("השאלה נשלחה. תקבל מענה בקרוב");
      setForm({ name: "", email: "", question: "", anonymous: false });
    } catch (err: any) { toast.error(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <div className="text-center mb-8">
        <MessageCircle className="h-12 w-12 mx-auto text-primary mb-3" />
        <h1 className="font-heading text-3xl md:text-4xl mb-2">שאל את הרב</h1>
        <p className="text-muted-foreground">שאלות בהלכה ובחיי היומיום — מענה מהרב</p>
      </div>
      <Card className="mb-8">
        <CardHeader><CardTitle>שאלת חדשה</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div className="flex items-center gap-3"><Switch checked={form.anonymous} onCheckedChange={(v) => setForm({ ...form, anonymous: v })} /><Label>שאלה אנונימית</Label></div>
            {!form.anonymous && <div><Label>שם</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>}
            <div><Label>דוא״ל (לקבלת מענה אישי)</Label><Input type="email" inputMode="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>השאלה *</Label><Textarea required rows={4} value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} /></div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="ml-2 h-4 w-4" /> שלח שאלה</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      <h2 className="font-heading text-2xl mb-4">שאלות ותשובות אחרונות</h2>
      <div className="space-y-4">
        {(answered || []).map((q: any) => (
          <Card key={q.id}>
            <CardHeader>
              <Badge variant="secondary" className="w-fit mb-1">שאלה</Badge>
              <CardTitle className="text-lg">{q.question}</CardTitle>
              <CardDescription>{q.is_anonymous ? "אנונימי" : q.asker_name}</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="default" className="mb-2">תשובת הרב</Badge>
              <p className="whitespace-pre-wrap text-foreground/85">{q.answer}</p>
            </CardContent>
          </Card>
        ))}
        {(answered?.length || 0) === 0 && <div className="text-muted-foreground">אין שאלות עם תשובות עדיין</div>}
      </div>
    </div>
  );
}
