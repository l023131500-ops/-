// ═══════════════════════════════════════════════════════════════════════════
// אשף עימוד חכם — שאלון קצר + שפה חופשית שמבינים את סוג העימוד,
// ממליצים על תבנית ומסמנים אילו פונקציות (תכונות) להפעיל, מציגים דוגמה,
// ובלחיצת אישור יוצרים ספר מוכן לעריכה.
// ═══════════════════════════════════════════════════════════════════════════
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { TemplateThumb } from "@/components/TemplateThumb";
import { useToast } from "@/hooks/use-toast";
import { getTemplate } from "@shared/templates";
import { buildSettings, type FeatureKey } from "@shared/wizard";
import type { Book, BookSettings, LayerKind } from "@shared/schema";
import { Sparkles, Wand2, Loader2, Check } from "lucide-react";

interface FeatureDef { key: FeatureKey; label: string; hint: string; layers?: LayerKind[] }
interface QOption { value: string; label: string }
interface WQuestion { key: string; label: string; options: QOption[] }
interface Meta { features: FeatureDef[]; questions: WQuestion[] }
interface InferResult {
  templateKey: string;
  templateName: string;
  features: FeatureKey[];
  settings: BookSettings;
  reason: string;
  detectedFromText: FeatureKey[];
}

// תוכן-דוגמה לפי תבנית (לתצוגה מקדימה ולזריעת ספר חדש)
const SAMPLE: Record<string, any[]> = {
  regular: [
    { id: "h1", layer: "heading", text: "שער הביטחון", meta: { level: 1 } },
    { id: "o1", layer: "openingWord", text: "אמר" },
    { id: "m1", layer: "main", text: "החכם: כל הבוטח בה' חסד יסובבנו. והנה עיקר הביטחון הוא שידע האדם כי הכל בידי שמים." },
  ],
  daf: [
    { id: "m1", layer: "main", text: "מאימתי קורין את שמע בערבין. משעה שהכהנים נכנסים לאכול בתרומתן עד סוף האשמורה הראשונה." },
    { id: "r1", layer: "rashi", text: "מאימתי קורין — הכהנים שנטמאו וטבלו, אין נכנסין לאכול בתרומה עד שיעריב שמשן." },
    { id: "t1", layer: "tosafot", text: "מאימתי — פירש רש\"י דקאי אזמן קריאת שמע של ערבית." },
  ],
  mikraot: [
    { id: "m1", layer: "main", text: "בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ׃" },
    { id: "r1", layer: "rashi", text: "בראשית — אמר רבי יצחק, לא היה צריך להתחיל את התורה אלא מהחודש הזה לכם." },
    { id: "c1", layer: "commentaryA", text: "אבן עזרא: השמים — הם הרקיע ומה שעליו." },
  ],
  parallel: [
    { id: "a1", layer: "commentaryA", text: "נוסח א׳: יהי רצון מלפניך ה' אלוהינו שתרגילנו בתורתך." },
    { id: "b1", layer: "commentaryB", text: "נוסח ב׳: יהי רצון מלפניך ה' אלוהי אבותינו שתרגילנו בתורתך ובמצוותיך." },
  ],
  poetry: [
    { id: "h1", layer: "heading", text: "פיוט לשבת", meta: { level: 1 } },
    { id: "m1", layer: "main", text: "מנוחה ושמחה אור ליהודים / יום שבתון יום מחמדים" },
  ],
  "two-columns": [
    { id: "h1", layer: "heading", text: "סימן א׳", meta: { level: 1 } },
    { id: "m1", layer: "main", text: "דין קריאת שמע וברכותיה. יש לקרוא קריאת שמע בכוונה ובדקדוק האותיות." },
    { id: "f1", layer: "footnote", text: "עיין משנה ברורה שם.", meta: { marker: "א" } },
  ],
  footnotes: [
    { id: "h1", layer: "heading", text: "פתיחה", meta: { level: 1 } },
    { id: "m1", layer: "main", text: "והנה בעניין זה נחלקו הראשונים, ויש להאריך בביאור הדברים." },
    { id: "f1", layer: "footnote", text: "כן כתב הרמב\"ם בהלכות תשובה.", meta: { marker: "1" } },
  ],
  sidenotes: [
    { id: "h1", layer: "heading", text: "סימן יז׳", meta: { level: 1 } },
    { id: "m1", layer: "main", text: "חייב אדם לברך על הרעה כשם שמברך על הטובה." },
    { id: "s1", layer: "sidenote", text: "ברכות ס:", meta: { ref: "ברכות ס:" } },
  ],
};

