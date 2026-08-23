import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Plus, Trash2, Copy, ExternalLink, Save, RotateCw, Power, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getPublicOrigin } from "@/lib/utils";

interface QuestionOption { value: string; label: string; tags?: string[] }
interface Question {
  id: string;
  label: string;
  type: string;
  options?: QuestionOption[];
  required?: boolean;
  placeholder?: string;
  help?: string;
  showWhen?: { field: string; equals?: string | string[]; truthy?: boolean };
}
interface Section { id: string; title: string; description?: string; questions: Question[] }
interface TagRule { tag: string; topicKeywords?: string[]; category?: string; reason: string; weight?: number }
interface ConfigPayload {
  enabled: boolean;
  introTitle: string;
  introSubtitle: string;
  consentText: string;
  sections: Section[];
  rules: TagRule[];
}
interface ConfigResponse {
  enabled: boolean;
  config: ConfigPayload;
  automationKey: string;
  lastUpdated: string | null;
}

interface LinkRow {
  id: number;
  slug: string;
  title: string;
  description: string;
  presets: Record<string, unknown>;
  hiddenSections: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SubmissionRow {
  id: number;
  slug: string | null;
  createdAt: string;
  contactConsent: boolean;
  contact: null | { fullName: string | null; phone: string | null; email: string | null; idNumber: string | null };
  profile: Record<string, unknown>;
  suggestions: Array<{ topic: string; category: string; potential: string; score: number }>;
  selectedIds: number[];
  webhookStatus: string;
  webhookLogId: number | null;
}

function buildPublicUrl(slug?: string) {
  const base = getPublicOrigin();
  if (!slug) return `${base}/#/potential`;
  return `${base}/#/potential/${encodeURIComponent(slug)}`;
}

export default function PotentialAdminPage() {
  const { toast } = useToast();
  const { data: cfgData, isLoading } = useQuery<ConfigResponse>({ queryKey: ["/api/admin/potential/config"] });
  const { data: linksData } = useQuery<LinkRow[]>({ queryKey: ["/api/admin/potential/links"] });
  const { data: subsData } = useQuery<SubmissionRow[]>({ queryKey: ["/api/admin/potential/submissions"] });

  const [config, setConfig] = useState<ConfigPayload | null>(null);
  const [saving, setSaving] = useState(false);
  const [openSectionIdx, setOpenSectionIdx] = useState<number | null>(0);
  const [openRulesPanel, setOpenRulesPanel] = useState(false);

  // New link form state
  const [newSlug, setNewSlug] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPresetsText, setNewPresetsText] = useState("{}");
  const [newHidden, setNewHidden] = useState<string[]>([]);

  useEffect(() => {
    if (!cfgData) return;
    setConfig({ ...cfgData.config, enabled: cfgData.enabled });
  }, [cfgData]);

