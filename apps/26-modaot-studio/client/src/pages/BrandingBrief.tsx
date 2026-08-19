// בריף מותג — אשף רב-שלבי (קטגוריה בכל מסך). תומך במצב "ליבה" (12) או "מלא" (35).
// בסיום שולח ל-/api/branding/strategy, יוצר מותג, ומנווט לעמוד ה-kit.
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  ScrollText, ArrowLeft, ArrowRight, Check, Loader2, Sparkles, X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  BRIEF_CATEGORIES, VISUAL_STYLE_TO_ARCHETYPE, type BriefQuestion,
} from "@shared/branding";

type Answers = Record<string, string | string[]>;

export default function BrandingBrief() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [coreOnly, setCoreOnly] = useState(true);
  const [brandName, setBrandName] = useState("");
  const [answers, setAnswers] = useState<Answers>({});
  const [step, setStep] = useState(0); // 0 = שם מותג, 1..N = קטגוריות
  const [busy, setBusy] = useState(false);

  // קטגוריות מסוננות לפי מצב (ליבה/מלא). קטגוריה ללא שאלות רלוונטיות מושמטת.
  const cats = useMemo(() => {
    return BRIEF_CATEGORIES
      .map((c) => ({ ...c, questions: coreOnly ? c.questions.filter((q) => q.core) : c.questions }))
      .filter((c) => c.questions.length > 0);
  }, [coreOnly]);

  const totalSteps = cats.length + 1; // +1 עבור מסך שם המותג
  const progress = Math.round((step / totalSteps) * 100);

  function setAns(id: string, v: string | string[]) {
    setAnswers((p) => ({ ...p, [id]: v }));
  }

  function toggleMulti(id: string, opt: string) {
    setAnswers((p) => {
      const cur = Array.isArray(p[id]) ? (p[id] as string[]) : [];
      return { ...p, [id]: cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt] };
    });
  }

  async function submit() {
    setBusy(true);
    try {
      const visualStyle = answers["visualStyle"] as string | undefined;
      const preferredArchetype = visualStyle ? VISUAL_STYLE_TO_ARCHETYPE[visualStyle] : undefined;
      const result = await apiRequest("POST", "/api/branding/strategy", {
        brandName, brief: answers, preferredArchetype,
      }).then((r) => r.json());

      // שמירת מותג עם הבריף וה-kit הראשוני
      const kit = {
        brandName,
        strategy: result.strategy,
        colors: result.colors,
        typography: result.typography,
      };
      const brand = await apiRequest("POST", "/api/brands", {
        brandName,
        briefJson: JSON.stringify(answers),
        kitJson: JSON.stringify(kit),
      }).then((r) => r.json());

      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      if (result.source === "local") {
        toast({ title: "נוצר תוצר בסיסי", description: "מנוע ה-AI לא היה זמין — נבנתה אסטרטגיה מהארכיטיפ. ניתן להמשיך.", });
      } else {
        toast({ title: "האסטרטגיה נוצרה", description: "עוברים לערכת המותג" });
      }
      navigate(`/branding/${brand.id}`);
    } catch (e: any) {
      toast({ title: "שגיאה", description: String(e?.message || e).slice(0, 160), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  const onNameStep = step === 0;
  const currentCat = onNameStep ? null : cats[step - 1];
  const canProceed = onNameStep ? brandName.trim().length > 0 : true;

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#F5EEDD]" dir="rtl">
      <div className="pointer-events-none fixed inset-0 opacity-40" style={{ background: "radial-gradient(circle at 20% 0%, rgba(201,162,39,0.12), transparent 45%)" }} />
      <header className="relative z-10 border-b border-[#C9A227]/20 bg-[#0B1220]/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <ScrollText className="h-6 w-6 text-[#C9A227]" />
            <h1 className="text-xl font-bold">בריף מותג</h1>
          </div>
          <button className="text-[#F5EEDD]/50 hover:text-[#F5EEDD]" onClick={() => navigate("/branding")} data-testid="button-close">
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-6 pb-24 pt-10">
        {/* פס התקדמות */}
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-xs text-[#F5EEDD]/60">
            <span>שלב {step + 1} מתוך {totalSteps}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#101B32]">
            <div className="h-full bg-[#C9A227] transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {onNameStep ? (
          <Card className="border-[#C9A227]/20 bg-[#101B32]">
            <CardContent className="p-8">
              <h2 className="mb-2 text-xl font-bold">מה שם המותג?</h2>
              <p className="mb-6 text-sm text-[#F5EEDD]/70">השם המדויק שיופיע בלוגו ובחומרי המיתוג (בעברית)</p>
              <Input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="לדוגמה: מאור התורה"
                className="mb-8 border-[#C9A227]/30 bg-[#0B1220] text-lg text-[#F5EEDD]"
                dir="rtl"
                data-testid="input-brand-name"
              />
              <div className="rounded-lg border border-[#C9A227]/20 bg-[#0B1220] p-4">
                <Label className="mb-3 block text-sm font-bold text-[#C9A227]">עומק הבריף</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    className={`rounded-lg border p-4 text-right transition ${coreOnly ? "border-[#C9A227] bg-[#C9A227]/10" : "border-[#C9A227]/20 hover:border-[#C9A227]/50"}`}
                    onClick={() => setCoreOnly(true)}
                    data-testid="button-core-mode"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      {coreOnly && <Check className="h-4 w-4 text-[#C9A227]" />}
                      <span className="text-sm font-bold">מהיר · 12 שאלות ליבה</span>
                    </div>
                    <p className="text-xs text-[#F5EEDD]/60">מספיק לתוצר איכותי במהירות</p>
                  </button>
                  <button
                    className={`rounded-lg border p-4 text-right transition ${!coreOnly ? "border-[#C9A227] bg-[#C9A227]/10" : "border-[#C9A227]/20 hover:border-[#C9A227]/50"}`}
                    onClick={() => setCoreOnly(false)}
                    data-testid="button-full-mode"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      {!coreOnly && <Check className="h-4 w-4 text-[#C9A227]" />}
                      <span className="text-sm font-bold">מלא · 35 שאלות</span>
                    </div>
                    <p className="text-xs text-[#F5EEDD]/60">העמקה מרבית — התוצר המדויק ביותר</p>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-[#C9A227]/20 bg-[#101B32]">
            <CardContent className="p-8">
              <div className="mb-6 flex items-center gap-2">
                <Badge variant="outline" className="border-[#C9A227]/40 text-[#C9A227]">{currentCat!.name}</Badge>
              </div>
              <div className="space-y-6">
                {currentCat!.questions.map((q) => (
                  <QuestionField key={q.id} q={q} value={answers[q.id]} onText={(v) => setAns(q.id, v)} onToggle={(opt) => toggleMulti(q.id, opt)} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ניווט */}
        <div className="mt-8 flex items-center justify-between">
          <Button
            variant="ghost"
            className="gap-2 text-[#F5EEDD]/70 hover:text-[#F5EEDD] disabled:opacity-30"
            disabled={step === 0 || busy}
            onClick={() => setStep((s) => s - 1)}
            data-testid="button-back"
          >
            <ArrowRight className="h-4 w-4" /> חזרה
          </Button>

          {step < totalSteps - 1 ? (
            <Button
              className="gap-2 bg-[#C9A227] text-[#0B1220] hover:bg-[#DDB63A] disabled:opacity-40"
              disabled={!canProceed || busy}
              onClick={() => setStep((s) => s + 1)}
              data-testid="button-next"
            >
              המשך <ArrowLeft className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              className="gap-2 bg-[#C9A227] text-[#0B1220] hover:bg-[#DDB63A] disabled:opacity-40"
              disabled={busy || !brandName.trim()}
              onClick={submit}
              data-testid="button-submit-brief"
            >
              {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> בונה אסטרטגיה…</> : <><Sparkles className="h-4 w-4" /> צור אסטרטגיית מותג</>}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

function QuestionField({ q, value, onText, onToggle }: {
  q: BriefQuestion;
  value: string | string[] | undefined;
  onText: (v: string) => void;
  onToggle: (opt: string) => void;
}) {
  return (
    <div>
      <Label className="mb-2 block text-sm font-bold text-[#F5EEDD]">
        {q.q}
        {q.core && <span className="mr-2 text-[10px] font-normal text-[#C9A227]">· ליבה</span>}
      </Label>

      {q.type === "textarea" && (
        <Textarea
          value={(value as string) || ""}
          onChange={(e) => onText(e.target.value)}
          placeholder={q.placeholder}
          className="min-h-[90px] border-[#C9A227]/30 bg-[#0B1220] text-[#F5EEDD]"
          dir="rtl"
          data-testid={`input-${q.id}`}
        />
      )}

      {(q.type === "text" || q.type === "keywords") && (
        <Input
          value={(value as string) || ""}
          onChange={(e) => onText(e.target.value)}
          placeholder={q.placeholder}
          className="border-[#C9A227]/30 bg-[#0B1220] text-[#F5EEDD]"
          dir="rtl"
          data-testid={`input-${q.id}`}
        />
      )}

      {q.type === "select" && (
        <Select value={(value as string) || ""} onValueChange={onText}>
          <SelectTrigger className="border-[#C9A227]/30 bg-[#0B1220] text-[#F5EEDD]" dir="rtl" data-testid={`select-${q.id}`}>
            <SelectValue placeholder="בחר…" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            {(q.options || []).map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {q.type === "multi" && (
        <div className="flex flex-wrap gap-2">
          {(q.options || []).map((o) => {
            const active = Array.isArray(value) && value.includes(o);
            return (
              <button
                key={o}
                onClick={() => onToggle(o)}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${active ? "border-[#C9A227] bg-[#C9A227] text-[#0B1220]" : "border-[#C9A227]/30 text-[#F5EEDD]/80 hover:border-[#C9A227]/60"}`}
                data-testid={`chip-${q.id}-${o}`}
              >
                {o}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
