// ═══════════════════════════════════════════════════════════════════════════
// מנוע הבריף החכם — שאלון קצר שמבין את הקונספט לפני יצירת המודעה.
// שלב 1: שאלון (קטגוריה, קהל, אווירה, מסר, צבעים, רפרנסים/מודעות שאהבת).
// שלב 2: הבנת-רעיון + 3-4 קונספטים מנוסחים (Claude) עם תצוגה חיה.
// בחירה → render מלא → פתיחה בעורך.
// ═══════════════════════════════════════════════════════════════════════════
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Crown, Home as HomeIcon, Loader2, Sparkles, ArrowLeft, ArrowRight, Lightbulb, Palette,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import CanvasStage from "@/components/CanvasStage";
import { getStyle } from "@shared/styles";
import { useTemplateContext } from "@/lib/templateContext";
import { useToast } from "@/hooks/use-toast";
import type { TemplateDoc } from "@shared/layers";

interface Meta {
  moods: string[];
  audiences: { key: string; label: string; moodBias?: string[] }[];
  knowledge: { key: string; label: string; group: string; defaultStyle?: string }[];
  groups: { key: string; label: string }[];
  categoryTemplateKeys: string[];
}
interface CatTemplate {
  key: string;
  name: string;
  note: string;
  locked?: boolean;
}
interface CatTemplateSet {
  categoryKey: string;
  label: string;
  intro: string;
  templates: CatTemplate[];
}
interface Concept {
  presetKey?: string;
  preset?: { key: string; name: string; studio: string; mood: string[] };
  title?: string;
  angle?: string;
  why?: string;
  palette?: string;
  copyHint?: string;
  score?: number;
}
interface ConceptResp {
  understanding: string;
  concepts: Concept[];
  source: string;
}

const COLOR_PRESETS = [
  { label: "נייבי וזהב", val: "כחול נייבי כהה עם זהב" },
  { label: "בורדו וזהב", val: "בורדו עמוק עם זהב עתיק" },
  { label: "שחור וזהב", val: "שחור עם זהב" },
  { label: "טורקיז ואלמוג", val: "טורקיז עם אלמוג חם" },
  { label: "שמנת ואפור", val: "שמנת עם אפור פחם" },
  { label: "ירוק ואדמה", val: "ירוק זית עם גווני אדמה" },
];