  async function saveConfig(next: Partial<ConfigPayload>) {
    if (!config) return;
    setSaving(true);
    try {
      const body = {
        enabled: next.enabled !== undefined ? next.enabled : config.enabled,
        introTitle: next.introTitle ?? config.introTitle,
        introSubtitle: next.introSubtitle ?? config.introSubtitle,
        consentText: next.consentText ?? config.consentText,
        sections: next.sections ?? config.sections,
        rules: next.rules ?? config.rules,
      };
      await apiRequest("PATCH", "/api/admin/potential/config", body);
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/potential/config"] });
      toast({ title: "נשמר", description: "ההגדרות עודכנו" });
    } catch (err: any) {
      toast({ title: "שגיאה בשמירה", description: err?.message || "נסו שוב", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function resetDefaults() {
    if (!window.confirm("לאפס את כל הסעיפים והכללים לברירות המחדל? פעולה זו תכתוב על השינויים שלכם.")) return;
    setSaving(true);
    try {
      await apiRequest("POST", "/api/admin/potential/config/reset-defaults");
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/potential/config"] });
      toast({ title: "אופס לברירות מחדל" });
    } catch (err: any) {
      toast({ title: "שגיאה", description: err?.message || "נסו שוב", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function createLink() {
    let presets: Record<string, unknown> = {};
    try { presets = JSON.parse(newPresetsText || "{}"); } catch {
      toast({ title: "JSON של ערכי ברירת מחדל אינו תקין", variant: "destructive" });
      return;
    }
    try {
      await apiRequest("POST", "/api/admin/potential/links", {
        slug: newSlug,
        title: newTitle,
        description: newDesc,
        presets,
        hiddenSections: newHidden,
      });
      setNewSlug(""); setNewTitle(""); setNewDesc(""); setNewPresetsText("{}"); setNewHidden([]);
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/potential/links"] });
      toast({ title: "קישור נוצר" });
    } catch (err: any) {
      toast({ title: "שגיאה", description: err?.message || "יצירה נכשלה", variant: "destructive" });
    }
  }

  async function toggleLink(id: number, active: boolean) {
    try {
      await apiRequest("PATCH", `/api/admin/potential/links/${id}`, { active });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/potential/links"] });
    } catch (err: any) {
      toast({ title: "שגיאה", description: err?.message || "נסו שוב", variant: "destructive" });
    }
  }

  const deletingLinkRef = useRef<Set<number>>(new Set());
  async function deleteLink(id: number) {
    if (!window.confirm("למחוק את הקישור הזה?")) return;
    if (deletingLinkRef.current.has(id)) return;
    deletingLinkRef.current.add(id);
    try {
      await apiRequest("DELETE", `/api/admin/potential/links/${id}`);
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/potential/links"] });
    } catch (err: any) {
      toast({ title: "שגיאה", description: err?.message || "נסו שוב", variant: "destructive" });
    } finally {
      deletingLinkRef.current.delete(id);
    }
  }

  async function copyLink(slug?: string) {
    const url = buildPublicUrl(slug);
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "הקישור הועתק", description: url });
    } catch {
      toast({ title: "לא ניתן להעתיק", description: url, variant: "destructive" });
    }
  }

  function updateSection(idx: number, patch: Partial<Section>) {
    if (!config) return;
    const sections = [...config.sections];
    sections[idx] = { ...sections[idx], ...patch };
    setConfig({ ...config, sections });
  }
  function updateQuestion(secIdx: number, qIdx: number, patch: Partial<Question>) {
    if (!config) return;
    const sections = [...config.sections];
    const questions = [...sections[secIdx].questions];
    questions[qIdx] = { ...questions[qIdx], ...patch };
    sections[secIdx] = { ...sections[secIdx], questions };
    setConfig({ ...config, sections });
  }
  function addQuestion(secIdx: number) {
    if (!config) return;
    const sections = [...config.sections];
    const newQ: Question = { id: `q_${Date.now()}`, label: "שאלה חדשה", type: "text" };
    sections[secIdx] = { ...sections[secIdx], questions: [...sections[secIdx].questions, newQ] };
    setConfig({ ...config, sections });
  }
  function removeQuestion(secIdx: number, qIdx: number) {
    if (!config) return;
    const sections = [...config.sections];
    sections[secIdx] = { ...sections[secIdx], questions: sections[secIdx].questions.filter((_, i) => i !== qIdx) };
    setConfig({ ...config, sections });
  }

  function updateRule(idx: number, patch: Partial<TagRule>) {
    if (!config) return;
    const rules = [...config.rules];
    rules[idx] = { ...rules[idx], ...patch };
    setConfig({ ...config, rules });
  }
  function addRule() {
    if (!config) return;
    setConfig({ ...config, rules: [...config.rules, { tag: "tag_new", topicKeywords: [], reason: "סיבה", weight: 1 }] });
  }
  function removeRule(idx: number) {
    if (!config) return;
    setConfig({ ...config, rules: config.rules.filter((_, i) => i !== idx) });
  }

  const sectionLabels = useMemo(() => (config?.sections ?? []).map((s) => ({ id: s.id, title: s.title })), [config]);

  if (isLoading || !config) {
    return <div className="p-6 text-sm text-muted-foreground" dir="rtl">טוען...</div>;
  }

  return (
    <div dir="rtl" className="space-y-6" data-testid="page-potential-admin">
      <header className="space-y-2">
        <Badge variant="outline" className="text-xs">פנימי · לצוות בקלות</Badge>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" /> סורק פוטנציאל זכויות
        </h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          שאלון פרופיל ציבורי שמציע אילו זכויות שווה לבדוק לפי התשובות, מבלי לחשוף את כל פרטי המאגר.
          מבקרים עונים ללא פרטי זיהוי, רואים הצעות, ורק לאחר הסכמה מפורשת ניתן להעביר את פרטי הקשר לצוות בקלות.
          ניתן להפעיל/לכבות, לערוך את סעיפי השאלון ואת כללי המיפוי, ולהפיק קישורים מותאמים אישית עם ברירות-מחדל.
        </p>
      </header>

      <Card className="p-5 space-y-4 border border-card-border">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Power className={`w-5 h-5 ${config.enabled ? "text-primary" : "text-muted-foreground"}`} />
            <div>
              <div className="font-semibold text-sm">סטטוס הסורק</div>
              <div className="text-xs text-muted-foreground">
                {config.enabled ? "הסורק זמין לציבור בכתובת /#/potential" : "כבוי — מבקרים יראו הודעה שהשירות זמני לא פעיל"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={config.enabled} onCheckedChange={(v) => saveConfig({ enabled: Boolean(v) })} disabled={saving} data-testid="potential-toggle-enabled" aria-label="הפעלה/כיבוי של הסורק לציבור" />
            <Button variant="outline" size="sm" onClick={() => copyLink()}>
              <Copy className="w-4 h-4 ml-1" /> הקישור הציבורי
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-4 border border-card-border">
        <h2 className="text-lg font-semibold">כותרות וטקסטים</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs">כותרת ראשית</Label>
            <Input value={config.introTitle} onChange={(e) => setConfig({ ...config, introTitle: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">משפט שאלת הסכמה</Label>
            <Input value={config.consentText} onChange={(e) => setConfig({ ...config, consentText: e.target.value })} />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">תיאור מתחת לכותרת</Label>
          <Textarea value={config.introSubtitle} onChange={(e) => setConfig({ ...config, introSubtitle: e.target.value })} className="min-h-20" aria-label="תיאור מתחת לכותרת" />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={resetDefaults} disabled={saving}>
            <RotateCw className="w-4 h-4 ml-1" /> איפוס לברירות מחדל
          </Button>
          <Button size="sm" onClick={() => saveConfig({})} disabled={saving}>
            <Save className="w-4 h-4 ml-1" /> שמירה
          </Button>
        </div>
      </Card>

      <Card className="p-5 space-y-3 border border-card-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">סעיפי השאלון</h2>
          <Button size="sm" onClick={() => saveConfig({ sections: config.sections })} disabled={saving}>
            <Save className="w-4 h-4 ml-1" /> שמירה
          </Button>
        </div>
        {config.sections.map((sec, sIdx) => (
          <Card key={sec.id} className="p-3 border border-border">
            <button
              type="button"
              className="w-full flex items-center justify-between text-right"
              onClick={() => setOpenSectionIdx(openSectionIdx === sIdx ? null : sIdx)}
            >
              <div>
                <div className="font-semibold">{sec.title}</div>
                <div className="text-xs text-muted-foreground">{sec.questions.length} שאלות · ID: {sec.id}</div>
              </div>
              {openSectionIdx === sIdx ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {openSectionIdx === sIdx && (
              <div className="mt-3 space-y-3">
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">כותרת הסעיף</Label>
                    <Input value={sec.title} onChange={(e) => updateSection(sIdx, { title: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">תיאור הסעיף (אופציונלי)</Label>
                    <Input value={sec.description ?? ""} onChange={(e) => updateSection(sIdx, { description: e.target.value })} />
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  {sec.questions.map((q, qIdx) => (
                    <Card key={qIdx} className="p-3 border border-border bg-muted/30">
                      <div className="grid md:grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">מזהה (id)</Label>
                          <Input value={q.id} onChange={(e) => updateQuestion(sIdx, qIdx, { id: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-xs">סוג</Label>
                          <select
                            value={q.type}
                            onChange={(e) => updateQuestion(sIdx, qIdx, { type: e.target.value })}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            {["text","number","date","select","radio","checkbox","yesno","yes_no_unknown","textarea","child_list"].map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="mt-2">
                        <Label className="text-xs">תווית הצגה</Label>
                        <Input value={q.label} onChange={(e) => updateQuestion(sIdx, qIdx, { label: e.target.value })} />
                      </div>
                      <div className="mt-2">
                        <Label className="text-xs">עזר (אופציונלי)</Label>
                        <Input value={q.help ?? ""} onChange={(e) => updateQuestion(sIdx, qIdx, { help: e.target.value })} />
                      </div>
                      {(q.type === "select" || q.type === "radio" || q.type === "yesno" || q.type === "yes_no_unknown" || q.type === "checkbox") && (
                        <div className="mt-2 space-y-2">
                          <Label className="text-xs">אפשרויות (value · label · תגים מופרדים בפסיק)</Label>
                          <div className="space-y-1">
                            {(q.options ?? []).map((opt, oIdx) => (
                              <div key={oIdx} className="grid grid-cols-12 gap-1 items-center">
                                <Input className="col-span-3" value={opt.value} onChange={(e) => {
                                  const next = [...(q.options ?? [])];
                                  next[oIdx] = { ...next[oIdx], value: e.target.value };
                                  updateQuestion(sIdx, qIdx, { options: next });
                                }} placeholder="value" />
                                <Input className="col-span-4" value={opt.label} onChange={(e) => {
                                  const next = [...(q.options ?? [])];
                                  next[oIdx] = { ...next[oIdx], label: e.target.value };
                                  updateQuestion(sIdx, qIdx, { options: next });
                                }} placeholder="label" />
                                <Input className="col-span-4" value={(opt.tags ?? []).join(",")} onChange={(e) => {
                                  const next = [...(q.options ?? [])];
                                  next[oIdx] = { ...next[oIdx], tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) };
                                  updateQuestion(sIdx, qIdx, { options: next });
                                }} placeholder="tag1,tag2" />
                                <Button variant="ghost" size="icon" className="col-span-1" onClick={() => {
                                  const next = (q.options ?? []).filter((_, i) => i !== oIdx);
                                  updateQuestion(sIdx, qIdx, { options: next });
                                }}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                          <Button size="sm" variant="outline" onClick={() => {
                            const next = [...(q.options ?? []), { value: `opt_${Date.now()}`, label: "אפשרות חדשה", tags: [] }];
                            updateQuestion(sIdx, qIdx, { options: next });
                          }}>
                            <Plus className="w-3.5 h-3.5 ml-1" /> אפשרות
                          </Button>
                        </div>
                      )}
                      <div className="mt-2 grid md:grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">תנאי תצוגה — שדה</Label>
                          <Input value={q.showWhen?.field ?? ""} onChange={(e) => {
                            const field = e.target.value;
                            if (!field) updateQuestion(sIdx, qIdx, { showWhen: undefined });
                            else updateQuestion(sIdx, qIdx, { showWhen: { ...(q.showWhen ?? { field }), field } });
                          }} placeholder="למשל familyStatus" />
                        </div>
                        <div>
                          <Label className="text-xs">תנאי תצוגה — שווה ל (פסיק מפריד)</Label>
                          <Input value={Array.isArray(q.showWhen?.equals) ? (q.showWhen!.equals as string[]).join(",") : (q.showWhen?.equals as string | undefined) ?? ""} onChange={(e) => {
                            const raw = e.target.value;
                            const parts = raw.split(",").map((t) => t.trim()).filter(Boolean);
                            const equals = parts.length > 1 ? parts : (parts[0] ?? "");
                            const existingField = q.showWhen?.field ?? "";
                            updateQuestion(sIdx, qIdx, { showWhen: { field: existingField, equals } });
                          }} placeholder="למשל yes או mild,moderate,severe" />
                        </div>
                      </div>
                      <div className="mt-2 flex justify-end">
                        <Button size="sm" variant="ghost" onClick={() => removeQuestion(sIdx, qIdx)} className="text-destructive">
                          <Trash2 className="w-3.5 h-3.5 ml-1" /> הסר שאלה
                        </Button>
                      </div>
                    </Card>
                  ))}
                  <div>
                    <Button size="sm" variant="outline" onClick={() => addQuestion(sIdx)}>
                      <Plus className="w-3.5 h-3.5 ml-1" /> הוספת שאלה
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        ))}
      </Card>

      <Card className="p-5 space-y-3 border border-card-border">
        <button type="button" className="w-full flex items-center justify-between text-right" onClick={() => setOpenRulesPanel((v) => !v)}>
          <div>
            <h2 className="text-lg font-semibold">כללי מיפוי (תגים → נושאים)</h2>
            <p className="text-xs text-muted-foreground">{config.rules.length} כללים</p>
          </div>
          {openRulesPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {openRulesPanel && (
          <>
            <p className="text-xs text-muted-foreground">
              כל כלל אומר: כאשר תג מסוים עולה (לפי תשובות המבקר), כדאי להציע נושאים שכותרת/קטגוריה/aiSearch שלהם מכילים את אחת ממילות-המפתח, או שהקטגוריה תואמת בדיוק. <span className="font-semibold">סיבה</span> מוצגת ליד הנושא. <span className="font-semibold">משקל</span> משפיע על דירוג הפוטנציאל.
            </p>
            <div className="space-y-2">
              {config.rules.map((r, idx) => (
                <Card key={idx} className="p-3 border border-border">
                  <div className="grid md:grid-cols-12 gap-2">
                    <div className="md:col-span-2">
                      <Label className="text-xs">תג</Label>
                      <Input value={r.tag} onChange={(e) => updateRule(idx, { tag: e.target.value })} />
                    </div>
                    <div className="md:col-span-3">
                      <Label className="text-xs">קטגוריה (אופציונלי)</Label>
                      <Input value={r.category ?? ""} onChange={(e) => updateRule(idx, { category: e.target.value || undefined })} />
                    </div>
                    <div className="md:col-span-5">
                      <Label className="text-xs">מילות מפתח (פסיק מפריד)</Label>
                      <Input
                        value={(r.topicKeywords ?? []).join(", ")}
                        onChange={(e) => updateRule(idx, { topicKeywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                      />
                    </div>
                    <div className="md:col-span-1">
                      <Label className="text-xs">משקל</Label>
                      <Input type="number" min={0} max={5} value={r.weight ?? 1} onChange={(e) => { const v = Number(e.target.value); updateRule(idx, { weight: Number.isFinite(v) ? Math.min(5, Math.max(0, v)) : 0 }); }} />
                    </div>
                    <div className="md:col-span-1 flex items-end">
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeRule(idx)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2">
                    <Label className="text-xs">סיבה להצגה ללקוח</Label>
                    <Input value={r.reason} onChange={(e) => updateRule(idx, { reason: e.target.value })} />
                  </div>
                </Card>
              ))}
            </div>
            <div className="flex justify-between">
              <Button size="sm" variant="outline" onClick={addRule}>
                <Plus className="w-4 h-4 ml-1" /> כלל חדש
              </Button>
              <Button size="sm" onClick={() => saveConfig({ rules: config.rules })} disabled={saving}>
                <Save className="w-4 h-4 ml-1" /> שמירת כללים
              </Button>
            </div>
          </>
        )}
      </Card>

      <Card className="p-5 space-y-4 border border-card-border">
        <h2 className="text-lg font-semibold">קישורים מותאמים אישית</h2>
        <p className="text-xs text-muted-foreground">
          הפיקו קישור עם ערכי ברירת מחדל (presets) ו/או הסתרת סעיפים. לדוגמה: ‘רווק’, ‘נשוי עם דירה’, ‘נשוי ללא דירה’.
        </p>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Slug באנגלית (a-z, 0-9, -, _)</Label>
            <Input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="single, married-with-home" />
          </div>
          <div>
            <Label className="text-xs">כותרת</Label>
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="לדוגמה: בדיקה לרווקים" />
          </div>
        </div>
        <div>
          <Label className="text-xs">תיאור (אופציונלי)</Label>
          <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">ערכי ברירת מחדל (JSON)</Label>
          <Textarea value={newPresetsText} onChange={(e) => setNewPresetsText(e.target.value)} placeholder='{"familyStatus":"single","hasChildren":"no"}' aria-label="ערכי ברירת מחדל (JSON)" className="font-mono text-xs min-h-24" />
        </div>
        <div>
          <Label className="text-xs">סעיפים להסתרה</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {sectionLabels.map((s) => {
              const checked = newHidden.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setNewHidden((prev) => checked ? prev.filter((x) => x !== s.id) : [...prev, s.id])}
                  className={`px-3 py-1 rounded-md text-xs border ${checked ? "bg-destructive/10 border-destructive text-destructive" : "border-border hover-elevate"}`}
                  aria-pressed={checked}
                >
                  {s.title}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={createLink}>
            <Plus className="w-4 h-4 ml-1" /> יצירת קישור
          </Button>
        </div>

        <Separator />

        <div className="space-y-2">
          {(linksData ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">אין קישורים מותאמים כרגע.</p>
          ) : (
            (linksData ?? []).map((l) => (
              <Card key={l.id} className="p-3 border border-border flex items-start justify-between gap-3 flex-wrap">
                <div className="text-right">
                  <div className="font-semibold text-sm">{l.title} <Badge variant="outline" className="text-[10px] mr-1">{l.slug}</Badge> {!l.active && <Badge variant="secondary" className="text-[10px]">כבוי</Badge>}</div>
                  {l.description && <div className="text-xs text-muted-foreground">{l.description}</div>}
                  <div className="text-[11px] text-muted-foreground mt-1" dir="ltr">{buildPublicUrl(l.slug)}</div>
                  {l.hiddenSections.length > 0 && <div className="text-[11px] text-muted-foreground">מוסתרים: {l.hiddenSections.join(", ")}</div>}
                </div>
                <div className="flex items-center gap-1">
                  <Switch checked={l.active} onCheckedChange={(v) => toggleLink(l.id, Boolean(v))} aria-label={`הפעלה/כיבוי של הקישור ${l.title}`} />
                  <Button variant="outline" size="sm" onClick={() => copyLink(l.slug)}>
                    <Copy className="w-3.5 h-3.5 ml-1" /> העתק
                  </Button>
                  <a href={buildPublicUrl(l.slug)} target="_blank" rel="noreferrer" className="inline-flex">
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="w-3.5 h-3.5 ml-1" /> פתח
                    </Button>
                  </a>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteLink(l.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </Card>

      <Card className="p-5 space-y-3 border border-card-border">
        <h2 className="text-lg font-semibold">פניות אחרונות</h2>
        <p className="text-xs text-muted-foreground">
          רק פניות שבהן המבקר/ת אישר/ה במפורש להעביר פרטים — מציגות גם פרטי קשר. אחרות נשמרות לסטטיסטיקה בלבד.
        </p>
        {(subsData ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">אין פניות עדיין.</p>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-auto">
            {(subsData ?? []).map((s) => (
              <Card key={s.id} className="p-3 border border-border">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>#{s.id} · {new Date(s.createdAt).toLocaleString("he-IL")}</span>
                  <span>
                    {s.contactConsent ? <Badge variant="default" className="text-[10px]">עם פרטים</Badge> : <Badge variant="outline" className="text-[10px]">ללא פרטים</Badge>}
                    {s.slug && <Badge variant="outline" className="text-[10px] mr-1">קישור: {s.slug}</Badge>}
                    <Badge variant="outline" className="text-[10px] mr-1">webhook: {s.webhookStatus}</Badge>
                  </span>
                </div>
                {s.contactConsent && s.contact && (
                  <div className="mt-1 text-sm">
                    {s.contact.fullName} · {s.contact.phone} · {s.contact.email}
                  </div>
                )}
                <div className="mt-2 text-xs">
                  <span className="font-semibold">הצעות:</span> {s.suggestions.slice(0, 6).map((sg) => `${sg.topic} (${sg.potential})`).join(" · ")}
                  {s.suggestions.length > 6 && ` +${s.suggestions.length - 6}`}
                </div>
                {s.selectedIds.length > 0 && (
                  <div className="text-xs text-primary mt-1">סומנו לקידום: {s.selectedIds.length} נושאים</div>
                )}
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
