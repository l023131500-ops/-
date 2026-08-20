import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getPublicOrigin } from "@/lib/utils";
import {
  Plus, Trash2, Link as LinkIcon, Copy, ChevronLeft, ListChecks, MessageSquare, Eye,
  Settings2, Save, Info,
} from "lucide-react";

type QuestionType = "text" | "textarea" | "number" | "yesno" | "choice" | "multichoice" | "date" | "phone" | "email";

const TYPE_LABELS: Record<QuestionType, string> = {
  text: "טקסט קצר",
  textarea: "טקסט ארוך",
  number: "מספר",
  yesno: "כן / לא",
  choice: "בחירה יחידה",
  multichoice: "בחירה מרובה",
  date: "תאריך",
  phone: "טלפון",
  email: "דוא״ל",
};
const HAS_OPTIONS: QuestionType[] = ["choice", "multichoice"];

interface QuestionOption { value: string; label: string }
interface Question { id: number; label: string; helpText: string | null; type: QuestionType; required: boolean; options: QuestionOption[]; sortOrder: number }
interface Link_ { id: number; slug: string; label: string | null; active: boolean }
interface Questionnaire {
  id: number; title: string; description: string | null; logoUrl: string | null;
  introText: string | null; successText: string | null; collectContact: boolean; active: boolean;
  questionCount?: number; linkCount?: number;
}
interface Submission {
  id: number; questionnaireId: number; slug: string | null; answers: Record<string, unknown>;
  contactName: string | null; contactPhone: string | null; contactEmail: string | null;
  communityName: string | null; webhookStatus: string; createdAt: string;
}
interface CommunitySettings {
  publicEnabled: boolean;
  sourceLabel: string;
  defaultLogoUrl: string;
  brandingText: string;
}

