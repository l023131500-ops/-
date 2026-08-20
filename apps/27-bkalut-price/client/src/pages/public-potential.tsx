import { useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Logo } from "@/components/logo";
import { API_BASE } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";

const CONTACT_PHONE = "02-3131500";
const CONTACT_EMAIL = "l023131500@gmail.com";

interface QuestionOption {
  value: string;
  label: string;
  tags?: string[];
}
interface Question {
  id: string;
  label: string;
  type:
    | "text"
    | "number"
    | "date"
    | "select"
    | "radio"
    | "checkbox"
    | "yesno"
    | "yes_no_unknown"
    | "textarea"
    | "child_list";
  options?: QuestionOption[];
  required?: boolean;
  placeholder?: string;
  showWhen?: { field: string; equals?: string | string[]; truthy?: boolean };
  help?: string;
}
interface Section {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
}
interface ConfigPayload {
  enabled: boolean;
  introTitle: string;
  introSubtitle: string;
  consentText: string;
  sections: Section[];
  link: {
    slug: string;
    title: string;
    description: string;
    presets: Record<string, unknown>;
    hiddenSections: string[];
  } | null;
}

interface SuggestionHit {
  rightId: number;
  topic: string;
  category: string;
  subCategory: string;
  publicSiteText: string;
  serviceUrl: string;
  reasons: string[];
  score: number;
  potential: "גבוה" | "בינוני" | "לבדיקה";
}

type Answers = Record<string, any>;

interface ChildEntry {
  firstName?: string;
  birthDate?: string;
  healthStatus?: "normal" | "mild" | "moderate" | "severe";
  impairmentType?: "physical" | "mental" | "developmental" | "other";
  notes?: string;
}

function shouldShow(question: Question, answers: Answers): boolean {
  if (!question.showWhen) return true;
  const v = answers[question.showWhen.field];
  if (question.showWhen.truthy) return Boolean(v);
  if (question.showWhen.equals === undefined) return true;
  const targets = Array.isArray(question.showWhen.equals)
    ? question.showWhen.equals
    : [question.showWhen.equals];
  return targets.includes(String(v ?? ""));
}