// מיפוי מפתח-תבנית v2 → קבוצת דוגמא
function sampleFor(key: string) {
  if (SAMPLE[key]) return SAMPLE[key];
  if (/daf-gemara/.test(key)) return SAMPLE.daf;
  if (/mikraot/.test(key)) return SAMPLE.mikraot;
  if (/parallel/.test(key)) return SAMPLE.parallel;
  if (/(two-col|shulchan|tri-section)/.test(key)) return SAMPLE["two-columns"];
  if (/(footnotes|academic)/.test(key)) return SAMPLE.footnotes;
  if (/sidenotes|lemma/.test(key)) return SAMPLE.sidenotes;
  if (/(shira|piyut|tehillim|siddur|tefila)/.test(key)) return SAMPLE.poetry;
  return SAMPLE.regular;
}

export default function Wizard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: meta } = useQuery<Meta>({ queryKey: ["/api/meta"] });

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [extras, setExtras] = useState<string[]>([]);
  const [freeText, setFreeText] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");

  const [result, setResult] = useState<InferResult | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const questions = meta?.questions ?? [];
  const features = meta?.features ?? [];

  const infer = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/wizard/infer", {
        bookType: answers.bookType,
        size: answers.size,
        layout: answers.layout,
        extras,
        freeText,
      });
      return (await res.json()) as InferResult;
    },
    onSuccess: (r) => {
      setResult(r);
      setChecked(new Set(r.features));
    },
    onError: (e) => toast({ title: "שגיאה בניתוח", description: String(e), variant: "destructive" }),
  });

  // הגדרות מעודכנות לפי הפונקציות שהמשתמש סימן/ביטל בפועל
  const liveSettings = useMemo<BookSettings | null>(() => {
    if (!result) return null;
    return buildSettings(result.templateKey, Array.from(checked) as FeatureKey[], answers.size, answers.layout);
  }, [result, checked, answers.size, answers.layout]);

  const create = useMutation({
    mutationFn: async () => {
      if (!result || !liveSettings) throw new Error("no result");
      const res = await apiRequest("POST", "/api/books", {
        title: title.trim() || "ספר חדש",
        author: author.trim(),
        templateKey: result.templateKey,
        settings: JSON.stringify(liveSettings),
        content: JSON.stringify(sampleFor(result.templateKey)),
      });
      return (await res.json()) as Book;
    },
    onSuccess: (book) => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      navigate(`/editor/${book.id}`);
    },
    onError: () => toast({ title: "שגיאה ביצירת הספר", variant: "destructive" }),
  });

  function toggleFeature(k: string) {
    setChecked((prev) => {
      const n = new Set(prev);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });
  }
  function toggleExtra(v: string) {
    setExtras((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }

  const tpl = result ? getTemplate(result.templateKey) : null;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-5 py-10">
        <div className="mb-2 flex items-center gap-2">
          <Wand2 className="h-6 w-6 text-primary" />
          <h1 className="font-serif text-xl font-bold text-foreground">אשף עימוד חכם</h1>
        </div>
        <p className="mb-8 text-muted-foreground">
          ענה על כמה שאלות או תאר בחופשי מה אתה מעמד — נזהה את סוג העימוד, נמליץ על תבנית ונסמן את הפונקציות המתאימות.
        </p>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* ── צד ימין: שאלון ── */}
          <div className="space-y-7">
            {questions.map((q) => (
              <div key={q.key}>
                <Label className="mb-2.5 block text-sm font-semibold text-foreground">{q.label}</Label>
                <div className="flex flex-wrap gap-2">
                  {q.options.map((o) => {
                    const isMulti = q.key === "extras";
                    const active = isMulti ? extras.includes(o.value) : answers[q.key] === o.value;
                    return (
                      <button
                        key={o.value}
                        data-testid={`wiz-${q.key}-${o.value}`}
                        onClick={() => (isMulti ? toggleExtra(o.value) : setAnswers((a) => ({ ...a, [q.key]: o.value })))}
                        className={`rounded-full border px-3.5 py-1.5 text-sm transition hover-elevate ${
                          active ? "border-primary bg-primary text-primary-foreground" : "border-card-border text-foreground"
                        }`}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* שפה חופשית */}
            <div>
              <Label className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Sparkles className="h-4 w-4 text-primary" /> תאר בחופשי (רשות)
              </Label>
              <Textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                data-testid="wiz-freetext"
                placeholder="לדוגמה: 'גמרא עם רש״י ותוספות בצורת הדף, מספור בגימטריה וכותרת רצה', או 'ספר מוסר עם הערות שוליים ומילת פתיחה מעוטרת'"
                className="min-h-[110px]"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                אפשר לכתוב כל דרישה — המערכת מזהה מונחי עימוד (רש״י, תוספות, מ״מ, ניקוד, גימטריה, טורים ועוד).
              </p>
            </div>

            <Button
              size="lg"
              onClick={() => infer.mutate()}
              disabled={infer.isPending || (!answers.bookType && !freeText.trim())}
              data-testid="wiz-analyze"
              className="w-full gap-2"
            >
              {infer.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
              נתח והמלץ על עימוד
            </Button>
          </div>

          {/* ── צד שמאל: המלצה + פונקציות + דוגמה ── */}
          <div>
            {!result && (
              <div className="flex h-full min-h-[300px] items-center justify-center rounded-xl border border-dashed border-card-border text-center text-sm text-muted-foreground">
                המלצת העימוד תופיע כאן לאחר הניתוח
              </div>
            )}

            {result && tpl && (
              <div className="space-y-5 rounded-xl border border-card-border bg-card p-5">
                <div>
                  <div className="text-xs font-semibold text-primary">המלצה</div>
                  <div className="mt-0.5 font-serif text-lg font-bold text-foreground" data-testid="wiz-result-name">
                    {result.templateName}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground" data-testid="wiz-result-reason">{result.reason}</p>
                </div>

                {/* דוגמת התבנית */}
                <div className="rounded-lg border border-border bg-[#f3ede0] p-4">
                  <TemplateThumb kind={tpl.kind} tkey={tpl.key} />
                </div>

                {/* סימון פונקציות */}
                <div>
                  <div className="mb-2 text-sm font-semibold text-foreground">פונקציות עימוד — סמן מה להפעיל</div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {features.map((f) => (
                      <label
                        key={f.key}
                        className="flex cursor-pointer items-start gap-2 rounded-lg border border-card-border p-2.5 hover-elevate"
                        data-testid={`wiz-feature-${f.key}`}
                      >
                        <Checkbox checked={checked.has(f.key)} onCheckedChange={() => toggleFeature(f.key)} className="mt-0.5" />
                        <span>
                          <span className="block text-sm font-medium text-foreground">{f.label}</span>
                          <span className="block text-[11px] leading-snug text-muted-foreground">{f.hint}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* שם + יצירה */}
                <div className="space-y-2 border-t border-border pt-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">שם הספר</Label>
                      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="קונטרס הביטחון" data-testid="wiz-title" />
                    </div>
                    <div>
                      <Label className="text-xs">מחבר (רשות)</Label>
                      <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="שם המחבר" data-testid="wiz-author" />
                    </div>
                  </div>
                  <Button
                    onClick={() => create.mutate()}
                    disabled={create.isPending}
                    data-testid="wiz-create"
                    className="w-full gap-2"
                  >
                    {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    אשר וצור ספר לעריכה
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