export default function Brief() {
  const [, navigate] = useLocation();
  const { setSelected } = useTemplateContext();
  const { toast } = useToast();
  const { data: meta } = useQuery<Meta>({ queryKey: ["/api/meta"] });

  const [step, setStep] = useState<1 | 2>(1);
  const [category, setCategory] = useState("");
  const [audience, setAudience] = useState("");
  const [mood, setMood] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [colorPref, setColorPref] = useState("");
  const [refNotes, setRefNotes] = useState("");

  const [loadingConcepts, setLoadingConcepts] = useState(false);
  const [resp, setResp] = useState<ConceptResp | null>(null);
  const [openingKey, setOpeningKey] = useState<string | null>(null);

  const categories = useMemo(() => meta?.knowledge ?? [], [meta]);
  const hasCatalog = useMemo(
    () => !!category && (meta?.categoryTemplateKeys ?? []).includes(category),
    [category, meta],
  );

  // תבניות מובנות-נכון ("כמו שמקובל") לקטגוריה הנבחרת
  const { data: catSet } = useQuery<CatTemplateSet>({
    queryKey: ["/api/categories", category, "templates"],
    enabled: hasCatalog,
    staleTime: Infinity,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/categories/${encodeURIComponent(category)}/templates`);
      return res.json();
    },
  });

  async function openCatTemplate(t: CatTemplate) {
    setOpeningKey(`cat_${t.key}`);
    try {
      const res = await apiRequest("POST", `/api/categories/${encodeURIComponent(category)}/templates/${encodeURIComponent(t.key)}/render`, {
        width: 1080, height: 1350, withPhoto: false,
      });
      const { doc } = (await res.json()) as { doc: TemplateDoc };
      setSelected({ doc, category, style: "custom", format: "square", name: t.name });
      navigate("/editor");
    } catch (e) {
      toast({ title: "שגיאה בפתיחת התבנית", description: String(e), variant: "destructive" });
    } finally {
      setOpeningKey(null);
    }
  }

  function toggleMood(m: string) {
    setMood((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  const canSubmit = category || message || mood.length > 0;

  async function submitBrief() {
    if (!canSubmit) {
      toast({ title: "נדרש מעט מידע", description: "בחר קטגוריה, כתוב מסר או סמן אווירה", variant: "destructive" });
      return;
    }
    setLoadingConcepts(true);
    setStep(2);
    try {
      const res = await apiRequest("POST", "/api/brief/concepts", {
        category, audience, mood, message, colorPref, refNotes,
      });
      setResp(await res.json());
    } catch (e) {
      toast({ title: "שגיאה בהבנת הבריף", description: String(e), variant: "destructive" });
    } finally {
      setLoadingConcepts(false);
    }
  }

  async function openConcept(c: Concept) {
    const key = c.presetKey || c.preset?.key;
    if (!key) return;
    setOpeningKey(key);
    try {
      const res = await apiRequest("POST", `/api/presets/${encodeURIComponent(key)}/render`, {
        width: 1080, height: 1350, withPhoto: false,
      });
      const { doc } = (await res.json()) as { doc: TemplateDoc };
      setSelected({
        doc,
        category: category || "shiur_gemara",
        style: "custom",
        format: "square",
        name: c.title || c.preset?.name || "מודעה",
      });
      navigate("/editor");
    } catch (e) {
      toast({ title: "שגיאה בפתיחת הקונספט", description: String(e), variant: "destructive" });
    } finally {
      setOpeningKey(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#F5EEDD]" dir="rtl">
      <div
        className="pointer-events-none fixed inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(circle at 20% 0%, rgba(201,162,39,0.12), transparent 45%), radial-gradient(circle at 85% 20%, rgba(201,162,39,0.08), transparent 40%)",
        }}
      />
      <header className="relative z-10 border-b border-[#C9A227]/20 bg-[#0B1220]/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <Crown className="h-6 w-6 text-[#C9A227]" />
            <h1 className="text-xl font-bold tracking-wide">
              בריף חכם <span className="text-[#C9A227]">·</span> הבנת הרעיון
            </h1>
          </div>
          <Button
            variant="outline" size="sm"
            className="gap-2 border-[#C9A227]/40 text-[#C9A227] hover:bg-[#C9A227] hover:text-[#0B1220]"
            onClick={() => navigate("/")} data-testid="link-home"
          >
            <HomeIcon className="h-4 w-4" /> דף הבית
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-6 pb-24 pt-10">
        {/* מחוון שלבים */}
        <div className="mb-10 flex items-center justify-center gap-3 text-sm">
          <StepDot n={1} label="שאלון קצר" active={step === 1} done={step > 1} />
          <div className="h-px w-12 bg-[#C9A227]/30" />
          <StepDot n={2} label="קונספטים" active={step === 2} done={false} />
        </div>

        {step === 1 && (
          <div className="mx-auto max-w-3xl space-y-8">
            <p className="text-center text-sm text-[#F5EEDD]/70">
              כמה שאלות קצרות כדי שנבין בדיוק את הקונספט — ונציע לך כיווני עיצוב מדויקים
            </p>

            {/* קטגוריה */}
            <Field label="מה מפרסמים?">
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setCategory(c.key)}
                    data-testid={`select-category-${c.key}`}
                    title={c.defaultStyle ? `סגנון מומלץ: ${getStyle(c.defaultStyle).label}` : undefined}
                    className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                      category === c.key
                        ? "border-[#C9A227] bg-[#C9A227] text-[#0B1220]"
                        : "border-[#C9A227]/25 text-[#F5EEDD]/80 hover:border-[#C9A227]/60"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </Field>

            {/* תבניות מובנות-נכון לסוג הנבחר ("כמו שמקובל") — דוגמאות + לחיצה לאישור */}
            {hasCatalog && catSet && (
              <Card className="border-[#C9A227]/30 bg-[#101B32]">
                <CardContent className="p-5">
                  <div className="mb-1 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#C9A227]" />
                    <h3 className="text-sm font-bold text-[#C9A227]">תבניות מוכנות לסוג זה — בנויות כמו שמקובל</h3>
                  </div>
                  <p className="mb-4 text-xs leading-relaxed text-[#F5EEDD]/70" data-testid="text-catalog-intro">
                    {catSet.intro}
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {catSet.templates.map((t) => (
                      <CatTemplateCard
                        key={t.key}
                        categoryKey={category}
                        tpl={t}
                        loading={openingKey === `cat_${t.key}`}
                        onOpen={() => openCatTemplate(t)}
                      />
                    ))}
                  </div>
                  <p className="mt-3 text-center text-[11px] text-[#F5EEDD]/40">
                    לחץ על תבנית כדי לפתוח אותה בעורך — או המשך לשאלון למטה לקבלת כיוונים מותאים אישית.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* קהל יעד */}
            <Field label="למי מיועדת המודעה?">
              <div className="flex flex-wrap gap-2">
                {(meta?.audiences ?? []).map((a) => (
                  <button
                    key={a.key}
                    onClick={() => setAudience(audience === a.key ? "" : a.key)}
                    data-testid={`select-audience-${a.key}`}
                    title={a.moodBias?.length ? `אווירה מוטה: ${a.moodBias.join(", ")}` : undefined}
                    className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                      audience === a.key
                        ? "border-[#C9A227] bg-[#C9A227] text-[#0B1220]"
                        : "border-[#C9A227]/25 text-[#F5EEDD]/80 hover:border-[#C9A227]/60"
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </Field>

            {/* אווירה */}
            <Field label="איזו אווירה? (אפשר כמה)">
              <div className="flex flex-wrap gap-1.5">
                {(meta?.moods ?? []).map((m) => (
                  <button
                    key={m}
                    onClick={() => toggleMood(m)}
                    data-testid={`select-mood-${m}`}
                    className={`rounded-full px-3 py-1 text-xs transition ${
                      mood.includes(m)
                        ? "bg-[#C9A227] text-[#0B1220]"
                        : "bg-[#101B32] text-[#F5EEDD]/60 hover:text-[#F5EEDD]"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </Field>

            {/* מסר */}
            <Field label="מה הרעיון / המסר המרכזי?">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                data-testid="input-message"
                placeholder="לדוגמה: פתיחת כולל ערב חדש לאברכים, כל יום בין מנחה למעריב, בהיכל הישיבה"
                className="min-h-[90px] border-[#C9A227]/25 bg-[#101B32] text-[#F5EEDD] placeholder:text-[#F5EEDD]/35"
              />
            </Field>

            {/* צבעים */}
            <Field label={<span className="flex items-center gap-2"><Palette className="h-4 w-4 text-[#C9A227]" /> העדפת צבעים</span>}>
              <div className="mb-2 flex flex-wrap gap-2">
                {COLOR_PRESETS.map((cp) => (
                  <button
                    key={cp.label}
                    onClick={() => setColorPref(colorPref === cp.val ? "" : cp.val)}
                    data-testid={`select-color-${cp.label}`}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      colorPref === cp.val
                        ? "border-[#C9A227] bg-[#C9A227]/20 text-[#C9A227]"
                        : "border-[#C9A227]/25 text-[#F5EEDD]/70 hover:border-[#C9A227]/60"
                    }`}
                  >
                    {cp.label}
                  </button>
                ))}
              </div>
              <Input
                value={colorPref}
                onChange={(e) => setColorPref(e.target.value)}
                data-testid="input-color"
                placeholder="או תאר צבעים בחופשי..."
                className="border-[#C9A227]/25 bg-[#101B32] text-[#F5EEDD] placeholder:text-[#F5EEDD]/35"
              />
            </Field>

            {/* רפרנסים / מודעות שאהבת */}
            <Field label="מודעות/סגנונות שאהבת (מודעה חכמה פנימית)">
              <Textarea
                value={refNotes}
                onChange={(e) => setRefNotes(e.target.value)}
                data-testid="input-refs"
                placeholder="תאר מודעות או שפה עיצובית שאהבת — למשל: 'אהבתי מודעות של סטודיו 7 עם טיפוגרפיה גדולה ונקייה', או הדבק טקסט של מודעה מוצלחת"
                className="min-h-[70px] border-[#C9A227]/25 bg-[#101B32] text-[#F5EEDD] placeholder:text-[#F5EEDD]/35"
              />
              <p className="mt-1.5 text-xs text-[#F5EEDD]/40">
                המערכת לומדת את הטעם שלך ומתאימה את הקונספטים בהתאם. העלאת קבצי רפרנס תיפתח בהמשך.
              </p>
            </Field>

            <div className="flex justify-center pt-2">
              <Button
                size="lg"
                disabled={!canSubmit}
                onClick={submitBrief}
                data-testid="button-submit-brief"
                className="gap-2 bg-[#C9A227] px-8 text-[#0B1220] hover:bg-[#d9b43a] disabled:opacity-40"
              >
                <Sparkles className="h-5 w-5" /> הבן את הרעיון והצע קונספטים
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 text-sm text-[#C9A227] hover:underline"
              data-testid="button-back"
            >
              <ArrowRight className="h-4 w-4" /> חזרה לשאלון
            </button>

            {loadingConcepts && (
              <div className="py-20 text-center">
                <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-[#C9A227]" />
                <p className="text-[#F5EEDD]/70">מנתח את הבריף ומגבש כיווני עיצוב מדויקים...</p>
              </div>
            )}

            {!loadingConcepts && resp && (
              <>
                {/* הבנת רעיון */}
                <Card className="border-[#C9A227]/30 bg-[#101B32]">
                  <CardContent className="flex gap-4 p-6">
                    <Lightbulb className="mt-1 h-6 w-6 flex-shrink-0 text-[#C9A227]" />
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <h3 className="text-sm font-bold text-[#C9A227]">הבנת הרעיון</h3>
                        <Badge variant="outline" className="border-[#C9A227]/30 text-[10px] text-[#F5EEDD]/60" data-testid="badge-concept-source">
                          {resp.source === "ai" ? "מנותח ב-AI" : "דירוג מקומי"}
                        </Badge>
                      </div>
                      <p className="text-sm leading-relaxed text-[#F5EEDD]/90" data-testid="text-understanding">
                        {resp.understanding}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <h3 className="text-center text-lg font-bold">
                  {resp.concepts.length} כיווני עיצוב שמתאימים לרעיון שלך
                </h3>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {resp.concepts.map((c, i) => (
                    <ConceptCard
                      key={(c.presetKey || c.preset?.key || "") + i}
                      concept={c}
                      loading={openingKey === (c.presetKey || c.preset?.key)}
                      onOpen={() => openConcept(c)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function StepDot({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm font-bold ${
          active || done
            ? "border-[#C9A227] bg-[#C9A227] text-[#0B1220]"
            : "border-[#C9A227]/30 text-[#F5EEDD]/50"
        }`}
      >
        {n}
      </span>
      <span className={active ? "font-semibold text-[#C9A227]" : "text-[#F5EEDD]/60"}>{label}</span>
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-3 block text-sm font-semibold text-[#F5EEDD]">{label}</Label>
      {children}
    </div>
  );
}

function CatTemplateCard({ categoryKey, tpl, loading, onOpen }: { categoryKey: string; tpl: CatTemplate; loading: boolean; onOpen: () => void }) {
  const { data } = useQuery<{ doc: TemplateDoc }>({
    queryKey: ["/api/categories", categoryKey, "templates", tpl.key, "preview"],
    staleTime: Infinity,
    queryFn: async () => {
      const res = await apiRequest("POST", `/api/categories/${encodeURIComponent(categoryKey)}/templates/${encodeURIComponent(tpl.key)}/render`, {
        width: 1080, height: 1350, withPhoto: false,
      });
      return res.json();
    },
  });
  return (
    <button
      onClick={onOpen}
      data-testid={`card-cattemplate-${tpl.key}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-[#C9A227]/20 bg-[#0B1220] text-right transition hover:border-[#C9A227]/60 hover:shadow-[0_0_24px_rgba(201,162,39,0.15)]"
    >
      <div className="flex aspect-[4/5] items-center justify-center p-3">
        {data?.doc ? (
          <CanvasStage doc={data.doc} interactive={false} maxDisplayWidth={130} />
        ) : (
          <Loader2 className="h-5 w-5 animate-spin text-[#C9A227]/60" />
        )}
      </div>
      <div className="border-t border-[#C9A227]/15 p-2.5">
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-bold text-[#F5EEDD]">{tpl.name}</span>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#C9A227]" />}
        </div>
        <p className="mt-0.5 text-[10px] leading-snug text-[#F5EEDD]/55">{tpl.note}</p>
        {tpl.locked && (
          <span className="mt-1 inline-block rounded bg-[#C9A227]/15 px-1.5 py-0.5 text-[9px] text-[#C9A227]">מבנה קבוע לפי המסורת</span>
        )}
      </div>
    </button>
  );
}

function ConceptCard({ concept, loading, onOpen }: { concept: Concept; loading: boolean; onOpen: () => void }) {
  const key = concept.presetKey || concept.preset?.key;
  const { data } = useQuery<{ doc: TemplateDoc }>({
    queryKey: ["/api/presets", key, "concept-preview"],
    enabled: !!key,
    staleTime: Infinity,
    queryFn: async () => {
      const res = await apiRequest("POST", `/api/presets/${encodeURIComponent(key!)}/render`, {
        width: 1080, height: 1350, withPhoto: false,
      });
      return res.json();
    },
  });

  return (
    <Card
      className="group cursor-pointer overflow-hidden border-[#C9A227]/20 bg-[#101B32] transition hover:border-[#C9A227]/60 hover:shadow-[0_0_30px_rgba(201,162,39,0.15)]"
      onClick={onOpen}
      data-testid={`card-concept-${key}`}
    >
      <div className="flex items-stretch gap-0">
        <div className="flex w-[45%] items-center justify-center bg-[#0B1220] p-4">
          {data?.doc ? (
            <CanvasStage doc={data.doc} interactive={false} maxDisplayWidth={170} />
          ) : (
            <Loader2 className="h-6 w-6 animate-spin text-[#C9A227]/60" />
          )}
        </div>
        <CardContent className="flex-1 p-5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h4 className="text-base font-bold text-[#F5EEDD]">{concept.title}</h4>
            <div className="flex items-center gap-2">
              {typeof concept.score === "number" && concept.score > 0 && (
                <Badge
                  variant="outline"
                  className="border-[#C9A227]/40 text-[10px] text-[#C9A227]/80"
                  data-testid={`badge-concept-score-${key}`}
                >
                  התאמה {Math.min(100, Math.round(concept.score * 10))}%
                </Badge>
              )}
              {loading && <Loader2 className="h-4 w-4 animate-spin text-[#C9A227]" />}
            </div>
          </div>
          {concept.preset && (
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="border-[#C9A227]/40 text-[10px] text-[#C9A227]">
                {concept.preset.studio}
              </Badge>
              {concept.preset.mood.map((m) => (
                <Badge key={m} variant="outline" className="border-[#F5EEDD]/20 text-[10px] text-[#F5EEDD]/60" data-testid={`badge-concept-mood-${key}-${m}`}>
                  {m}
                </Badge>
              ))}
            </div>
          )}
          {concept.angle && <p className="mb-2 text-xs leading-relaxed text-[#F5EEDD]/70">{concept.angle}</p>}
          {concept.why && (
            <p className="mb-2 text-xs leading-relaxed text-[#F5EEDD]/85">
              <span className="font-semibold text-[#C9A227]">למה מתאים: </span>
              {concept.why}
            </p>
          )}
          {concept.palette && (
            <p className="text-[11px] text-[#F5EEDD]/50">
              <span className="text-[#C9A227]/80">צבעוניות: </span>{concept.palette}
            </p>
          )}
          {concept.copyHint && (
            <p className="mt-1 text-[11px] text-[#F5EEDD]/50" data-testid={`text-copyhint-${key}`}>
              <span className="text-[#C9A227]/80">רמז לקופי: </span>{concept.copyHint}
            </p>
          )}
          <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#C9A227] opacity-0 transition group-hover:opacity-100">
            פתח בעורך <ArrowLeft className="h-4 w-4" />
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
