import { useState, useRef } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { API_BASE } from "@/lib/queryClient";
import type { AppConfig, AdType, AdStyle, StageEvent } from "@/lib/types";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Flower2, PartyPopper, Building2, ArrowRight, ArrowLeft, Download, Loader2,
  Sparkles, ImageIcon, Type, CheckCircle2, AlertCircle, RefreshCw, Images, ShieldCheck,
} from "lucide-react";

const ICONS: Record<string, any> = { Flower2, PartyPopper, Building2 };

type Step = 1 | 2 | 3 | 4;

export default function Generator() {
  const { data: config, isLoading } = useQuery<AppConfig>({ queryKey: ["/api/config"] });

  const [step, setStep] = useState<Step>(1);
  const [adTypeId, setAdTypeId] = useState<string>("");
  const [styleId, setStyleId] = useState<string>("");
  const [community, setCommunity] = useState<string>("general");
  const [aspect, setAspect] = useState<string>("4:5");
  const [fields, setFields] = useState<Record<string, string>>({});

  const adType: AdType | undefined = config?.adTypes.find((t) => t.id === adTypeId);
  const styles: AdStyle[] = (config?.styles?.[adTypeId] as AdStyle[]) || [];
  const style = styles.find((s) => s.id === styleId);

  // מצב יצירה
  const [generating, setGenerating] = useState(false);
  const [events, setEvents] = useState<StageEvent[]>([]);
  const [progress, setProgress] = useState(0);
  const [bgPreview, setBgPreview] = useState<string>("");
  const [finalImage, setFinalImage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);

  function pickType(id: string) {
    setAdTypeId(id);
    setStyleId("");
    setFields({});
    setStep(2);
  }

  function toStep3() {
    if (!styleId) return;
    setStep(3);
  }

  function canGenerate(): boolean {
    if (!adType) return false;
    return adType.fields.filter((f) => f.required).every((f) => (fields[f.key] || "").trim().length > 0);
  }

  async function startGenerate() {
    setError("");
    setEvents([]);
    setProgress(0);
    setBgPreview("");
    setFinalImage("");
    setGenerating(true);
    setStep(4);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${API_BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adType: adTypeId, styleId, community, fields, aspectRatio: aspect }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error("החיבור לשרת נכשל");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";
        for (const chunk of chunks) {
          const line = chunk.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          const evt: StageEvent = JSON.parse(line.slice(6));
          handleEvent(evt);
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") setError(e.message || "שגיאה לא צפויה");
    } finally {
      setGenerating(false);
    }
  }

  function handleEvent(evt: StageEvent) {
    if (evt.stage === "error") {
      setError(evt.message);
      return;
    }
    if (typeof evt.progress === "number") setProgress(evt.progress);
    if (evt.stage === "background" && evt.data?.backgroundDataUrl) setBgPreview(evt.data.backgroundDataUrl);
    if ((evt.stage === "text" || evt.stage === "done" || evt.stage === "result") && evt.data?.finalDataUrl)
      setFinalImage(evt.data.finalDataUrl);
    if (evt.stage !== "result")
      setEvents((prev) => [...prev, evt]);
  }

  function download() {
    if (!finalImage) return;
    const a = document.createElement("a");
    a.href = finalImage;
    a.download = `modaa-${adTypeId}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function reset() {
    abortRef.current?.abort();
    setStep(1);
    setAdTypeId("");
    setStyleId("");
    setFields({});
    setGenerating(false);
    setEvents([]);
    setProgress(0);
    setBgPreview("");
    setFinalImage("");
    setError("");
  }

  if (isLoading || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <Link href="/gallery">
              <Button variant="ghost" size="sm" data-testid="link-gallery" className="gap-1.5">
                <Images className="w-4 h-4" /> גלריה
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Stepper */}
        <Stepper step={step} />

        {step === 1 && <StepType config={config} onPick={pickType} />}

        {step === 2 && adType && (
          <StepStyle
            adType={adType}
            styles={styles}
            styleId={styleId}
            setStyleId={setStyleId}
            community={community}
            setCommunity={setCommunity}
            communities={config.communities}
            aspect={aspect}
            setAspect={setAspect}
            aspectRatios={config.aspectRatios}
            onBack={() => setStep(1)}
            onNext={toStep3}
          />
        )}

        {step === 3 && adType && (
          <StepFields
            adType={adType}
            fields={fields}
            setFields={setFields}
            canGenerate={canGenerate()}
            onBack={() => setStep(2)}
            onGenerate={startGenerate}
          />
        )}

        {step === 4 && (
          <StepResult
            events={events}
            progress={progress}
            bgPreview={bgPreview}
            finalImage={finalImage}
            error={error}
            generating={generating}
            style={style}
            onDownload={download}
            onRetry={startGenerate}
            onReset={reset}
          />
        )}
      </main>
    </div>
  );
}

/* ---------------- Stepper ---------------- */
function Stepper({ step }: { step: Step }) {
  const steps = [
    { n: 1, label: "סוג מודעה", icon: Type },
    { n: 2, label: "סגנון", icon: Sparkles },
    { n: 3, label: "תוכן", icon: Type },
    { n: 4, label: "יצירה", icon: ImageIcon },
  ];
  return (
    <div className="flex items-center justify-center mb-10">
      {steps.map((s, i) => {
        const active = step === s.n;
        const done = step > s.n;
        return (
          <div key={s.n} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                  active
                    ? "bg-primary border-primary text-primary-foreground"
                    : done
                    ? "bg-primary/15 border-primary text-primary"
                    : "bg-muted border-border text-muted-foreground"
                }`}
              >
                {done ? <CheckCircle2 className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
              </div>
              <span className={`text-xs ${active ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-12 sm:w-20 h-0.5 mx-1 mb-5 ${step > s.n ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Step 1: type ---------------- */
function StepType({ config, onPick }: { config: AppConfig; onPick: (id: string) => void }) {
  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-xl font-bold mb-2" style={{ fontFamily: '"Frank Ruhl Libre", serif' }}>
          איזו מודעה נעצב היום?
        </h1>
        <p className="text-muted-foreground text-sm">בחרו את סוג המודעה כדי להתחיל</p>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        {config.adTypes.map((t) => {
          const Icon = ICONS[t.icon] || Type;
          return (
            <button
              key={t.id}
              onClick={() => onPick(t.id)}
              data-testid={`card-adtype-${t.id}`}
              className="group text-right rounded-xl border border-card-border bg-card p-6 hover-elevate transition-all"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold text-base mb-1">{t.name}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t.description}</p>
              <div className="mt-4 flex items-center gap-1 text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                בחר <ArrowLeft className="w-4 h-4" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Step 2: style ---------------- */
function StepStyle(props: any) {
  const { adType, styles, styleId, setStyleId, community, setCommunity, communities, aspect, setAspect, aspectRatios, onBack, onNext } = props;
  return (
    <div>
      <SectionTitle title={`סגנון עבור ${adType.name}`} subtitle="בחרו את השפה העיצובית, הקהילה והמידות" />

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {styles.map((s: AdStyle) => {
          const selected = styleId === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setStyleId(s.id)}
              data-testid={`card-style-${s.id}`}
              className={`text-right rounded-xl border-2 overflow-hidden hover-elevate transition-all ${
                selected ? "border-primary" : "border-card-border"
              }`}
            >
              <div
                className="h-24 relative"
                style={{
                  background: `linear-gradient(135deg, ${s.palette.overlay.replace(/[\d.]+\)$/, "0.9)")}, ${s.palette.accent}22)`,
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <span style={{ color: s.palette.text, fontFamily: '"Frank Ruhl Libre", serif' }} className="text-lg font-bold">
                    אָלֶף בֵּית
                  </span>
                </div>
                <div className="absolute bottom-2 left-2 flex gap-1">
                  <Dot c={s.palette.text} /><Dot c={s.palette.accent} /><Dot c={s.palette.subtext} />
                </div>
              </div>
              <div className="p-3 bg-card">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm">{s.name}</h4>
                  {selected && <CheckCircle2 className="w-4 h-4 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid sm:grid-cols-2 gap-6 mb-8">
        <div>
          <Label className="mb-2 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-primary" /> פרופיל קהילה (צניעות)</Label>
          <div className="flex flex-wrap gap-2">
            {communities.map((c: any) => (
              <button
                key={c.id}
                onClick={() => setCommunity(c.id)}
                data-testid={`chip-community-${c.id}`}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  community === c.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover-elevate"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            המערכת מוסיפה אוטומטית כללי צניעות — ללא דמויות, ללא תמונות נשים.
          </p>
        </div>
        <div>
          <Label className="mb-2 block">מידות</Label>
          <div className="flex flex-wrap gap-2">
            {aspectRatios.map((a: any) => (
              <button
                key={a.id}
                onClick={() => setAspect(a.id)}
                data-testid={`chip-aspect-${a.id}`}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  aspect === a.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover-elevate"
                }`}
              >
                {a.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <NavButtons onBack={onBack} onNext={onNext} nextDisabled={!styleId} nextLabel="המשך למילוי תוכן" />
    </div>
  );
}

