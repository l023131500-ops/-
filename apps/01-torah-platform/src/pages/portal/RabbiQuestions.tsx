import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { MessageCircle, CheckCircle2, Clock, Trash2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

// architecture.md §5.2 "רב / מורה הוראה": "שאל את הרב" – ניהול שאלות ותשובות.
// rabbi_questions_tenant_read/write RLS already scopes moderator/tenant_admin
// access to their own tenant_id (20260831080000/90000), but the only screen
// that ever wrote answer/is_public/status was admin/RabbiQuestions.tsx, which
// is global (all tenants, no tenant_id filter) and gated to super_admin only
// (RequireSuperAdmin wraps the whole /admin route tree) — a real rabbi/
// mori_horaah tenant admin had no way to answer their own tenant's questions.

type Draft = { answer: string; isPublic: boolean };

export default function PortalRabbiQuestions() {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: questions = [] } = useQuery({
    queryKey: ["portal-rabbi-questions", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rabbi_questions")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const setDraft = (id: string, patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [id]: { answer: "", isPublic: false, ...prev[id], ...patch } }));

  const draftFor = (q: any): Draft => drafts[q.id] || { answer: q.answer || "", isPublic: q.is_public ?? false };

  const answerMutation = useMutation({
    mutationFn: async (id: string) => {
      const draft = draftFor(questions.find((q: any) => q.id === id));
      const { error } = await supabase
        .from("rabbi_questions")
        .update({
          answer: draft.answer,
          is_public: draft.isPublic,
          status: "answered",
          answered_at: new Date().toISOString(),
          rabbi_user_id: user?.id,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("התשובה נשלחה");
      qc.invalidateQueries({ queryKey: ["portal-rabbi-questions", tenant?.id] });
    },
    onError: (err: any) => toast.error("שגיאה: " + err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rabbi_questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("נמחקה");
      qc.invalidateQueries({ queryKey: ["portal-rabbi-questions", tenant?.id] });
    },
    onError: (err: any) => toast.error("שגיאה: " + err.message),
  });

  const submit = (id: string) => {
    const draft = draftFor(questions.find((q: any) => q.id === id));
    if (!draft.answer.trim()) { toast.error("יש להקליד תשובה"); return; }
    setBusyId(id);
    answerMutation.mutate(id, { onSettled: () => setBusyId(null) });
  };

  const remove = (id: string) => {
    if (!confirm("למחוק את השאלה?")) return;
    setBusyId(id);
    deleteMutation.mutate(id, { onSettled: () => setBusyId(null) });
  };

  const filtered = questions.filter((q: any) => statusFilter === "all" || (q.status || "new") === statusFilter);
  const counts = {
    pending: questions.filter((q: any) => q.status !== "answered").length,
    answered: questions.filter((q: any) => q.status === "answered").length,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-secondary" />שאל את הרב
          </h1>
          <p className="text-muted-foreground text-sm mt-1">שאלות שהתקבלו מהעמוד הציבורי "שאל את הרב"</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל השאלות</SelectItem>
            <SelectItem value="new">ממתינות</SelectItem>
            <SelectItem value="answered">נענו</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-orange-500">{counts.pending}</p>
          <p className="text-xs text-muted-foreground">ממתינות לתשובה</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{counts.answered}</p>
          <p className="text-xs text-muted-foreground">נענו</p>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((q: any, i: number) => {
          const answered = q.status === "answered";
          const draft = draftFor(q);
          return (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-card rounded-xl p-4 border border-border"
            >
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <p className="font-medium text-foreground">{q.is_anonymous ? "אנונימי" : q.from_name || "—"}</p>
                <Badge variant={answered ? "default" : "secondary"} className="gap-1">
                  {answered ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  {answered ? "נענתה" : "ממתינה"}
                </Badge>
                {q.category && <Badge variant="outline">{q.category}</Badge>}
                <span className="text-xs text-muted-foreground mr-auto">
                  {new Date(q.created_at).toLocaleString("he-IL")}
                </span>
              </div>
              <p className="text-foreground text-sm bg-muted/50 p-3 rounded-lg mb-3">{q.question}</p>
              <Textarea
                placeholder="כתוב תשובה..."
                rows={3}
                value={draft.answer}
                onChange={(e) => setDraft(q.id, { answer: e.target.value })}
                className="mb-2"
              />
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Switch checked={draft.isPublic} onCheckedChange={(v) => setDraft(q.id, { isPublic: v })} />
                  פרסם באתר הציבורי ("שאל את הרב")
                </label>
                <div className="flex gap-2">
                  <Button size="sm" disabled={busyId === q.id} onClick={() => submit(q.id)} className="gap-1">
                    <Send className="w-3 h-3" />{answered ? "עדכן תשובה" : "שלח תשובה"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === q.id}
                    onClick={() => remove(q.id)}
                    className="gap-1 text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />מחק
                  </Button>
                </div>
              </div>
            </motion.div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <MessageCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">אין שאלות</p>
          </div>
        )}
      </div>
    </div>
  );
}
