import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowRight, Plus, Pencil, Trash2, Upload, FileText, Video, Volume2, CheckCircle2, X, Save, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

type Doc = {
  id: string;
  category: string;
  subcategory: string | null;
  title: string;
  description: string | null;
  doc_type: string;
  pdf_url: string | null;
  video_url: string | null;
  audio_url: string | null;
  is_published: boolean;
  display_order: number;
  created_at: string;
};

const empty = (): Partial<Doc> => ({
  category: "", subcategory: "", title: "", description: "",
  doc_type: "form", pdf_url: null, video_url: null, audio_url: null,
  is_published: false, display_order: 0,
});

const AdminDocuments = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [authChecked, setAuthChecked] = useState(false);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Partial<Doc> | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/admin/login"); return; }
      setAuthChecked(true);
      load();
    })();
  }, [navigate]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("documents").select("*")
      .order("category").order("subcategory").order("display_order");
    if (data) setDocs(data as Doc[]);
    setLoading(false);
  };

  const upload = async (file: File, kind: "pdf" | "video" | "audio") => {
    setUploading(kind);
    try {
      const ext = file.name.split(".").pop();
      const path = `${kind}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("public-resources").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("public-resources").getPublicUrl(path);
      setEditing(prev => prev ? { ...prev, [`${kind}_url`]: data.publicUrl } : prev);
      toast({ title: "הועלה בהצלחה" });
    } catch (e: any) {
      toast({ title: "שגיאה בהעלאה", description: e.message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    if (!editing?.title || !editing.category) {
      toast({ title: "שדות חסרים", description: "כותרת וקטגוריה הם שדות חובה", variant: "destructive" });
      return;
    }
    const payload = {
      category: editing.category!,
      subcategory: editing.subcategory || null,
      title: editing.title!,
      description: editing.description || null,
      doc_type: editing.doc_type || "form",
      pdf_url: editing.pdf_url || null,
      video_url: editing.video_url || null,
      audio_url: editing.audio_url || null,
      is_published: !!editing.is_published,
      display_order: editing.display_order ?? 0,
    };
    if (editing.id) {
      await supabase.from("documents").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("documents").insert(payload);
    }
    toast({ title: "נשמר בהצלחה" });
    setEditing(null);
    load();
  };

  const togglePublish = async (doc: Doc) => {
    await supabase.from("documents").update({ is_published: !doc.is_published }).eq("id", doc.id);
    toast({ title: doc.is_published ? "הוסר מהאתר" : "✅ פורסם באתר" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("למחוק את המסמך?")) return;
    await supabase.from("documents").delete().eq("id", id);
    toast({ title: "נמחק" });
    load();
  };

  if (!authChecked) return null;

  // Group by category > subcategory
  const grouped: Record<string, Record<string, Doc[]>> = {};
  for (const d of docs) {
    const sub = d.subcategory || "(ללא תת-קטגוריה)";
    grouped[d.category] ??= {};
    grouped[d.category][sub] ??= [];
    grouped[d.category][sub].push(d);
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8" dir="rtl">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/admin/leads"><Button variant="ghost" size="sm" className="gap-2"><ArrowRight className="w-4 h-4" />חזרה</Button></Link>
            <h1 className="text-2xl font-bold">📂 ניהול מסמכים והורדות</h1>
          </div>
          <div className="flex gap-2">
            <Link to="/admin/tips"><Button variant="outline" size="sm">💡 טיפים</Button></Link>
            <Link to="/admin/podcasts"><Button variant="outline" size="sm">🎙️ פודקאסטים</Button></Link>
            <Link to="/admin/settings"><Button variant="outline" size="sm">⚙️ הגדרות</Button></Link>
            <Button onClick={() => setEditing(empty())} className="gap-2"><Plus className="w-4 h-4" />הוסף מסמך</Button>
          </div>
        </div>

        {loading && <p className="text-center text-muted-foreground">טוען...</p>}

        {Object.keys(grouped).length === 0 && !loading && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            עדיין אין מסמכים. לחצו "הוסף מסמך" כדי להתחיל.
          </CardContent></Card>
        )}

        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, subs]) => (
            <Card key={cat}>
              <CardHeader>
                <CardTitle className="text-lg">📁 {cat}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(subs).map(([subcat, items]) => (
                  <div key={subcat}>
                    <h4 className="text-sm font-bold text-primary mb-2">{subcat}</h4>
                    <div className="space-y-2">
                      {items.map(doc => (
                        <div key={doc.id} className={`flex items-center gap-3 p-3 rounded-lg border ${doc.is_published ? "bg-green-50 border-green-200" : "bg-card border-border"}`}>
                          <FileText className="w-5 h-5 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm">{doc.title}</p>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted">
                                {doc.doc_type === "appendix" ? "נספח" : "טופס"}
                              </span>
                              {doc.pdf_url && <span title="PDF"><FileText className="w-3 h-3 text-red-600" /></span>}
                              {doc.video_url && <span title="וידאו"><Video className="w-3 h-3 text-blue-600" /></span>}
                              {doc.audio_url && <span title="אודיו"><Volume2 className="w-3 h-3 text-purple-600" /></span>}
                            </div>
                            {doc.description && <p className="text-xs text-muted-foreground mt-0.5">{doc.description}</p>}
                          </div>
                          <Button size="sm" variant={doc.is_published ? "default" : "outline"} onClick={() => togglePublish(doc)} className="gap-1">
                            {doc.is_published ? <><Eye className="w-3 h-3" />פורסם</> : <><EyeOff className="w-3 h-3" />טיוטה</>}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditing(doc)}><Pencil className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => remove(doc.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Editor */}
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editing?.id ? "עריכת מסמך" : "הוספת מסמך חדש"}</DialogTitle>
            </DialogHeader>
            {editing && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>קטגוריה *</Label>
                    <Input value={editing.category || ""} onChange={e => setEditing({ ...editing, category: e.target.value })} placeholder="לדוגמה: ביטוח לאומי" />
                  </div>
                  <div>
                    <Label>תת-קטגוריה (אופציונלי)</Label>
                    <Input value={editing.subcategory || ""} onChange={e => setEditing({ ...editing, subcategory: e.target.value })} placeholder="לדוגמה: דמי לידה" />
                  </div>
                </div>
                <div>
                  <Label>כותרת *</Label>
                  <Input value={editing.title || ""} onChange={e => setEditing({ ...editing, title: e.target.value })} placeholder="לדוגמה: טופס בקשה לדמי לידה" />
                </div>
                <div>
                  <Label>תיאור</Label>
                  <Textarea value={editing.description || ""} onChange={e => setEditing({ ...editing, description: e.target.value })} rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>סוג</Label>
                    <Select value={editing.doc_type || "form"} onValueChange={v => setEditing({ ...editing, doc_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="form">טופס</SelectItem>
                        <SelectItem value="appendix">נספח</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>סדר תצוגה</Label>
                    <Input type="number" value={editing.display_order ?? 0} onChange={e => setEditing({ ...editing, display_order: Number(e.target.value) })} />
                  </div>
                </div>

                {/* File uploads */}
                {([
                  { kind: "pdf", label: "PDF", accept: "application/pdf", icon: FileText },
                  { kind: "video", label: "וידאו הסבר", accept: "video/*", icon: Video },
                  { kind: "audio", label: "הקלטת הסבר", accept: "audio/*", icon: Volume2 },
                ] as const).map(({ kind, label, accept, icon: Icon }) => {
                  const url = editing[`${kind}_url` as keyof Doc] as string | null;
                  return (
                    <div key={kind} className="border rounded-lg p-3">
                      <Label className="flex items-center gap-2 mb-2"><Icon className="w-4 h-4" />{label}</Label>
                      {url ? (
                        <div className="flex items-center gap-2">
                          <a href={url} target="_blank" rel="noreferrer" className="text-xs text-primary truncate flex-1">{url}</a>
                          <Button size="sm" variant="ghost" onClick={() => setEditing({ ...editing, [`${kind}_url`]: null })}><X className="w-4 h-4" /></Button>
                        </div>
                      ) : (
                        <div>
                          <input type="file" accept={accept} onChange={e => e.target.files?.[0] && upload(e.target.files[0], kind)} disabled={uploading === kind}
                            className="text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:text-primary-foreground file:px-3 file:py-1.5 file:text-xs file:font-semibold" />
                          {uploading === kind && <p className="text-xs text-muted-foreground mt-1">מעלה...</p>}
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <div>
                    <Label className="text-base">פרסם באתר</Label>
                    <p className="text-xs text-muted-foreground">המסמך יוצג למבקרים רק לאחר אישור</p>
                  </div>
                  <Switch checked={!!editing.is_published} onCheckedChange={v => setEditing({ ...editing, is_published: v })} />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setEditing(null)}>ביטול</Button>
                  <Button onClick={save} className="gap-2"><Save className="w-4 h-4" />שמור</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminDocuments;