export default function CommunityAdmin() {
  const { toast } = useToast();
  const [list, setList] = useState<Questionnaire[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<{ questionnaire: Questionnaire; questions: Question[]; links: Link_[] } | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [tab, setTab] = useState<"edit" | "submissions">("edit");

  const [newTitle, setNewTitle] = useState("");
  const [newQuestion, setNewQuestion] = useState<{ label: string; type: QuestionType; helpText: string; required: boolean; optionsText: string }>(
    { label: "", type: "text", helpText: "", required: false, optionsText: "" },
  );
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [settings, setSettings] = useState<CommunitySettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const origin = getPublicOrigin();

  async function loadList() {
    const r = await apiRequest("GET", "/api/community/admin/questionnaires");
    setList(await r.json());
  }
  async function loadSettings() {
    try {
      const r = await apiRequest("GET", "/api/community/admin/settings");
      setSettings(await r.json());
    } catch { /* non-fatal */ }
  }
  async function saveSettings(patch: Partial<CommunitySettings>) {
    setSavingSettings(true);
    try {
      const r = await apiRequest("PATCH", "/api/community/admin/settings", patch);
      setSettings(await r.json());
      toast({ title: "ההגדרות נשמרו" });
    } catch {
      toast({ title: "שמירת ההגדרות נכשלה", variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  }
  async function loadDetail(id: number) {
    const r = await apiRequest("GET", `/api/community/admin/questionnaires/${id}`);
    setDetail(await r.json());
    setSelectedId(id);
  }
  async function loadSubmissions(id: number) {
    const r = await apiRequest("GET", `/api/community/admin/submissions?questionnaireId=${id}`);
    setSubmissions(await r.json());
  }
  useEffect(() => { loadList(); loadSettings(); }, []);

  async function createQuestionnaire() {
    if (!newTitle.trim()) return;
    try {
      const r = await apiRequest("POST", "/api/community/admin/questionnaires", { title: newTitle });
      const q = await r.json();
      setNewTitle("");
      await loadList();
      loadDetail(q.id);
    } catch {
      toast({ title: "יצירת השאלון נכשלה", variant: "destructive" });
    }
  }

  async function saveQuestionnaire(patch: Partial<Questionnaire>) {
    if (!detail) return;
    try {
      await apiRequest("PATCH", `/api/community/admin/questionnaires/${detail.questionnaire.id}`, patch);
      loadDetail(detail.questionnaire.id);
      loadList();
    } catch {
      toast({ title: "שמירת השאלון נכשלה", variant: "destructive" });
    }
  }

  async function addQuestion() {
    if (!detail || !newQuestion.label.trim()) return;
    const options = HAS_OPTIONS.includes(newQuestion.type)
      ? newQuestion.optionsText.split("\n").map((s) => s.trim()).filter(Boolean).map((s) => ({ value: s, label: s }))
      : [];
    try {
      await apiRequest("POST", `/api/community/admin/questionnaires/${detail.questionnaire.id}/questions`, {
        label: newQuestion.label, type: newQuestion.type, helpText: newQuestion.helpText,
        required: newQuestion.required, options, sortOrder: detail.questions.length,
      });
      setNewQuestion({ label: "", type: "text", helpText: "", required: false, optionsText: "" });
      loadDetail(detail.questionnaire.id);
    } catch {
      toast({ title: "הוספת השאלה נכשלה", variant: "destructive" });
    }
  }

  async function updateQuestion(id: number, patch: Partial<Question>) {
    try {
      await apiRequest("PATCH", `/api/community/admin/questions/${id}`, patch);
      if (detail) loadDetail(detail.questionnaire.id);
    } catch {
      toast({ title: "עדכון השאלה נכשל", variant: "destructive" });
    }
  }
  async function deleteQuestion(id: number) {
    try {
      await apiRequest("DELETE", `/api/community/admin/questions/${id}`);
      if (detail) loadDetail(detail.questionnaire.id);
    } catch {
      toast({ title: "מחיקת השאלה נכשלה", variant: "destructive" });
    }
  }

  async function addLink() {
    if (!detail) return;
    try {
      await apiRequest("POST", `/api/community/admin/questionnaires/${detail.questionnaire.id}/links`, { label: newLinkLabel });
      setNewLinkLabel("");
      loadDetail(detail.questionnaire.id);
    } catch {
      toast({ title: "הוספת הקישור נכשלה", variant: "destructive" });
    }
  }
  async function toggleLink(l: Link_) {
    try {
      await apiRequest("PATCH", `/api/community/admin/links/${l.id}`, { active: !l.active });
      if (detail) loadDetail(detail.questionnaire.id);
    } catch {
      toast({ title: "עדכון הקישור נכשל", variant: "destructive" });
    }
  }
  async function deleteLink(id: number) {
    try {
      await apiRequest("DELETE", `/api/community/admin/links/${id}`);
      if (detail) loadDetail(detail.questionnaire.id);
    } catch {
      toast({ title: "מחיקת הקישור נכשלה", variant: "destructive" });
    }
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url).then(
      () => toast({ title: "הקישור הועתק", description: url }),
      () => toast({ title: "העתיקו ידנית", description: url }),
    );
  }
  function copyLink(slug: string) {
    copyUrl(`${origin}/#/community/${slug}`);
  }

  // ---- List view ----
  if (!detail) {
    return (
      <div className="space-y-6" dir="rtl" data-testid="page-community-admin">
        <header className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">שאלוני גבאי קהילות — מיפוי צרכי קהילה</p>
          <h1 className="text-xl md:text-2xl font-bold">שאלוני גבאי קהילות</h1>
        </header>

        <CommunitySettingsCard settings={settings} saving={savingSettings} onSave={saveSettings} origin={origin} onCopy={(u) => copyUrl(u)} />

        <Card className="p-4 space-y-2 border-primary/20 bg-primary/5" data-testid="community-help">
          <h3 className="font-semibold text-sm flex items-center gap-2"><Info className="w-4 h-4 text-primary" /> איך זה עובד?</h3>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc pr-5">
            <li>צרו שאלון חדש למטה, ואז לחצו "ניהול השאלון".</li>
            <li>בתוך השאלון מוסיפים <b>שאלות</b> ובוחרים <b>סוג תשובה</b> (טקסט, בחירה, כן/לא, ועוד).</li>
            <li>יוצרים <b>קישורים ייעודיים</b> לשיתוף — אפשר להעתיק, להפעיל/לכבות ולמחוק כל קישור.</li>
            <li>התגובות נצפות בלשונית <b>"תגובות"</b> בתוך השאלון, וגם נשלחות לאוטומציה.</li>
          </ul>
        </Card>

        <Card className="p-4 flex gap-2 items-end flex-wrap">
          <div className="flex-1 min-w-[200px] space-y-1">
            <Label className="text-xs">שם שאלון חדש</Label>
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="לדוגמה: צרכי קהילה" data-testid="input-new-questionnaire" />
          </div>
          <Button onClick={createQuestionnaire} data-testid="button-create-questionnaire"><Plus className="w-4 h-4 ml-1" /> יצירת שאלון</Button>
        </Card>

        <div className="grid sm:grid-cols-2 gap-3">
          {list.map((q) => (
            <Card key={q.id} className="p-4 flex flex-col gap-2" data-testid={`questionnaire-card-${q.id}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{q.title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded ${q.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {q.active ? "פעיל" : "כבוי"}
                </span>
              </div>
              {q.description && <p className="text-xs text-muted-foreground line-clamp-2">{q.description}</p>}
              <div className="text-xs text-muted-foreground flex gap-3">
                <span><ListChecks className="w-3 h-3 inline" /> {q.questionCount ?? 0} שאלות</span>
                <span><LinkIcon className="w-3 h-3 inline" /> {q.linkCount ?? 0} קישורים</span>
              </div>
              <Button variant="outline" size="sm" className="mt-auto" onClick={() => loadDetail(q.id)} data-testid={`button-open-questionnaire-${q.id}`}>
                ניהול השאלון <ChevronLeft className="w-4 h-4 mr-1" />
              </Button>
            </Card>
          ))}
          {list.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground sm:col-span-2">אין עדיין שאלונים. צרו שאלון חדש למעלה.</Card>}
        </div>
      </div>
    );
  }

  // ---- Detail / edit view ----
  const q = detail.questionnaire;
  return (
    <div className="space-y-6" dir="rtl" data-testid="page-community-detail">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button className="text-sm text-primary inline-flex items-center gap-1" onClick={() => { setDetail(null); setSelectedId(null); }} data-testid="button-back-list">
          <ChevronLeft className="w-4 h-4 rotate-180" /> חזרה לרשימת השאלונים
        </button>
        <div className="flex gap-2">
          <Button variant={tab === "edit" ? "default" : "outline"} size="sm" onClick={() => setTab("edit")} data-testid="tab-edit">עריכה</Button>
          <Button variant={tab === "submissions" ? "default" : "outline"} size="sm" onClick={() => { setTab("submissions"); loadSubmissions(q.id); }} data-testid="tab-submissions">
            <MessageSquare className="w-4 h-4 ml-1" /> תגובות
          </Button>
        </div>
      </div>

      {tab === "submissions" ? (
        <div className="space-y-3" data-testid="community-submissions">
          <h2 className="text-lg font-bold">תגובות לשאלון: {q.title}</h2>
          {submissions.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">אין עדיין תגובות.</Card>
          ) : (
            submissions.map((s) => (
              <Card key={s.id} className="p-4 space-y-2" data-testid={`submission-${s.id}`}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{s.communityName || s.contactName || `תגובה #${s.id}`}</span>
                  <span className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleString("he-IL")}</span>
                </div>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                  {s.contactName && <span>איש קשר: {s.contactName}</span>}
                  {s.contactPhone && <span>טלפון: {s.contactPhone}</span>}
                  {s.contactEmail && <span>דוא״ל: {s.contactEmail}</span>}
                  <span>וובהוק: {s.webhookStatus}</span>
                </div>
                <details className="text-xs">
                  <summary className="cursor-pointer text-primary">צפייה בתשובות</summary>
                  <div className="mt-2 space-y-1">
                    {detail.questions.map((ques) => {
                      const a = s.answers[String(ques.id)];
                      if (a === undefined || a === null || a === "") return null;
                      return <div key={ques.id}><b>{ques.label}:</b> {Array.isArray(a) ? a.join(", ") : String(a)}</div>;
                    })}
                  </div>
                </details>
              </Card>
            ))
          )}
        </div>
      ) : (
        <>
          {/* Questionnaire settings */}
          <Card className="p-4 space-y-3" data-testid="community-settings">
            <h2 className="font-semibold">הגדרות השאלון</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">כותרת</Label><Input defaultValue={q.title} onBlur={(e) => e.target.value !== q.title && saveQuestionnaire({ title: e.target.value })} data-testid="input-q-title" /></div>
              <div className="space-y-1">
                <Label className="text-xs">לוגו (כתובת URL)</Label>
                <Input defaultValue={q.logoUrl || ""} onBlur={(e) => e.target.value !== (q.logoUrl || "") && saveQuestionnaire({ logoUrl: e.target.value })} placeholder="https://..." data-testid="input-q-logo" />
              </div>
            </div>
            <div className="space-y-1"><Label className="text-xs">תיאור</Label><Textarea defaultValue={q.description || ""} onBlur={(e) => e.target.value !== (q.description || "") && saveQuestionnaire({ description: e.target.value })} data-testid="input-q-description" /></div>
            <div className="space-y-1"><Label className="text-xs">טקסט פתיחה</Label><Textarea defaultValue={q.introText || ""} onBlur={(e) => e.target.value !== (q.introText || "") && saveQuestionnaire({ introText: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">הודעת סיום (ללקוח)</Label><Textarea defaultValue={q.successText || ""} onBlur={(e) => e.target.value !== (q.successText || "") && saveQuestionnaire({ successText: e.target.value })} /></div>
            {q.logoUrl && <img src={q.logoUrl} alt="תצוגת לוגו" className="h-12 object-contain" />}
            <div className="flex items-center gap-6 pt-2 border-t border-border">
              <label className="flex items-center gap-2 text-sm"><Switch checked={q.active} onCheckedChange={(v) => saveQuestionnaire({ active: v })} data-testid="switch-q-active" /> שאלון פעיל</label>
              <label className="flex items-center gap-2 text-sm"><Switch checked={q.collectContact} onCheckedChange={(v) => saveQuestionnaire({ collectContact: v })} data-testid="switch-q-contact" /> איסוף פרטי קשר</label>
            </div>
          </Card>

          {/* Links */}
          <Card className="p-4 space-y-3" data-testid="community-links">
            <h2 className="font-semibold flex items-center gap-2"><LinkIcon className="w-4 h-4" /> קישורים ייעודיים</h2>
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1"><Label className="text-xs">תיאור קישור חדש</Label><Input value={newLinkLabel} onChange={(e) => setNewLinkLabel(e.target.value)} placeholder="לדוגמה: קמפיין פסח" data-testid="input-new-link" /></div>
              <Button size="sm" onClick={addLink} data-testid="button-add-link"><Plus className="w-4 h-4 ml-1" /> יצירת קישור</Button>
            </div>
            <div className="space-y-2">
              {detail.links.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-2 p-2 rounded border border-border text-sm flex-wrap" data-testid={`link-row-${l.id}`}>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span>{l.label || l.slug} {!l.active && <span className="text-muted-foreground">(כבוי)</span>}</span>
                    <code dir="ltr" className="text-xs text-muted-foreground truncate">{origin}/#/community/{l.slug}</code>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => copyLink(l.slug)} title="העתקה"><Copy className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => window.open(`${origin}/#/community/${l.slug}`, "_blank")} title="תצוגה"><Eye className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => toggleLink(l)} title="הפעלה/כיבוי"><Switch checked={l.active} /></Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteLink(l.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
              {detail.links.length === 0 && <p className="text-xs text-muted-foreground">אין עדיין קישורים. צרו קישור ייעודי לשיתוף השאלון.</p>}
            </div>
          </Card>

          {/* Questions */}
          <Card className="p-4 space-y-4" data-testid="community-questions">
            <h2 className="font-semibold flex items-center gap-2"><ListChecks className="w-4 h-4" /> שאלות ({detail.questions.length})</h2>

            <div className="space-y-2">
              {detail.questions.map((ques) => (
                <div key={ques.id} className="p-3 rounded border border-border space-y-2" data-testid={`question-row-${ques.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1">
                      <Input defaultValue={ques.label} onBlur={(e) => e.target.value !== ques.label && updateQuestion(ques.id, { label: e.target.value })} className="font-medium" data-testid={`question-label-${ques.id}`} />
                      <Input defaultValue={ques.helpText || ""} onBlur={(e) => e.target.value !== (ques.helpText || "") && updateQuestion(ques.id, { helpText: e.target.value })} placeholder="טקסט עזרה (לא חובה)" className="text-xs" />
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => deleteQuestion(ques.id)} data-testid={`button-del-question-${ques.id}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1 text-xs">
                      <Label className="text-xs">סוג תשובה:</Label>
                      <select
                        className="border border-border rounded-md px-2 py-1 text-sm bg-background"
                        value={ques.type}
                        onChange={(e) => updateQuestion(ques.id, { type: e.target.value as QuestionType })}
                        data-testid={`question-type-${ques.id}`}
                      >
                        {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <label className="flex items-center gap-2 text-xs"><Switch checked={ques.required} onCheckedChange={(v) => updateQuestion(ques.id, { required: v })} /> חובה</label>
                  </div>
                  {HAS_OPTIONS.includes(ques.type) && (
                    <div className="space-y-1">
                      <Label className="text-xs">אפשרויות (שורה לכל אפשרות)</Label>
                      <Textarea
                        defaultValue={ques.options.map((o) => o.label).join("\n")}
                        onBlur={(e) => {
                          const options = e.target.value.split("\n").map((s) => s.trim()).filter(Boolean).map((s) => ({ value: s, label: s }));
                          updateQuestion(ques.id, { options });
                        }}
                        data-testid={`question-options-${ques.id}`}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add question */}
            <div className="p-3 rounded border border-dashed border-border space-y-2 bg-muted/30" data-testid="add-question-form">
              <h3 className="text-sm font-semibold">הוספת שאלה</h3>
              <Input value={newQuestion.label} onChange={(e) => setNewQuestion({ ...newQuestion, label: e.target.value })} placeholder="נוסח השאלה" data-testid="input-new-question-label" />
              <Input value={newQuestion.helpText} onChange={(e) => setNewQuestion({ ...newQuestion, helpText: e.target.value })} placeholder="טקסט עזרה (לא חובה)" className="text-xs" />
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1">
                  <Label className="text-xs">סוג תשובה:</Label>
                  <select className="border border-border rounded-md px-2 py-1 text-sm bg-background" value={newQuestion.type} onChange={(e) => setNewQuestion({ ...newQuestion, type: e.target.value as QuestionType })} data-testid="select-new-question-type">
                    {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-xs"><Switch checked={newQuestion.required} onCheckedChange={(v) => setNewQuestion({ ...newQuestion, required: v })} /> חובה</label>
              </div>
              {HAS_OPTIONS.includes(newQuestion.type) && (
                <div className="space-y-1">
                  <Label className="text-xs">אפשרויות (שורה לכל אפשרות)</Label>
                  <Textarea value={newQuestion.optionsText} onChange={(e) => setNewQuestion({ ...newQuestion, optionsText: e.target.value })} placeholder={"אפשרות 1\nאפשרות 2"} data-testid="input-new-question-options" />
                </div>
              )}
              <Button size="sm" onClick={addQuestion} data-testid="button-add-question"><Plus className="w-4 h-4 ml-1" /> הוספת שאלה</Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function CommunitySettingsCard({ settings, saving, onSave, origin, onCopy }: {
  settings: CommunitySettings | null;
  saving: boolean;
  onSave: (patch: Partial<CommunitySettings>) => void;
  origin: string;
  onCopy: (url: string) => void;
}) {
  const [form, setForm] = useState<CommunitySettings>(
    settings ?? { publicEnabled: true, sourceLabel: "", defaultLogoUrl: "", brandingText: "" },
  );
  useEffect(() => { if (settings) setForm(settings); }, [settings]);

  if (!settings) {
    return <Card className="p-4 text-sm text-muted-foreground" data-testid="community-settings-loading">טוען הגדרות…</Card>;
  }

  const baseUrl = `${origin}/#/community/`;
  return (
    <Card className="p-4 space-y-4" data-testid="community-global-settings">
      <h2 className="font-semibold flex items-center gap-2"><Settings2 className="w-4 h-4" /> הגדרות שאלוני גבאי קהילות</h2>

      <label className="flex items-center justify-between gap-3 text-sm border-t border-border pt-3">
        <span>הפעלת קישורים ציבוריים (גלובלי)
          <span className="block text-xs text-muted-foreground">כשכבוי — כל הקישורים הציבוריים יחזירו "השאלון לא נמצא".</span>
        </span>
        <Switch checked={form.publicEnabled} onCheckedChange={(v) => onSave({ publicEnabled: v })} data-testid="switch-community-public-enabled" />
      </label>

      <div className="grid sm:grid-cols-2 gap-3 border-t border-border pt-3">
        <div className="space-y-1">
          <Label className="text-xs">תווית מקור לוובהוק (source)</Label>
          <Input value={form.sourceLabel} onChange={(e) => setForm({ ...form, sourceLabel: e.target.value })} placeholder="community_gabbai_questionnaire" data-testid="input-community-source-label" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">לוגו ברירת מחדל (URL)</Label>
          <Input dir="ltr" value={form.defaultLogoUrl} onChange={(e) => setForm({ ...form, defaultLogoUrl: e.target.value })} placeholder="https://..." data-testid="input-community-default-logo" />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">טקסט מיתוג ברירת מחדל</Label>
        <Textarea value={form.brandingText} onChange={(e) => setForm({ ...form, brandingText: e.target.value })} data-testid="input-community-branding" />
      </div>
      {form.defaultLogoUrl && <img src={form.defaultLogoUrl} alt="תצוגת לוגו" className="h-12 object-contain" />}

      <div className="flex items-center justify-between gap-3 flex-wrap border-t border-border pt-3">
        <div className="flex items-center gap-2 text-sm min-w-0">
          <LinkIcon className="w-4 h-4 text-primary shrink-0" />
          <span className="shrink-0">בסיס הקישור הציבורי:</span>
          <code dir="ltr" className="text-xs bg-muted/60 px-2 py-1 rounded border border-border truncate">{baseUrl}&lt;slug&gt;</code>
        </div>
        <Button variant="ghost" size="icon" onClick={() => onCopy(baseUrl)} title="העתקת בסיס הקישור" data-testid="button-community-copy-base"><Copy className="w-4 h-4" /></Button>
      </div>

      <Button size="sm" disabled={saving} onClick={() => onSave({
        sourceLabel: form.sourceLabel, defaultLogoUrl: form.defaultLogoUrl, brandingText: form.brandingText,
      })} data-testid="button-community-save-settings">
        <Save className="w-4 h-4 ml-1" /> שמירת ההגדרות
      </Button>
    </Card>
  );
}