function YesNoUnknown({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options?: QuestionOption[];
}) {
  const opts = options && options.length > 0 ? options : [
    { value: "yes", label: "כן" },
    { value: "no", label: "לא" },
    { value: "unknown", label: "לא יודע/ת" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {opts.map((o) => (
        <button
          type="button"
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
            value === o.value
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card hover-elevate border-border text-foreground/85"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function QuestionField({ q, answers, setField }: {
  q: Question;
  answers: Answers;
  setField: (id: string, value: unknown) => void;
}) {
  const id = `q-${q.id}`;
  const v = answers[q.id];

  if (q.type === "text") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-sm font-medium">{q.label}</Label>
        <Input id={id} value={String(v ?? "")} onChange={(e) => setField(q.id, e.target.value)} placeholder={q.placeholder} />
        {q.help && <p className="text-xs text-muted-foreground">{q.help}</p>}
      </div>
    );
  }
  if (q.type === "number") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-sm font-medium">{q.label}</Label>
        <Input id={id} type="number" inputMode="numeric" value={v === undefined || v === null ? "" : String(v)} onChange={(e) => setField(q.id, e.target.value === "" ? "" : Number(e.target.value))} placeholder={q.placeholder} />
        {q.help && <p className="text-xs text-muted-foreground">{q.help}</p>}
      </div>
    );
  }
  if (q.type === "date") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-sm font-medium">{q.label}</Label>
        <Input id={id} type="date" value={String(v ?? "")} onChange={(e) => setField(q.id, e.target.value)} />
      </div>
    );
  }
  if (q.type === "select") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-sm font-medium">{q.label}</Label>
        <select
          id={id}
          value={String(v ?? "")}
          onChange={(e) => setField(q.id, e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">— בחרו —</option>
          {(q.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {q.help && <p className="text-xs text-muted-foreground">{q.help}</p>}
      </div>
    );
  }
  if (q.type === "radio") {
    return (
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">{q.label}</Label>
        <RadioGroup value={String(v ?? "")} onValueChange={(val) => setField(q.id, val)} className="flex flex-wrap gap-3">
          {(q.options ?? []).map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
              <RadioGroupItem value={opt.value} id={`${id}-${opt.value}`} />
              <span>{opt.label}</span>
            </label>
          ))}
        </RadioGroup>
      </div>
    );
  }
  if (q.type === "yesno" || q.type === "yes_no_unknown") {
    return (
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">{q.label}</Label>
        <YesNoUnknown value={String(v ?? "")} onChange={(val) => setField(q.id, val)} options={q.options} />
        {q.help && <p className="text-xs text-muted-foreground">{q.help}</p>}
      </div>
    );
  }
  if (q.type === "checkbox") {
    return (
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">{q.label}</Label>
        <div className="flex flex-wrap gap-2">
          {(q.options ?? []).map((opt) => {
            const arr: string[] = Array.isArray(v) ? v : [];
            const checked = arr.includes(opt.value);
            return (
              <label key={opt.value} className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm cursor-pointer ${checked ? "bg-primary/10 border-primary text-primary" : "border-border hover-elevate"}`}>
                <Checkbox checked={checked} onCheckedChange={(c) => {
                  const next = c ? [...arr, opt.value] : arr.filter((x) => x !== opt.value);
                  setField(q.id, next);
                }} />
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>
      </div>
    );
  }
  if (q.type === "textarea") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-sm font-medium">{q.label}</Label>
        <Textarea id={id} value={String(v ?? "")} onChange={(e) => setField(q.id, e.target.value)} placeholder={q.placeholder} className="min-h-20" />
      </div>
    );
  }
  if (q.type === "child_list") {
    const list: ChildEntry[] = Array.isArray(v) ? v : [];
    const count = Number(answers.childrenCount) || list.length;
    const ensureLength = (n: number) => {
      const next = [...list];
      while (next.length < n) next.push({});
      while (next.length > n) next.pop();
      return next;
    };
    const setChild = (i: number, patch: Partial<ChildEntry>) => {
      const next = ensureLength(count > 0 ? count : list.length);
      next[i] = { ...next[i], ...patch };
      setField(q.id, next);
    };
    const effectiveCount = Math.max(0, Math.min(15, Number(answers.childrenCount) || list.length));
    return (
      <div className="space-y-3">
        <Label className="text-sm font-medium">{q.label}</Label>
        {q.help && <p className="text-xs text-muted-foreground">{q.help}</p>}
        {effectiveCount === 0 ? (
          <p className="text-xs text-muted-foreground">בחרו מספר ילדים בשדה ‘כמה ילדים?’ כדי לפתוח שדות פרטים.</p>
        ) : (
          <div className="space-y-3">
            {Array.from({ length: effectiveCount }).map((_, i) => {
              const child = list[i] ?? {};
              const showImpairment = child.healthStatus === "mild" || child.healthStatus === "moderate" || child.healthStatus === "severe";
              return (
                <Card key={i} className="p-3 border border-border space-y-3">
                  <div className="text-xs font-semibold text-muted-foreground">ילד/ה #{i + 1}</div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">שם פרטי (לא חובה)</Label>
                      <Input value={child.firstName ?? ""} onChange={(e) => setChild(i, { firstName: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">תאריך לידה</Label>
                      <Input type="date" value={child.birthDate ?? ""} onChange={(e) => setChild(i, { birthDate: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">מצב בריאותי</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {[
                        { v: "normal", l: "תקין לגמרי" },
                        { v: "mild", l: "ליקוי קל" },
                        { v: "moderate", l: "ליקוי בינוני" },
                        { v: "severe", l: "ליקוי קשה" },
                      ].map((opt) => (
                        <button
                          key={opt.v}
                          type="button"
                          onClick={() => setChild(i, { healthStatus: opt.v as ChildEntry["healthStatus"] })}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium border ${
                            child.healthStatus === opt.v
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card hover-elevate border-border text-foreground/80"
                          }`}
                        >
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  </div>
                  {showImpairment && (
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">סוג הליקוי</Label>
                        <select
                          value={child.impairmentType ?? ""}
                          onChange={(e) => setChild(i, { impairmentType: e.target.value as ChildEntry["impairmentType"] })}
                          aria-label="סוג הליקוי"
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="">— בחרו —</option>
                          <option value="physical">גופני</option>
                          <option value="mental">נפשי</option>
                          <option value="developmental">התפתחותי</option>
                          <option value="other">אחר</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs">פרטים נוספים</Label>
                        <Input value={child.notes ?? ""} onChange={(e) => setChild(i, { notes: e.target.value })} placeholder="פירוט קצר" />
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }
  return null;
}

function CategoryBadge({ children, tone }: { children: React.ReactNode; tone: "high" | "mid" | "low" }) {
  const cls =
    tone === "high"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800"
      : tone === "mid"
      ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800"
      : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/40 dark:text-slate-200 dark:border-slate-700";
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${cls}`}>{children}</span>;
}

function potentialTone(level: SuggestionHit["potential"]): "high" | "mid" | "low" {
  if (level === "גבוה") return "high";
  if (level === "בינוני") return "mid";
  return "low";
}

export default function PublicPotential() {
  const { toast } = useToast();
  const [matchSlug, params] = useRoute<{ slug: string }>("/potential/:slug");
  const slug = matchSlug ? params.slug : undefined;

  const [config, setConfig] = useState<ConfigPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<SuggestionHit[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [contactConsent, setContactConsent] = useState<"" | "yes" | "no">("");
  const [contact, setContact] = useState({ fullName: "", phone: "", email: "", idNumber: "" });
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const url = slug ? `/api/public/potential/link/${encodeURIComponent(slug)}` : "/api/public/potential/config";
    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json() as Promise<ConfigPayload>;
      })
      .then((data) => {
        if (cancelled) return;
        setConfig(data);
        if (data.link?.presets && typeof data.link.presets === "object") {
          setAnswers((prev) => ({ ...prev, ...(data.link!.presets as Answers) }));
        }
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "שגיאה");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [slug]);

  const sections = useMemo(() => {
    if (!config) return [];
    const hidden = new Set(config.link?.hiddenSections ?? []);
    return config.sections.filter((s) => !hidden.has(s.id));
  }, [config]);

  const setField = (id: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <div className="max-w-3xl mx-auto px-4 py-10 space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }
  if (error || !config) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <Card className="p-6 text-center max-w-md">
          <h2 className="text-lg font-bold mb-2">לא ניתן לטעון את השאלון</h2>
          <p className="text-sm text-muted-foreground">{error || "ייתכן שהקישור אינו פעיל. נסו דרך עמוד הזכאות הראשי."}</p>
          <Link href="/eligibility">
            <Button variant="outline" className="mt-4">חזרה לזכויות</Button>
          </Link>
        </Card>
      </div>
    );
  }
  if (!config.enabled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <Card className="p-6 text-center max-w-md">
          <h2 className="text-lg font-bold mb-2">סורק הפוטנציאל אינו פעיל כעת</h2>
          <p className="text-sm text-muted-foreground">חזרו בקרוב. בינתיים, ניתן לעיין בקטלוג הזכויות והטבות.</p>
          <Link href="/eligibility">
            <Button variant="outline" className="mt-4">לקטלוג הזכויות</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const visibleSection = sections[activeSectionIdx];
  const isLastSection = activeSectionIdx >= sections.length - 1;

  async function submitProfile() {
    setSubmitting(true);
    try {
      const r = await fetch(`${API_BASE}/api/public/potential/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: answers,
          slug: config?.link?.slug ?? null,
          contactConsent: false,
          contact: {},
          selectedIds: [],
          legalAccepted: {},
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.message || "submit failed");
      setResults(Array.isArray(data.suggestions) ? data.suggestions : []);
    } catch (err) {
      toast({ title: "שגיאה", description: err instanceof Error ? err.message : "שליחה נכשלה", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  async function submitWithContact() {
    if (!termsAccepted) {
      toast({ title: "נדרש אישור תנאים", description: "יש לאשר את תנאי השימוש לפני העברת פרטים.", variant: "destructive" });
      return;
    }
    if (!contact.fullName.trim()) {
      toast({ title: "שם חובה", description: "אנא מלאו שם מלא.", variant: "destructive" });
      return;
    }
    if (!contact.phone.trim() && !contact.email.trim()) {
      toast({ title: "פרטי קשר חובה", description: "אנא מלאו טלפון או מייל.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch(`${API_BASE}/api/public/potential/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: answers,
          slug: config?.link?.slug ?? null,
          contactConsent: true,
          contact,
          selectedIds: Array.from(selected),
          legalAccepted: { terms: "1.0" },
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.message || "submit failed");
      setContactSubmitted(true);
      toast({ title: "הפנייה התקבלה", description: "צוות בקלות מטפלים בפנייתכם בהקדם." });
    } catch (err) {
      toast({ title: "שגיאה", description: err instanceof Error ? err.message : "שליחה נכשלה", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" dir="rtl">
      <header className="border-b border-border bg-sidebar text-sidebar-foreground">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center -mr-2 px-2 py-1">
            <Logo size={28} showWordmark={false} />
            <span className="font-bold text-base mr-2">בקלות</span>
          </Link>
          <Link href="/eligibility" className="inline-flex items-center gap-1 text-[13px] hover-elevate rounded-md px-2 py-1">
            <ArrowRight className="w-4 h-4" />
            לקטלוג הזכויות
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="bg-gradient-to-b from-primary/10 via-primary/5 to-background border-b border-border">
          <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-10 md:py-14 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>בדיקה לפי פרופיל אישי</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight tracking-tight">
              {config.link?.title || config.introTitle}
            </h1>
            <p className="text-base md:text-lg text-muted-foreground mt-4 max-w-2xl mx-auto leading-relaxed">
              {config.link?.description || config.introSubtitle}
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              שלב ראשון: <span className="font-semibold">ללא שם, טלפון או תעודת זהות</span>. רק פרופיל כללי.
            </p>
          </div>
        </section>

        <section className="max-w-[900px] mx-auto px-4 sm:px-6 py-8 md:py-12">
          {!results ? (
            <>
              <div className="flex items-center justify-between mb-5">
                <div className="text-sm text-muted-foreground">
                  שלב {Math.min(activeSectionIdx + 1, sections.length)} מתוך {sections.length}
                </div>
                <div className="flex gap-1">
                  {sections.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-8 rounded-full ${i <= activeSectionIdx ? "bg-primary" : "bg-muted"}`}
                    />
                  ))}
                </div>
              </div>

              <Card className="p-5 md:p-7 space-y-5 rounded-2xl">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold">{visibleSection?.title}</h2>
                  {visibleSection?.description && (
                    <p className="text-sm text-muted-foreground mt-1">{visibleSection.description}</p>
                  )}
                </div>

                <div className="space-y-5">
                  {visibleSection?.questions.filter((q) => shouldShow(q, answers)).map((q) => (
                    <QuestionField key={q.id} q={q} answers={answers} setField={setField} />
                  ))}
                </div>

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
                  <Button
                    variant="ghost"
                    type="button"
                    disabled={activeSectionIdx === 0}
                    onClick={() => setActiveSectionIdx((i) => Math.max(0, i - 1))}
                  >
                    <ChevronUp className="w-4 h-4 ml-1" />
                    הקודם
                  </Button>
                  {isLastSection ? (
                    <Button
                      type="button"
                      onClick={submitProfile}
                      disabled={submitting}
                      data-testid="button-potential-finish"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Sparkles className="w-4 h-4 ml-2" />}
                      קבלת הצעות זכויות
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => setActiveSectionIdx((i) => Math.min(sections.length - 1, i + 1))}
                    >
                      הבא
                      <ChevronDown className="w-4 h-4 mr-1" />
                    </Button>
                  )}
                </div>
              </Card>

              <p className="text-xs text-muted-foreground mt-4 text-center">
                בכל שלב ניתן לדלג על שאלות שאינן רלוונטיות. ככל שתענו יותר, ההצעות יהיו מדויקות יותר.
              </p>
            </>
          ) : contactSubmitted ? (
            <Card className="p-6 md:p-8 rounded-2xl text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold">הפנייה התקבלה</h2>
              <p className="text-muted-foreground">
                צוות בקלות מטפלים בפנייתכם בהקדם לבדיקה אישית מעמיקה.
              </p>
              <p className="text-sm text-muted-foreground">
                בינתיים, מוזמנים לעיין בנושאים שמצאנו עבורכם. ניתן ללחוץ על כל נושא לפרטים נוספים.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-right">
                {results.map((s) => (
                  <Link key={s.rightId} href={`/p/topic/${s.rightId}`}>
                    <Card className="p-3 hover-elevate cursor-pointer">
                      <div className="text-xs text-primary font-semibold">{s.category}</div>
                      <div className="text-sm font-semibold mt-1">{s.topic}</div>
                    </Card>
                  </Link>
                ))}
              </div>
              <div className="pt-4">
                <Link href="/eligibility">
                  <Button variant="outline">לקטלוג הזכויות המלא</Button>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl md:text-3xl font-bold">הצעות לבדיקה לפי הפרופיל שלכם</h2>
                <button
                  type="button"
                  onClick={() => { setResults(null); setActiveSectionIdx(0); }}
                  className="text-sm text-muted-foreground underline hover-elevate rounded px-2 py-1"
                >
                  עריכת התשובות
                </button>
              </div>

              {results.length === 0 ? (
                <Card className="p-6 text-center text-sm text-muted-foreground">
                  לפי הפרופיל לא הצלחנו לזהות פוטנציאל ברור. מוזמנים לעיין בקטלוג או לפנות אלינו.
                </Card>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    זוהו {results.length} נושאים שכדאי לבדוק. סמנו את הנושאים שתרצו לקדם — נצרף אותם לפנייה אם תבחרו בכך.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {results.map((s) => {
                      const isSelected = selected.has(s.rightId);
                      const tone = potentialTone(s.potential);
                      return (
                        <Card key={s.rightId} className={`p-4 rounded-xl border ${isSelected ? "border-primary shadow-md" : "border-border"}`}>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <span className="text-[11px] font-semibold text-primary uppercase">{s.category}</span>
                              <h3 className="text-base md:text-lg font-semibold leading-snug mt-0.5">{s.topic}</h3>
                            </div>
                            <CategoryBadge tone={tone}>פוטנציאל {s.potential}</CategoryBadge>
                          </div>
                          {s.publicSiteText && (
                            <p className="text-xs text-muted-foreground line-clamp-3 mb-3 leading-relaxed">
                              {s.publicSiteText.slice(0, 240)}
                            </p>
                          )}
                          {s.reasons.length > 0 && (
                            <ul className="text-xs text-muted-foreground space-y-1 mb-3 list-disc pr-4">
                              {s.reasons.slice(0, 3).map((reason, i) => (
                                <li key={i}>{reason}</li>
                              ))}
                            </ul>
                          )}
                          <div className="flex items-center justify-between pt-2 border-t border-border">
                            <label className="flex items-center gap-2 text-xs cursor-pointer">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(c) => {
                                  setSelected((prev) => {
                                    const next = new Set(prev);
                                    if (c) next.add(s.rightId); else next.delete(s.rightId);
                                    return next;
                                  });
                                }}
                              />
                              <span>סמנו לקידום</span>
                            </label>
                            <Link href={`/p/topic/${s.rightId}`}>
                              <button type="button" className="text-xs text-primary font-semibold inline-flex items-center gap-1 hover-elevate rounded px-2 py-1">
                                לפרטים <ExternalLink className="w-3 h-3" />
                              </button>
                            </Link>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}

              <Card className="p-5 md:p-6 rounded-2xl border-2 border-primary/30 bg-primary/5">
                <h3 className="text-lg font-semibold">{config.consentText}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  הפרטים יישמרו מאובטחים וישמשו רק את צוות בקלות לבדיקה אישית עבורכם. ניתן להמשיך בלי להעביר פרטים — ההצעות יישארו זמינות.
                </p>
                <div className="flex items-center gap-2 mt-4">
                  <Button
                    type="button"
                    variant={contactConsent === "yes" ? "default" : "outline"}
                    onClick={() => setContactConsent("yes")}
                    data-testid="button-consent-yes"
                  >
                    כן, אשמח להעביר פרטים
                  </Button>
                  <Button
                    type="button"
                    variant={contactConsent === "no" ? "secondary" : "outline"}
                    onClick={() => setContactConsent("no")}
                    data-testid="button-consent-no"
                  >
                    לא תודה, רק לראות הצעות
                  </Button>
                </div>

                {contactConsent === "yes" && (
                  <div className="mt-5 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">שם מלא</Label>
                        <Input value={contact.fullName} onChange={(e) => setContact((c) => ({ ...c, fullName: e.target.value }))} data-testid="input-potential-name" autoComplete="name" />
                      </div>
                      <div>
                        <Label className="text-xs">טלפון</Label>
                        <Input type="tel" inputMode="tel" maxLength={10} value={contact.phone} onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))} data-testid="input-potential-phone" autoComplete="tel" />
                      </div>
                      <div>
                        <Label className="text-xs">מייל</Label>
                        <Input type="email" value={contact.email} onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))} data-testid="input-potential-email" autoComplete="email" />
                      </div>
                      <div>
                        <Label className="text-xs">תעודת זהות (אופציונלי)</Label>
                        <Input inputMode="numeric" maxLength={9} value={contact.idNumber} onChange={(e) => setContact((c) => ({ ...c, idNumber: e.target.value }))} />
                      </div>
                    </div>
                    <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                      <Checkbox checked={termsAccepted} onCheckedChange={(c) => setTermsAccepted(Boolean(c))} />
                      <span>
                        אני מאשר/ת את <Link href="/terms" className="text-primary underline">תנאי השימוש</Link> ושצוות בקלות יוכל ליצור עמי קשר בנושאים שסומנו.
                      </span>
                    </label>
                    <div className="flex justify-end">
                      <Button type="button" onClick={submitWithContact} disabled={submitting} data-testid="button-potential-submit-contact">
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                        שליחה לצוות בקלות
                      </Button>
                    </div>
                  </div>
                )}

                {contactConsent === "no" && (
                  <div className="mt-4 text-sm text-muted-foreground space-y-2">
                    <p>אין בעיה. ניתן לעיין בנושאים, ולפנות אלינו ידנית בכל עת.</p>
                    <p>טלפון: <span dir="ltr">{CONTACT_PHONE}</span> · מייל: {CONTACT_EMAIL}</p>
                  </div>
                )}
              </Card>

              <div className="text-center pt-2">
                <Link href="/eligibility">
                  <Button variant="ghost">חזרה לקטלוג הזכויות</Button>
                </Link>
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-6 text-center text-xs text-muted-foreground">
          ארגון בקלות · {CONTACT_PHONE} · {CONTACT_EMAIL}
          <div className="opacity-70 mt-1">המידע באתר ראשוני בלבד — אינו תחליף לבדיקה משפטית/מקצועית מלאה.</div>
        </div>
      </footer>
    </div>
  );
}