function Dot({ c }: { c: string }) {
  return <span className="w-3 h-3 rounded-full border border-white/30" style={{ background: c }} />;
}

/* ---------------- Step 3: fields ---------------- */
function StepFields(props: any) {
  const { adType, fields, setFields, canGenerate, onBack, onGenerate } = props;
  const set = (k: string, v: string) => setFields((prev: any) => ({ ...prev, [k]: v }));
  return (
    <div className="max-w-2xl mx-auto">
      <SectionTitle title="תוכן המודעה" subtitle="מלאו את הפרטים — הטקסט יולבש בעברית מדויקת" />
      <div className="space-y-5 mb-8">
        {adType.fields.map((f: any) => (
          <div key={f.key}>
            <Label htmlFor={f.key} className="mb-1.5 block">
              {f.label} {f.required && <span className="text-destructive">*</span>}
            </Label>
            {f.type === "textarea" ? (
              <Textarea
                id={f.key}
                data-testid={`input-${f.key}`}
                placeholder={f.placeholder}
                maxLength={f.maxLength}
                dir="rtl"
                rows={3}
                value={fields[f.key] || ""}
                onChange={(e) => set(f.key, e.target.value)}
              />
            ) : (
              <Input
                id={f.key}
                data-testid={`input-${f.key}`}
                placeholder={f.placeholder}
                maxLength={f.maxLength}
                dir="rtl"
                value={fields[f.key] || ""}
                onChange={(e) => set(f.key, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} data-testid="button-back" className="gap-1.5">
          <ArrowRight className="w-4 h-4" /> חזרה
        </Button>
        <Button onClick={onGenerate} disabled={!canGenerate} data-testid="button-generate" className="gap-2">
          <Sparkles className="w-4 h-4" /> צור מודעה
        </Button>
      </div>
    </div>
  );
}

/* ---------------- Step 4: result ---------------- */
function StepResult(props: any) {
  const { events, progress, bgPreview, finalImage, error, generating, onDownload, onRetry, onReset } = props;

  const stageLabels: Record<string, { label: string; icon: any }> = {
    prompt: { label: "בניית פרומפט חכם", icon: Sparkles },
    background: { label: "יצירת רקע גרפי (AI)", icon: ImageIcon },
    text: { label: "הלבשת טקסט עברי", icon: Type },
    polish: { label: "ליטוש", icon: Sparkles },
    done: { label: "מוכן", icon: CheckCircle2 },
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Pipeline */}
      <div>
        <SectionTitle title="הזרימה החכמה" subtitle="המערכת מריצה את המודעה בין כלי ה-AI מקצה לקצה" />
        {!error && (
          <div className="mb-5">
            <Progress value={progress} className="h-2" />
            <div className="text-xs text-muted-foreground mt-1.5 text-left">{progress}%</div>
          </div>
        )}

        {error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
              <div>
                <h4 className="font-bold text-destructive mb-1">היצירה נעצרה</h4>
                <p className="text-sm text-foreground/80 leading-relaxed">{error}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button size="sm" onClick={onRetry} className="gap-1.5" data-testid="button-retry">
                <RefreshCw className="w-4 h-4" /> נסה שוב
              </Button>
              <Button size="sm" variant="ghost" onClick={onReset} data-testid="button-reset">התחל מחדש</Button>
            </div>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {["prompt", "background", "text", "done"].map((stg) => {
              const evs = events.filter((e: StageEvent) => e.stage === stg);
              const last = evs[evs.length - 1];
              const started = evs.some((e: StageEvent) => e.status === "start") || !!last;
              const ok = evs.some((e: StageEvent) => e.status === "ok");
              const meta = stageLabels[stg];
              const Icon = meta.icon;
              return (
                <li
                  key={stg}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                    ok ? "border-primary/40 bg-primary/5" : started ? "border-border bg-card" : "border-border/60 bg-muted/40 opacity-60"
                  }`}
                  data-testid={`stage-${stg}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${ok ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {started && !ok && generating ? <Loader2 className="w-4 h-4 animate-spin" /> : ok ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{meta.label}</div>
                    {last && <div className="text-xs text-muted-foreground">{last.message}</div>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {bgPreview && !finalImage && !error && (
          <div className="mt-5">
            <div className="text-xs text-muted-foreground mb-1.5">רקע שנוצר (לפני הלבשת הטקסט):</div>
            <img src={bgPreview} alt="רקע" className="rounded-lg border border-border w-40" />
          </div>
        )}
      </div>

      {/* Preview */}
      <div>
        <SectionTitle title="המודעה" subtitle={finalImage ? "מוכנה להורדה" : "התצוגה תופיע כאן"} />
        <div className="rounded-xl border border-card-border bg-card p-4 flex items-center justify-center min-h-[420px]">
          {finalImage ? (
            <img src={finalImage} alt="מודעה מוגמרת" className="max-h-[560px] rounded-lg shadow-xl" data-testid="img-final" />
          ) : generating ? (
            <div className="text-center text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
              <p className="text-sm">יוצר את המודעה שלך…</p>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">אין תצוגה עדיין</p>
            </div>
          )}
        </div>
        {finalImage && (
          <div className="flex gap-2 mt-4">
            <Button onClick={onDownload} className="gap-2 flex-1" data-testid="button-download">
              <Download className="w-4 h-4" /> הורד מודעה (PNG)
            </Button>
            <Button variant="outline" onClick={onReset} data-testid="button-new" className="gap-1.5">
              <Sparkles className="w-4 h-4" /> מודעה חדשה
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- helpers ---------------- */
function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold" style={{ fontFamily: '"Frank Ruhl Libre", serif' }}>{title}</h2>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function NavButtons({ onBack, onNext, nextDisabled, nextLabel }: any) {
  return (
    <div className="flex items-center justify-between">
      <Button variant="ghost" onClick={onBack} data-testid="button-back" className="gap-1.5">
        <ArrowRight className="w-4 h-4" /> חזרה
      </Button>
      <Button onClick={onNext} disabled={nextDisabled} data-testid="button-next" className="gap-1.5">
        {nextLabel} <ArrowLeft className="w-4 h-4" />
      </Button>
    </div>
  );
}
