// ערכת מותג — מציג אסטרטגיה, פלטה (HEX/RGB/CMYK), טיפוגרפיה וקול המותג.
// כולל יצירת לוגו (Nano Banana Pro), בחירת קונספט, וקטוריזציה (Recraft→SVG),
// ויצוא ספר מותג כ-PDF (דרך חלון הדפסה — תמיכה עברית מלאה).
import { useMemo, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ScrollText, ArrowLeft, Loader2, Sparkles, Check, Download, PenTool,
  Palette as PaletteIcon, Type, MessageSquare, Compass, FileText, RefreshCw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getArchetype, AAKER_DIMENSIONS, ALL_QUESTIONS, contrastRatio, type BrandKit, type ColorSpec } from "@shared/branding";
import { buildBrandBookHtml } from "@/lib/brandBook";

interface BrandRow {
  id: number;
  brandName: string;
  briefJson: string;
  kitJson: string | null;
  logoPng: string | null;
  logoSvg: string | null;
}
interface LogoConcept { dataUrl: string; base64: string; mimeType: string; label: string; prompt: string; }

export default function BrandKitPage() {
  const params = useParams();
  const id = Number(params.id);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: brand, isLoading } = useQuery<BrandRow>({ queryKey: ["/api/brands", id] });

  const kit: BrandKit | null = useMemo(() => {
    if (!brand?.kitJson) return null;
    try { return JSON.parse(brand.kitJson); } catch { return null; }
  }, [brand]);

  const briefAnswers: Record<string, string | string[]> | null = useMemo(() => {
    if (!brand?.briefJson) return null;
    try { return JSON.parse(brand.briefJson); } catch { return null; }
  }, [brand]);
  const answeredQuestions = useMemo(() => {
    if (!briefAnswers) return [];
    return ALL_QUESTIONS.filter((q) => {
      const v = briefAnswers[q.id];
      return Array.isArray(v) ? v.length > 0 : !!v;
    });
  }, [briefAnswers]);

  const [logoStyle, setLogoStyle] = useState("");
  const [concepts, setConcepts] = useState<LogoConcept[]>([]);
  const [genBusy, setGenBusy] = useState(false);
  const [vecBusy, setVecBusy] = useState(false);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  if (isLoading) return <Centered><Loader2 className="h-6 w-6 animate-spin text-[#C9A227]" /></Centered>;
  if (!brand || !kit) return <Centered><p className="text-[#F5EEDD]/70">המותג לא נמצא. <button className="text-[#C9A227] underline" onClick={() => navigate("/branding")}>חזרה</button></p></Centered>;

  const arch = getArchetype(kit.strategy.archetypePrimary);
  const archSec = kit.strategy.archetypeSecondary ? getArchetype(kit.strategy.archetypeSecondary) : undefined;
  const allColors: ColorSpec[] = [...kit.colors.primary, ...kit.colors.secondary, ...kit.colors.neutral];
  const palette = allColors.map((c) => c.hex);

  async function generateLogos() {
    setGenBusy(true); setConcepts([]); setSelectedIdx(null);
    try {
      const res = await apiRequest("POST", "/api/branding/logo", {
        brandName: brand!.brandName,
        archetypeKey: kit!.strategy.archetypePrimary,
        palette,
        style: logoStyle,
        count: 3,
      }).then((r) => r.json());
      if (!res.ok || !res.concepts?.length) throw new Error(res.error || "לא הוחזרו קונספטים");
      setConcepts(res.concepts);
      toast({ title: "הלוגו נוצר", description: `${res.concepts.length} קונספטים מוכנים לבחירה` });
    } catch (e: any) {
      toast({ title: "יצירת הלוגו נכשלה", description: String(e?.message || e).slice(0, 160), variant: "destructive" });
    } finally { setGenBusy(false); }
  }

  async function chooseAndSave(idx: number) {
    if (savingIdx !== null) return;
    setSavingIdx(idx);
    setSelectedIdx(idx);
    try {
      const c = concepts[idx];
      await apiRequest("PATCH", `/api/brands/${id}`, { logoPng: c.dataUrl, logoSvg: null });
      queryClient.invalidateQueries({ queryKey: ["/api/brands", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      toast({ title: "הלוגו נשמר", description: "כעת ניתן לייצר SVG וקטורי" });
    } catch (e: any) {
      toast({ title: "שמירת הלוגו נכשלה", description: String(e?.message || e).slice(0, 160), variant: "destructive" });
    } finally {
      setSavingIdx(null);
    }
  }

  async function vectorize() {
    if (selectedIdx === null) return;
    setVecBusy(true);
    try {
      const c = concepts[selectedIdx];
      const res = await apiRequest("POST", "/api/branding/vectorize", { base64: c.base64, mimeType: c.mimeType }).then((r) => r.json());
      if (!res.ok || !res.svg) throw new Error(res.error || "וקטוריזציה נכשלה");
      await apiRequest("PATCH", `/api/brands/${id}`, { logoSvg: res.svg });
      queryClient.invalidateQueries({ queryKey: ["/api/brands", id] });
      toast({ title: "SVG מוכן", description: "הלוגו הומר לווקטור חד וניתן להורדה" });
    } catch (e: any) {
      toast({ title: "וקטוריזציה נכשלה", description: String(e?.message || e).slice(0, 160), variant: "destructive" });
    } finally { setVecBusy(false); }
  }

  function downloadSvg() {
    if (!brand!.logoSvg) return;
    const blob = new Blob([brand!.logoSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${brand!.brandName}-logo.svg`; a.click();
    URL.revokeObjectURL(url);
  }

  function downloadPng() {
    if (!brand!.logoPng) return;
    const a = document.createElement("a");
    a.href = brand!.logoPng; a.download = `${brand!.brandName}-logo.png`; a.click();
  }

  function exportPdf() {
    const html = buildBrandBookHtml({ brand: brand!, kit: kit!, arch, archSec });
    const w = window.open("", "_blank");
    if (!w) { toast({ title: "חסום", description: "אפשר חלונות קופצים כדי לייצא PDF", variant: "destructive" }); return; }
    w.document.write(html);
    w.document.close();
    // המתנה לטעינת פונטים ואז חלון הדפסה (שמירה כ-PDF)
    setTimeout(() => { w.focus(); w.print(); }, 900);
  }

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#F5EEDD]" dir="rtl">
      <div className="pointer-events-none fixed inset-0 opacity-40" style={{ background: "radial-gradient(circle at 15% 0%, rgba(201,162,39,0.12), transparent 45%)" }} />
      <header className="relative z-10 border-b border-[#C9A227]/20 bg-[#0B1220]/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <ScrollText className="h-6 w-6 text-[#C9A227]" />
            <h1 className="text-xl font-bold">{brand.brandName} <span className="text-[#C9A227]">·</span> ערכת מותג</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2 border-[#C9A227]/40 text-[#C9A227] hover:bg-[#C9A227]/10" onClick={exportPdf} data-testid="button-export-pdf">
              <FileText className="h-4 w-4" /> ייצוא ספר מותג
            </Button>
            <Button variant="ghost" className="gap-2 text-[#F5EEDD]/70" onClick={() => navigate("/branding")} data-testid="button-back-branding">
              <ArrowLeft className="h-4 w-4" /> חזרה
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl space-y-8 px-6 pb-24 pt-10">
        {/* אסטרטגיה + ארכיטיפ */}
        <Section icon={Compass} title="אסטרטגיה וארכיטיפ">
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              {kit.strategy.tagline && <p className="text-lg font-bold text-[#C9A227]">״{kit.strategy.tagline}״</p>}
              {kit.strategy.positioning && <Field label="משפט מיצוב" value={kit.strategy.positioning} />}
              {kit.strategy.mission && <Field label="מיסיון" value={kit.strategy.mission} />}
              {kit.strategy.values.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-bold text-[#C9A227]">ערכי מותג</p>
                  <div className="flex flex-wrap gap-2">
                    {kit.strategy.values.map((v, i) => <Badge key={i} className="bg-[#C9A227]/15 text-[#F5EEDD] hover:bg-[#C9A227]/25">{v}</Badge>)}
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {arch && (
                <div className="rounded-lg border border-[#C9A227]/25 bg-[#101B32] p-4">
                  <p className="text-xs text-[#F5EEDD]/60">ארכיטיפ דומיננטי</p>
                  <p className="text-lg font-bold text-[#C9A227]">{arch.name}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#F5EEDD]/70">{arch.desc}</p>
                  <p className="mt-2 text-[10px] text-[#F5EEDD]/50">דוגמאות: {arch.brands}</p>
                </div>
              )}
              {archSec && (
                <div className="rounded-lg border border-[#C9A227]/15 bg-[#101B32] p-3">
                  <p className="text-xs text-[#F5EEDD]/60">ארכיטיפ משני</p>
                  <p className="text-sm font-bold">{archSec.name}</p>
                </div>
              )}
              {kit.strategy.aaker.length > 0 && (
                <div className="rounded-lg border border-[#C9A227]/15 bg-[#101B32] p-3">
                  <p className="mb-1 text-xs text-[#F5EEDD]/60">ממדי אישיות (Aaker)</p>
                  <div className="flex flex-wrap gap-1">
                    {kit.strategy.aaker.map((k) => {
                      const d = AAKER_DIMENSIONS.find((x) => x.key === k);
                      return (
                        <Badge
                          key={k}
                          variant="outline"
                          className="border-[#C9A227]/40 text-[10px] text-[#C9A227]"
                          title={d ? `${d.desc} · דוגמאות: ${d.brands}` : undefined}
                        >
                          {d?.name || k}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* תשובות הבריף */}
        {answeredQuestions.length > 0 && (
          <Section icon={FileText} title="תשובות הבריף" subtitle={`${answeredQuestions.length} מתוך ${ALL_QUESTIONS.length} שאלות נענו`}>
            <div className="grid gap-4 sm:grid-cols-2">
              {answeredQuestions.map((q) => {
                const v = briefAnswers![q.id];
                const text = Array.isArray(v) ? v.join(", ") : v;
                return <Field key={q.id} label={q.q} value={text as string} />;
              })}
            </div>
          </Section>
        )}

        {/* פלטת צבע */}
        <Section icon={PaletteIcon} title="מערכת הצבע" subtitle={`יחסי שימוש: ${kit.colors.usageRatio}`}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {allColors.map((c, i) => {
              const onWhite = contrastRatio(c.hex, "#FFFFFF");
              return (
                <div key={i} className="overflow-hidden rounded-lg border border-[#C9A227]/15 bg-[#101B32]" data-testid={`color-${c.hex}`}>
                  <div className="h-24 w-full" style={{ background: c.hex }} />
                  <div className="space-y-1 p-3 text-[11px]">
                    <p className="text-xs font-bold text-[#F5EEDD]">{c.role}</p>
                    <p className="font-mono text-[#C9A227]">{c.hex}</p>
                    <p className="text-[#F5EEDD]/60">RGB {c.rgb}</p>
                    <p className="text-[#F5EEDD]/60">CMYK {c.cmyk}</p>
                    <p className="text-[#F5EEDD]/40">ניגודיות/לבן: {onWhite}:1</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* טיפוגרפיה */}
        <Section icon={Type} title="טיפוגרפיה">
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-[#C9A227]/15 bg-[#101B32] p-4">
              <p className="text-xs text-[#F5EEDD]/60">גופן כותרות</p>
              <p className="text-lg font-bold text-[#C9A227]">{kit.typography.headline}</p>
            </div>
            <div className="rounded-lg border border-[#C9A227]/15 bg-[#101B32] p-4">
              <p className="text-xs text-[#F5EEDD]/60">גופן גוף</p>
              <p className="text-lg font-bold text-[#C9A227]">{kit.typography.body}</p>
            </div>
          </div>
          <div className="space-y-2">
            {kit.typography.scale.map((s, i) => (
              <div key={i} className="flex items-baseline justify-between border-b border-[#C9A227]/10 pb-2">
                <span style={{ fontSize: `min(${s.size}, 40px)`, fontWeight: s.weight as any }} className="text-[#F5EEDD]">אבגד</span>
                <span className="text-xs text-[#F5EEDD]/60">{s.label} · {s.size} · {s.weight} · {s.use}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* קול המותג */}
        <Section icon={MessageSquare} title="קול וטון">
          {kit.strategy.voiceTraits.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {kit.strategy.voiceTraits.map((t, i) => <Badge key={i} className="bg-[#C9A227]/15 text-[#F5EEDD]">{t}</Badge>)}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-green-500/25 bg-[#101B32] p-4">
              <p className="mb-2 text-sm font-bold text-green-400">אנחנו כן</p>
              <ul className="space-y-1 text-xs text-[#F5EEDD]/80">
                {kit.strategy.voiceDo.length ? kit.strategy.voiceDo.map((v, i) => <li key={i}>✓ {v}</li>) : <li className="text-[#F5EEDD]/40">—</li>}
              </ul>
            </div>
            <div className="rounded-lg border border-red-500/25 bg-[#101B32] p-4">
              <p className="mb-2 text-sm font-bold text-red-400">אנחנו לא</p>
              <ul className="space-y-1 text-xs text-[#F5EEDD]/80">
                {kit.strategy.voiceDont.length ? kit.strategy.voiceDont.map((v, i) => <li key={i}>✗ {v}</li>) : <li className="text-[#F5EEDD]/40">—</li>}
              </ul>
            </div>
          </div>
        </Section>

        {/* לוגו */}
        <Section icon={PenTool} title="מערכת הלוגו" subtitle="נוצר ב-Nano Banana Pro · וקטוריזציה ב-Recraft">
          {/* לוגו נבחר שמור */}
          {brand.logoPng && (
            <div className="mb-6 flex flex-col items-center gap-3 rounded-lg border border-[#C9A227]/25 bg-white/95 p-6">
              <img src={brand.logoSvg ? `data:image/svg+xml;utf8,${encodeURIComponent(brand.logoSvg)}` : brand.logoPng} alt="לוגו" className="max-h-48 object-contain" data-testid="img-saved-logo" />
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="outline" className="gap-2 border-[#0B1220]/30 text-[#0B1220] hover:bg-[#0B1220]/5" onClick={downloadPng} data-testid="button-download-png">
                  <Download className="h-4 w-4" /> הורד PNG
                </Button>
                {brand.logoSvg && (
                  <Button variant="outline" className="gap-2 border-[#0B1220]/30 text-[#0B1220] hover:bg-[#0B1220]/5" onClick={downloadSvg} data-testid="button-download-svg">
                    <Download className="h-4 w-4" /> הורד SVG וקטורי
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-[#F5EEDD]/60">כיוון סגנון ללוגו (אופציונלי)</label>
              <Input value={logoStyle} onChange={(e) => setLogoStyle(e.target.value)} placeholder="לדוגמה: אמבלם עגול עם עיטור, זהב על נייבי" className="border-[#C9A227]/30 bg-[#0B1220] text-[#F5EEDD]" dir="rtl" data-testid="input-logo-style" />
            </div>
            <Button className="gap-2 bg-[#C9A227] text-[#0B1220] hover:bg-[#DDB63A]" disabled={genBusy} onClick={generateLogos} data-testid="button-generate-logo">
              {genBusy ? <><Loader2 className="h-4 w-4 animate-spin" /> יוצר…</> : <><Sparkles className="h-4 w-4" /> {concepts.length ? "צור מחדש" : "צור קונספטים"}</>}
            </Button>
          </div>

          {concepts.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {concepts.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => chooseAndSave(i)}
                    disabled={savingIdx !== null}
                    className={`overflow-hidden rounded-lg border-2 bg-white transition disabled:cursor-not-allowed disabled:opacity-60 ${selectedIdx === i ? "border-[#C9A227] ring-2 ring-[#C9A227]/40" : "border-transparent hover:border-[#C9A227]/40"}`}
                    data-testid={`concept-${i}`}
                  >
                    <div className="relative flex h-44 items-center justify-center p-3">
                      <img src={c.dataUrl} alt={c.label} className="max-h-full max-w-full object-contain" />
                      {selectedIdx === i && (
                        <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#C9A227] text-[#0B1220]">
                          {savingIdx === i ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </div>
                      )}
                    </div>
                    <p className="border-t border-black/5 bg-white py-2 text-center text-xs font-bold text-[#0B1220]" title={c.prompt}>{c.label}</p>
                  </button>
                ))}
              </div>
              {selectedIdx !== null && !brand.logoSvg && (
                <div className="mt-4 flex justify-center">
                  <Button className="gap-2 bg-[#0B1220] text-[#F5EEDD] hover:bg-[#101B32] border border-[#C9A227]/40" disabled={vecBusy} onClick={vectorize} data-testid="button-vectorize">
                    {vecBusy ? <><Loader2 className="h-4 w-4 animate-spin" /> ממיר לווקטור…</> : <><RefreshCw className="h-4 w-4" /> המר ל-SVG וקטורי (Recraft)</>}
                  </Button>
                </div>
              )}
            </>
          )}
          {concepts.length === 0 && !brand.logoPng && (
            <p className="rounded-lg border border-dashed border-[#C9A227]/20 bg-[#101B32] p-8 text-center text-sm text-[#F5EEDD]/50">
              לחץ על ״צור קונספטים״ ליצירת 3 כיווני לוגו עם עברית מדויקת
            </p>
          )}
        </Section>
      </main>
    </div>
  );
}

function Section({ icon: Icon, title, subtitle, children }: { icon: any; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card className="border-[#C9A227]/20 bg-[#0B1220]/40">
      <CardContent className="p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#C9A227]/15"><Icon className="h-5 w-5 text-[#C9A227]" /></div>
          <div>
            <h3 className="text-lg font-bold">{title}</h3>
            {subtitle && <p className="text-xs text-[#F5EEDD]/60">{subtitle}</p>}
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-bold text-[#C9A227]">{label}</p>
      <p className="text-sm leading-relaxed text-[#F5EEDD]/90">{value}</p>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-[#0B1220]" dir="rtl">{children}</div>;
}
