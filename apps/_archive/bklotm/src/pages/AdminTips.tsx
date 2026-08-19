import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowRight, Plus, Pencil, Trash2, Lightbulb, Video, Volume2, X, Save, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

type Tip = {
  id: string;
  title: string;
  body: string;
  category: string | null;
  video_url: string | null;
  audio_url: string | null;
  is_published: boolean;
  display_order: number;
  created_at: string;
};

const empty = (): Partial<Tip> => ({
  title: "", body: "", category: "",
  video_url: null, audio_url: null,
  is_published: false, display_order: 0,
});

const AdminTips = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [authChecked, setAuthChecked] = useState(false);
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Partial<Tip> | null>(null);
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
    const { data } = await supabase.from("tips").select("*")
      .order("category").order("display_order");
    if (data) setTips(data as Tip[]);
    setLoading(false);
  };

  const upload = async (file: File, kind: "video" | "audio") => {
    setUploading(kind);
    try {
      const ext = file.name.split(".").pop();
      const path = `tips/${kind}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("public-resources").upload(path, file);
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
    if (!editing?.title || !editing.body) {
      toast({ title: "שדות חסרים", description: "כותרת וטקסט הם שדות חובה", variant: "destructive" });
      return;
    }
    const payload = {
      title: editing.title!,
      body: editing.body!,
      category: editing.category || null,
      video_url: editing.video_url || null,
      audio_url: editing.audio_url || null,
      is_published: !!editing.is_published,
      display_order: editing.display_order ?? 0,
    };
    if (editing.id) {
      await supabase.from("tips").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("tips").insert(payload);
    }
    toast({ title: "נשמר בהצלחה" });
    setEditing(null);
    load();
  };

  const togglePublish = async (tip: Tip) => {
    await supabase.from("tips").update({ is_published: !tip.is_published }).eq("id", tip.id);
    toast({ title: tip.is_published ? "הוסר מהאתר" : "✅ פורסם באתר" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("למחוק את הטיפ?")) return;
    await supabase.from("tips").delete().eq("id", id);
    toast({ title: "נמחק" });
    load();
  };

  if (!authChecked) return null;

  const grouped: Record<string, Tip[]> = {};
  for (const t of tips) {
    const cat = t.category || "כללי";
    grouped[cat] ??= [];
    grouped[cat].push(t);
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8" dir="rtl">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/admin/leads"><Button variant="ghost" size="sm" className="gap-2"><ArrowRight className="w-4 h-4" />חזרה</Button></Link>
            <h1 className="text-2xl font-bold">💡 ניהול טיפים</h1>
          </div>
          <div className="flex gap-2">
            <Link to="/admin/documents"><Button variant="outline" size="sm">📂 מסמכים</Button></Link>
            <Link to="/admin/podcasts"><Button variant="outline" size="sm">🎙️ פודקאסטים</Button></Link>
            <Link to="/admin/settings"><Button variant="outline" size="sm">⚙️ הגדרות</Button></Link>
            <Button onClick={() => setEditing(empty())} className="gap-2"><Plus className="w-4 h-4" />הוסף טיפ</Button>
          </div>
        </div>

        {loading && <p className="text-center text-muted-foreground">טוען...</p>}

        {Object.keys(grouped).length === 0 && !loading && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            עדיין אין טיפים. לחצו "הוסף טיפ" כדי להתחיל.
          </CardContent></Card>
        )}

        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, items]) => (
            <Card key={cat}>
              <CardHeader>
                <CardTitle className="text-lg">📁 {cat}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {items.map(tip => (
                  <div key={tip.id} className={`flex items-start gap-3 p-3 rounded-lg border ${tip.is_published ? "bg-green-50 border-green-200" : "bg-card border-border"}`}>
                    <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{tip.title}</p>
                        {tip.video_url && <Video className="w-3 h-3 text-blue-600" />}
                        {tip.audio_url && <Volume2 className="w-3 h-3 text-purple-600" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 whitespace-pre-wrap">{tip.body}</p>
                    </div>
                    <Button size="sm" variant={tip.is_published ? "default" : "outline"} onClick={() => togglePublish(tip)} className="gap-1">
                      {tip.is_published ? <><Eye className="w-3 h-3" />פורסם</> : <><EyeOff className="w-3 h-3" />טיוטה</>}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(tip)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(tip.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editing?.id ? "עריכת טיפ" : "הוספת טיפ חדש"}</DialogTitle>
            </DialogHeader>
            {editing && (
              <div className="space-y-4">
                <div>
                  <Label>כותרת *</Label>
                  <Input value={editing.title || ""} onChange={e => setEditing({ ...editing, title: e.target.value })} placeholder="לדוגמה: איך לבדוק זכאות לפנסיה" />
                </div>
                <div>
                  <Label>קטגוריה (אופציונלי)</Label>
                  <Input value={editing.category || ""} onChange={e => setEditing({ ...editing, category: e.target.value })} placeholder="לדוגמה: ביטוח לאומי / מיסים" />
                </div>
                <div>
                  <Label>טקסט הטיפ *</Label>
                  <Textarea value={editing.body || ""} onChange={e => setEditing({ ...editing, body: e.target.value })} rows={6} placeholder="הסבר מפורט..." />
                </div>
                <div>
                  <Label>סדר תצוגה</Label>
                  <Input type="number" value={editing.display_order ?? 0} onChange={e => setEditing({ ...editing, display_order: Number(e.target.value) })} />
                </div>

                {([
                  { kind: "video", label: "וידאו קצר", accept: "video/*", icon: Video },
                  { kind: "audio", label: "הקלטה", accept: "audio/*", icon: Volume2 },
                ] as const).map(({ kind, label, accept, icon: Icon }) => {
                  const url = editing[`${kind}_url` as keyof Tip] as string | null;
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
                    <p className="text-xs text-muted-foreground">הטיפ יוצג למבקרים רק לאחר אישור</p>
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

export default AdminTips;
