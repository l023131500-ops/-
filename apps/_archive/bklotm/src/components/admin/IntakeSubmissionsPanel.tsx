import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, XCircle, FileText, Crown, Mail, Phone, Search, Loader2, Upload, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Sub = {
  id: string;
  right_id: string | null;
  right_topic_name: string | null;
  client_email: string;
  client_name: string | null;
  client_phone: string | null;
  answers: any;
  uploaded_documents: any;
  qualification_score: string | null;
  status: string | null;
  is_complete: boolean | null;
  is_premium_client: boolean | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

type Right = {
  id: string;
  topic_name: string;
  required_docs_list: any;
  qualification_questions: any;
};

const statusBadge: Record<string, { label: string; cls: string }> = {
  sent: { label: "נשלח ללקוח", cls: "bg-blue-100 text-blue-800" },
  pending: { label: "ממתין", cls: "bg-amber-100 text-amber-800" },
  partial: { label: "מילוי חלקי", cls: "bg-amber-100 text-amber-800" },
  complete: { label: "הושלם", cls: "bg-emerald-100 text-emerald-800" },
};

export const IntakeSubmissionsPanel = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Sub[]>([]);
  const [rights, setRights] = useState<Right[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Sub | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: subs }, { data: rs }] = await Promise.all([
      supabase.from("client_intake_submissions").select("*").order("updated_at", { ascending: false }),
      supabase.from("rights_reference").select("id, topic_name, required_docs_list, qualification_questions"),
    ]);
    setItems((subs || []) as any);
    setRights((rs || []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const right = (id?: string | null) => rights.find(r => r.id === id);

  const togglePremium = async (s: Sub) => {
    const next = !s.is_premium_client;
    await supabase.from("client_intake_submissions")
      .update({ is_premium_client: next } as any).eq("id", s.id);
    setItems(prev => prev.map(x => x.id === s.id ? { ...x, is_premium_client: next } : x));
    if (open?.id === s.id) setOpen({ ...open, is_premium_client: next });
    toast({ title: next ? "סומן כפרימיום" : "הוסר סימון פרימיום" });
  };

  const saveNotes = async () => {
    if (!open) return;
    setSavingNotes(true);
    await supabase.from("client_intake_submissions")
      .update({ admin_notes: adminNotes } as any).eq("id", open.id);
    setItems(prev => prev.map(x => x.id === open.id ? { ...x, admin_notes: adminNotes } : x));
    setSavingNotes(false);
    toast({ title: "ההערה נשמרה" });
  };

  const filtered = items.filter(s => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (s.client_email?.toLowerCase().includes(q)
      || s.client_name?.toLowerCase().includes(q)
      || s.client_phone?.includes(q)
      || s.right_topic_name?.toLowerCase().includes(q));
  });

  const getDocUrl = async (path: string) => {
    const { data } = await supabase.storage.from("client-intake-docs").createSignedUrl(path, 600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <Card className="p-5 mt-4">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-blue-600" />
          <h2 className="font-bold">פניות לטיפול מלא ({items.length})</h2>
          <p className="text-xs text-muted-foreground">טפסים שנשלחו ללקוחות + תשובותיהם</p>
        </div>
        <div className="relative w-72">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="חיפוש לפי שם / מייל / טלפון / נושא..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9" />
        </div>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-6"><Loader2 className="w-4 h-4 animate-spin inline" /> טוען...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-6">אין פניות עדיין</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(s => {
            const r = right(s.right_id);
            const qs = (r?.qualification_questions || []) as any[];
            const ans = (s.answers || {}) as Record<string, { answer: string; qualifies: boolean }>;
            const qualifiedCount = qs.filter(q => ans[q.id]?.qualifies).length;
            const docsCount = (s.uploaded_documents || []).length;
            const requiredDocs = (r?.required_docs_list || []).filter((d: any) => d.required !== false).length;
            const st = statusBadge[s.status || "pending"] || statusBadge.pending;
            return (
              <button key={s.id} className="text-right rounded-xl border border-border bg-card p-3 hover:shadow-md transition-shadow"
                onClick={() => { setOpen(s); setAdminNotes(s.admin_notes || ""); }}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                  {s.is_premium_client && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 inline-flex items-center gap-1">
                      <Crown className="w-3 h-3" /> פרימיום
                    </span>
                  )}
                </div>
                <p className="font-bold text-sm truncate">{s.client_name || "ללא שם"}</p>
                <p className="text-xs text-muted-foreground truncate" dir="ltr">{s.client_email}</p>
                {s.client_phone && <p className="text-xs text-muted-foreground" dir="ltr">{s.client_phone}</p>}
                <p className="text-xs mt-1 text-foreground/80 truncate">📋 {s.right_topic_name}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {qs.length > 0 && (
                    <span className={`text-[10px] px-2 py-0.5 rounded ${qualifiedCount === qs.length ? "bg-emerald-100 text-emerald-800" : qualifiedCount > 0 ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"}`}>
                      ✓ {qualifiedCount}/{qs.length} שאלות מזכות
                    </span>
                  )}
                  <span className={`text-[10px] px-2 py-0.5 rounded ${docsCount >= requiredDocs && requiredDocs > 0 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                    📎 {docsCount}{requiredDocs ? `/${requiredDocs}` : ""} מסמכים
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
          {open && (() => {
            const r = right(open.right_id);
            const qs = (r?.qualification_questions || []) as any[];
            const ans = (open.answers || {}) as Record<string, { answer: string; qualifies: boolean }>;
            const docs = (open.uploaded_documents || []) as Array<{ label: string; url: string }>;
            const reqDocs = (r?.required_docs_list || []) as Array<{ label: string; required?: boolean }>;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-blue-600" />
                    {open.client_name || "ללא שם"}
                    {open.is_premium_client && <Crown className="w-4 h-4 text-amber-600" />}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 mt-2 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="gap-1"><Mail className="w-3 h-3" /><span dir="ltr">{open.client_email}</span></Badge>
                    {open.client_phone && <Badge variant="outline" className="gap-1"><Phone className="w-3 h-3" /><span dir="ltr">{open.client_phone}</span></Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">📋 {open.right_topic_name}</p>

                  <Button size="sm" variant={open.is_premium_client ? "default" : "outline"} onClick={() => togglePremium(open)} className="gap-2">
                    <Crown className="w-3.5 h-3.5" /> {open.is_premium_client ? "הסר סימון פרימיום" : "סמן כלקוח פרימיום"}
                  </Button>

                  {qs.length > 0 && (
                    <div className="border-t border-border pt-3">
                      <p className="text-xs font-bold mb-2">שאלון זכאות:</p>
                      <div className="space-y-2">
                        {qs.map((q: any) => {
                          const a = ans[q.id];
                          return (
                            <div key={q.id} className={`rounded-lg p-2 border text-sm ${a ? (a.qualifies ? "bg-emerald-50 border-emerald-300" : "bg-rose-50 border-rose-300") : "bg-muted/30 border-border"}`}>
                              <p className="text-xs font-medium">{q.question}</p>
                              <p className="text-xs mt-1 flex items-center gap-1">
                                {a ? (a.qualifies ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-rose-600" />) : null}
                                <span className={a?.qualifies ? "text-emerald-700 font-bold" : a ? "text-rose-700 font-bold" : "text-muted-foreground"}>
                                  {a?.answer || "לא נענה"}
                                </span>
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {reqDocs.length > 0 && (
                    <div className="border-t border-border pt-3">
                      <p className="text-xs font-bold mb-2">מסמכים נדרשים:</p>
                      <div className="space-y-1">
                        {reqDocs.map((d, i) => {
                          const got = docs.find(u => u.label === d.label);
                          return (
                            <div key={i} className="flex items-center justify-between gap-2 text-xs p-2 rounded border border-border">
                              <div className="flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>{d.label}</span>
                                {d.required && <span className="text-rose-500">*</span>}
                                {got ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                              </div>
                              {got && (
                                <Button size="sm" variant="ghost" className="h-6 gap-1 text-xs" onClick={() => getDocUrl(got.url)}>
                                  <Download className="w-3 h-3" /> פתח
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-bold mb-2">הערות מנהל:</p>
                    <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={3}
                      className="w-full text-sm border border-input rounded-md p-2 bg-background"
                      placeholder="הוסף הערות פנימיות..." />
                    <Button size="sm" className="mt-2 gap-1" onClick={saveNotes} disabled={savingNotes}>
                      {savingNotes ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} שמור הערות
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
