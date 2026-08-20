import { useState, useRef, useEffect } from "react";
import { toPng } from "html-to-image";
import PortalLayout from "@/components/portal/PortalLayout";
import { FileText, Download, Palette, ArrowRight, Upload, Trash2, FileUp, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MATERIAL_CATEGORIES } from "@/types/questionnaire";

type TemplateKey = "flyer" | "siyum" | "recruit" | "greeting" | "summary";

const TEMPLATES: { key: TemplateKey; title: string; icon: string; description: string }[] = [
  { key: "flyer", title: "פלייר שיעור שבועי", icon: "📄", description: "תבנית מעוצבת לפרסום שיעור קבוע" },
  { key: "siyum", title: "הזמנה לסיום מסכת", icon: "🎉", description: "הזמנה מעוצבת לאירוע סיום" },
  { key: "recruit", title: "מודעת גיוס משתתפים", icon: "📣", description: "מודעה למשיכת תלמידים חדשים" },
  { key: "greeting", title: "כרטיס ברכה", icon: "💐", description: "כרטיס ברכה לחגים ואירועים" },
  { key: "summary", title: "סיכום שיעור", icon: "📝", description: "תבנית לסיכום נקודות השיעור" },
];

const PALETTES = [
  { name: "זהב", from: "#fef3c7", to: "#fde68a", text: "#78350f", accent: "#b45309" },
  { name: "כחול ים", from: "#dbeafe", to: "#bfdbfe", text: "#1e3a8a", accent: "#1d4ed8" },
  { name: "ירוק זית", from: "#d1fae5", to: "#a7f3d0", text: "#064e3b", accent: "#047857" },
  { name: "סגול מלכותי", from: "#ede9fe", to: "#ddd6fe", text: "#4c1d95", accent: "#6d28d9" },
  { name: "בורדו", from: "#fee2e2", to: "#fecaca", text: "#7f1d1d", accent: "#b91c1c" },
  { name: "שחור-זהב", from: "#1f2937", to: "#111827", text: "#fef3c7", accent: "#fbbf24" },
];

const Materials = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [active, setActive] = useState<TemplateKey | null>(null);
  const [palette, setPalette] = useState(PALETTES[0]);
  const [data, setData] = useState({
    title: "",
    rabbiName: "",
    subject: "",
    location: "",
    time: "",
    body: "",
    phone: "",
  });
  const previewRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<"templates" | "uploads">("templates");
  const [uploads, setUploads] = useState<any[]>([]);
  const [uploadForm, setUploadForm] = useState({
    title: "", description: "", category: "", subcategory: "", file: null as File | null,
    display_in_public_profile: false,
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  const loadProfile = async () => {
    const { data: p } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
    setProfile(p);
    if (p) {
      setData(d => ({
        ...d,
        rabbiName: p.full_name || "",
        phone: p.phone || "",
      }));
      const { data: ms } = await supabase
        .from("materials").select("*").eq("uploader_id", p.id)
        .order("created_at", { ascending: false });
      setUploads(ms || []);
    }
  };

  const submitUpload = async () => {
    if (!profile) return;
    if (!uploadForm.title || !uploadForm.category || !uploadForm.file) {
      toast.error("נא למלא שם, קטגוריה ולבחור קובץ");
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    try {
      const ext = uploadForm.file.name.split(".").pop();
      const isMedia = !!uploadForm.file.type && (uploadForm.file.type.startsWith("video/") || uploadForm.file.type.startsWith("audio/"));
      const bucket = isMedia || uploadForm.file.size > 5_000_000 ? "materials-media" : "portal-assets";
      const path = `${profile.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, uploadForm.file, { upsert: false, contentType: uploadForm.file.type || undefined });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      const mediaKind = uploadForm.file.type.startsWith("video/") ? "video"
        : uploadForm.file.type.startsWith("audio/") ? "audio"
        : uploadForm.file.type.startsWith("image/") ? "image" : "document";
      const { error: insErr } = await (supabase as any).from("materials").insert({
        uploader_id: profile.id,
        title: uploadForm.title,
        description: uploadForm.description || null,
        category: uploadForm.category,
        subcategory: uploadForm.subcategory || null,
        file_url: pub.publicUrl,
        file_type: ext || null,
        file_size: uploadForm.file.size,
        media_kind: mediaKind,
        display_in_public_profile: uploadForm.display_in_public_profile,
        status: "pending",
      });
      if (insErr) throw insErr;
      toast.success("הקובץ נשלח לאישור הניהול");
      setUploadForm({ title: "", description: "", category: "", subcategory: "", file: null, display_in_public_profile: false });
      loadProfile();
    } catch (e: any) {
      toast.error("שגיאה בהעלאה: " + e.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const deleteUpload = async (id: string) => {
    if (!confirm("למחוק את הקובץ?")) return;
    await supabase.from("materials").delete().eq("id", id);
    toast.success("נמחק");
    loadProfile();
  };

  const openTemplate = (key: TemplateKey) => {
    setActive(key);
    const t = TEMPLATES.find(x => x.key === key)!;
    setData(d => ({ ...d, title: t.title }));
  };

  const download = async () => {
    if (!previewRef.current) return;
    try {
      const dataUrl = await toPng(previewRef.current, { pixelRatio: 2, cacheBust: true });
      const link = document.createElement("a");
      link.download = `${data.title || "material"}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("התמונה הורדה!");
    } catch (err) {
      toast.error("שגיאה ביצירת התמונה");
    }
  };

  if (!active) {
    return (
      <PortalLayout>
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-6 h-6 text-secondary" />חומרי עזר
            </h1>
            <p className="text-muted-foreground text-sm mt-1">תבניות מעוצבות, ושיתוף קבצים שלך עם איגוד השיעורים</p>
          </div>
          <Tabs value={tab} onValueChange={(v: any) => setTab(v)}>
            <TabsList>
              <TabsTrigger value="templates">תבניות מעוצבות</TabsTrigger>
              <TabsTrigger value="uploads">העלאת קבצים <Badge variant="outline" className="mr-2">{uploads.length}</Badge></TabsTrigger>
            </TabsList>
            <TabsContent value="templates">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {TEMPLATES.map(t => (
              <button key={t.key} onClick={() => openTemplate(t.key)}
                className="bg-card rounded-2xl p-5 border border-border hover:border-secondary hover:shadow-lg transition-all text-right">
                <div className="text-4xl mb-3">{t.icon}</div>
                <h3 className="font-heading font-bold text-foreground mb-1">{t.title}</h3>
                <p className="text-muted-foreground text-sm mb-4">{t.description}</p>
                <div className="text-secondary text-sm font-medium flex items-center gap-1">
                  פתח עורך <ArrowRight className="w-3 h-3 rotate-180" />
                </div>
              </button>
            ))}
              </div>
            </TabsContent>
            <TabsContent value="uploads">
              <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 mt-4">
                <div className="bg-card rounded-2xl border border-border p-5 space-y-3 h-fit">
                  <h3 className="font-heading font-bold text-foreground flex items-center gap-2"><FileUp className="w-4 h-4 text-secondary" />העלאת קובץ חדש</h3>
                  <p className="text-xs text-muted-foreground">הקובץ יישלח לאישור הניהול לפני שיופיע במאגר.</p>
                  <div><label htmlFor="materials-upload-title" className="text-sm font-medium mb-1 block">שם הקובץ *</label>
                    <Input id="materials-upload-title" value={uploadForm.title} onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))} placeholder="למשל: סיכום פרק א בברכות" />
                  </div>
                  <div><label htmlFor="materials-upload-description" className="text-sm font-medium mb-1 block">תיאור</label>
                    <Textarea id="materials-upload-description" rows={2} value={uploadForm.description} onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div><label htmlFor="materials-upload-category" className="text-sm font-medium mb-1 block">קטגוריה *</label>
                    <Select value={uploadForm.category} onValueChange={v => setUploadForm(f => ({ ...f, category: v, subcategory: "" }))}>
                      <SelectTrigger id="materials-upload-category"><SelectValue placeholder="בחר קטגוריה" /></SelectTrigger>
                      <SelectContent>{Object.keys(MATERIAL_CATEGORIES).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {uploadForm.category && (
                    <div><label htmlFor="materials-upload-subcategory" className="text-sm font-medium mb-1 block">תת־קטגוריה</label>
                      <Select value={uploadForm.subcategory} onValueChange={v => setUploadForm(f => ({ ...f, subcategory: v }))}>
                        <SelectTrigger id="materials-upload-subcategory"><SelectValue placeholder="בחר תת־קטגוריה" /></SelectTrigger>
                        <SelectContent>{(MATERIAL_CATEGORIES[uploadForm.category] || []).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  <div><label htmlFor="materials-upload-file" className="text-sm font-medium mb-1 block">קובץ *</label>
                    <Input id="materials-upload-file" type="file" onChange={e => setUploadForm(f => ({ ...f, file: e.target.files?.[0] || null }))}
                      accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp,.mp3,.m4a,.wav,.mp4,.mov,.webm" />
                    <p className="text-xs text-muted-foreground mt-1">תומך בוידאו ואודיו עד 200MB (מתאים לשיעורים של 10-30 דקות)</p>
                  </div>
                  <label className="flex items-center justify-between bg-muted/30 rounded-lg p-2 text-sm cursor-pointer">
                    <span>הצג באתר התדמית הציבורי שלי לאחר אישור</span>
                    <input type="checkbox" checked={uploadForm.display_in_public_profile} onChange={e => setUploadForm(f => ({ ...f, display_in_public_profile: e.target.checked }))} />
                  </label>
                  <Button onClick={submitUpload} disabled={uploading} className="w-full bg-secondary text-secondary-foreground hover:bg-gold-dark gap-2">
                    <Upload className="w-4 h-4" />{uploading ? "מעלה..." : "שלח לאישור"}
                  </Button>
                </div>

                <div className="space-y-2">
                  <h3 className="font-heading font-bold text-foreground mb-2">הקבצים שלי</h3>
                  {uploads.length === 0 && (
                    <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
                      עדיין לא העלית קבצים
                    </div>
                  )}
                  {uploads.map(m => {
                    const Icon = m.status === "approved" ? CheckCircle2 : m.status === "rejected" ? XCircle : Clock;
                    const color = m.status === "approved" ? "text-green-600" : m.status === "rejected" ? "text-destructive" : "text-orange-500";
                    const label = m.status === "approved" ? "מאושר" : m.status === "rejected" ? "נדחה" : "ממתין לאישור";
                    return (
                      <div key={m.id} className="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-foreground">{m.title}</p>
                            <Badge variant="outline" className="text-xs">{m.category}{m.subcategory ? ` / ${m.subcategory}` : ""}</Badge>
                            <span className={`text-xs flex items-center gap-1 ${color}`}><Icon className="w-3 h-3" />{label}</span>
                          </div>
                          {m.description && <p className="text-sm text-muted-foreground mt-1">{m.description}</p>}
                          {m.admin_notes && <p className="text-xs text-destructive mt-1">הערת ניהול: {m.admin_notes}</p>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <a href={m.file_url} target="_blank" rel="noreferrer">
                            <Button size="sm" variant="ghost"><Download className="w-4 h-4" /></Button>
                          </a>
                          <Button size="sm" variant="ghost" onClick={() => deleteUpload(m.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </PortalLayout>
    );
  }

  const tpl = TEMPLATES.find(t => t.key === active)!;

  return (
    <PortalLayout>
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setActive(null)}>
            <ArrowRight className="w-4 h-4 ml-1" />חזרה לתבניות
          </Button>
          <h1 className="font-heading text-xl font-bold">{tpl.title}</h1>
          <Button onClick={download} className="bg-secondary text-secondary-foreground hover:bg-gold-dark">
            <Download className="w-4 h-4 ml-1" />הורד PNG
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
          {/* Editor */}
          <div className="bg-card rounded-2xl p-5 border border-border space-y-4 h-fit">
            <div>
              <label className="text-sm font-medium mb-2 flex items-center gap-1"><Palette className="w-4 h-4" />ערכת צבעים</label>
              <div className="grid grid-cols-3 gap-2">
                {PALETTES.map(p => (
                  <button key={p.name} onClick={() => setPalette(p)}
                    className={`h-12 rounded-lg border-2 ${palette.name === p.name ? "border-secondary" : "border-transparent"}`}
                    style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }}>
                    <span className="text-xs font-medium" style={{ color: p.text }}>{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div><label htmlFor="materials-editor-title" className="text-sm font-medium mb-1 block">כותרת</label>
              <Input id="materials-editor-title" value={data.title} onChange={(e) => setData(d => ({ ...d, title: e.target.value }))} /></div>
            <div><label htmlFor="materials-editor-rabbiname" className="text-sm font-medium mb-1 block">שם הרב</label>
              <Input id="materials-editor-rabbiname" value={data.rabbiName} onChange={(e) => setData(d => ({ ...d, rabbiName: e.target.value }))} /></div>
            <div><label htmlFor="materials-editor-subject" className="text-sm font-medium mb-1 block">נושא / מסכת</label>
              <Input id="materials-editor-subject" value={data.subject} onChange={(e) => setData(d => ({ ...d, subject: e.target.value }))} placeholder="גמרא ברכות, פרשת השבוע..." /></div>
            <div><label htmlFor="materials-editor-location" className="text-sm font-medium mb-1 block">מיקום</label>
              <Input id="materials-editor-location" value={data.location} onChange={(e) => setData(d => ({ ...d, location: e.target.value }))} placeholder="בית כנסת..." /></div>
            <div><label htmlFor="materials-editor-time" className="text-sm font-medium mb-1 block">זמן</label>
              <Input id="materials-editor-time" value={data.time} onChange={(e) => setData(d => ({ ...d, time: e.target.value }))} placeholder="ימים א-ה, 20:00" /></div>
            <div><label htmlFor="materials-editor-body" className="text-sm font-medium mb-1 block">תוכן נוסף</label>
              <Textarea id="materials-editor-body" rows={3} value={data.body} onChange={(e) => setData(d => ({ ...d, body: e.target.value }))} /></div>
            <div><label htmlFor="materials-editor-phone" className="text-sm font-medium mb-1 block">טלפון לפרטים</label>
              <Input id="materials-editor-phone" value={data.phone} onChange={(e) => setData(d => ({ ...d, phone: e.target.value }))} dir="ltr" /></div>
          </div>

          {/* Preview */}
          <div className="overflow-auto">
            <div ref={previewRef}
              dir="rtl"
              style={{
                width: 800,
                minHeight: 1000,
                background: `linear-gradient(135deg, ${palette.from}, ${palette.to})`,
                color: palette.text,
                padding: 60,
                fontFamily: "system-ui, -apple-system, sans-serif",
                position: "relative",
              }}>
              {profile?.logo_url && (
                <img src={profile.logo_url} alt="" crossOrigin="anonymous"
                  style={{ width: 80, height: 80, objectFit: "contain", marginBottom: 20 }} />
              )}

              <div style={{ borderBottom: `3px solid ${palette.accent}`, paddingBottom: 16, marginBottom: 28 }}>
                <div style={{ fontSize: 18, opacity: 0.8 }}>בס"ד</div>
                <h1 style={{ fontSize: 56, fontWeight: 900, margin: "8px 0", lineHeight: 1.1 }}>{data.title}</h1>
              </div>

              {profile?.rabbi_photo_url && (
                <img src={profile.rabbi_photo_url} alt="" crossOrigin="anonymous"
                  style={{ width: 140, height: 140, borderRadius: "50%", objectFit: "cover", border: `4px solid ${palette.accent}`, marginBottom: 20 }} />
              )}

              {data.rabbiName && (
                <div style={{ fontSize: 36, fontWeight: 700, marginBottom: 12 }}>
                  ע"י {data.rabbiName}
                </div>
              )}

              {data.subject && (
                <div style={{ fontSize: 32, fontWeight: 600, marginBottom: 24, color: palette.accent }}>
                  {data.subject}
                </div>
              )}

              <div style={{ display: "grid", gap: 12, fontSize: 24, marginBottom: 30 }}>
                {data.time && <div>🕐 {data.time}</div>}
                {data.location && <div>📍 {data.location}</div>}
                {data.phone && <div dir="ltr" style={{ textAlign: "right" }}>📞 {data.phone}</div>}
              </div>

              {data.body && (
                <div style={{ fontSize: 22, lineHeight: 1.6, marginBottom: 30, whiteSpace: "pre-wrap" }}>
                  {data.body}
                </div>
              )}

              <div style={{
                position: "absolute", bottom: 20, left: 60, right: 60,
                paddingTop: 16, borderTop: `2px solid ${palette.accent}`,
                fontSize: 16, opacity: 0.85, textAlign: "center"
              }}>
                בסיוע איגוד השיעורים · 023131600
              </div>
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
};

export default Materials;