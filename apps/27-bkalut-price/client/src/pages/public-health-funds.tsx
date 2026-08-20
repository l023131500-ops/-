import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Logo } from "@/components/logo";
import { HealthBrand } from "@/components/health-brand";
import { useToast } from "@/hooks/use-toast";
import { API_BASE, apiRequest } from "@/lib/queryClient";
import { getPublicOrigin } from "@/lib/utils";
import {
  Search, Tag, ArrowRight, Share2, X, ChevronDown,
  HeartPulse, Users, Award, ChevronLeft, Stethoscope, Landmark, HandHeart, Wallet,
  HelpCircle, Sparkles, ArrowLeftRight, Loader2, Mail, ListChecks,
} from "lucide-react";

// Health-fund options for the switch-interest form. The four Israeli funds
// plus an explicit "undecided" choice, per the requested UX.
const SWITCH_FUND_OPTIONS = ["כללית", "מכבי", "מאוחדת", "לאומית"];
const SWITCH_TARGET_OPTIONS = [...SWITCH_FUND_OPTIONS, "עדיין לא יודע/ת"];

// "השוואת קופות חולים מבית בקלות" — public face of the hf_* database.
//
// Design (per user request + reference screenshot): the search + filters live in
// a SIDE column, and every topic is an expandable ACCORDION row. When a topic is
// opened it shows ONLY general information — who it is for and what can be
// received (the overall low→high range) — plus which health funds offer it, each
// in its own coloured block showing the PLAN names only. The precise per-fund
// numbers (rate / amount / waiting time) are NEVER shown here; they are sent to
// the client through the "קרא עוד" → form → webhook flow.
//
// Plain wording only: we spell out שב"ן as "ביטוח בריאות משלים" so everyone
// understands. Formal, simple language — no questions, no slogans.

interface HfFund { key: string; name: string; color: string }
interface HfPublicFund { key: string; name: string; plans: string[] }
interface HfMeta {
  title: string;
  fundCount: number;
  govCount: number;
  ngoCount: number;
  fundCategories: string[];
  govCategories: string[];
  ngoCategories: string[];
  funds: HfFund[];
}
interface HfPublicTopic {
  id: number;
  catalogNo: number;
  kind: string;
  category: string;
  subCategory: string;
  topic: string;
  audience: string;
  benefitSummary: string;
  rangeText: string;
  bestFund: string;
  publicSiteText: string;
  sourceName: string;
  serviceUrl: string;
  fundsAvailable: HfPublicFund[];
}

type KindFilter = "" | "fund" | "gov" | "ngo";

interface FilterState {
  q: string;
  kind: KindFilter;
  category: string;
  fund: string;
}

const emptyFilters: FilterState = { q: "", kind: "", category: "", fund: "" };

const TRACKS: { v: KindFilter; label: string; icon: typeof HeartPulse }[] = [
  { v: "", label: "הכול", icon: HeartPulse },
  { v: "fund", label: "הטבות קופות חולים", icon: Stethoscope },
  { v: "gov", label: "זכויות ממשרדים", icon: Landmark },
  { v: "ngo", label: "עמותות וסיוע משלים", icon: HandHeart },
];

// Frequently-asked questions — plain, formal wording; no visitor-facing prompts.
const FAQ: { q: string; a: string }[] = [
  {
    q: 'מהו ביטוח בריאות משלים (שב"ן)?',
    a: 'ביטוח בריאות משלים הוא תוכנית נוספת שמציעה כל קופת חולים מעבר לסל הבסיסי. היא מרחיבה את הזכאויות וכוללת החזרים והטבות נוספים.',
  },
  {
    q: 'האם המידע כאן מחליף ייעוץ מול הקופה?',
    a: 'המידע מיועד להתרשמות ולהשוואה כללית. הנתונים מבוססים על מקורות רשמיים של הקופות; הזכאות המדויקת תלויה בתוכנית ובמועד.',
  },
  {
    q: 'כיצד מקבלים את הפירוט המדויק לכל קופה?',
    a: 'שיעור ההחזר, הסכום, זמן ההמתנה ואופן הבקשה נשלחים באופן אישי למייל. ניתן לבקש את המידע המלא דרך כפתור "מעוניינים במידע המפורט למייל" שליד כל הטבה.',
  },
  {
    q: 'האם השירות כרוך בעלות?',
    a: 'קבלת המידע וההתאמה ניתנות ללא התחייבות. ביצוע הבקשה מול הקופה על ידי צוות בקלות הוא אפשרות נפרדת שניתן לבחור בטופס הבקשה.',
  },
];

function fundColor(meta: HfMeta | null, key: string, name: string): string | null {
  if (!meta) return null;
  const hit = meta.funds.find(
    (x) => x.key === key || x.name === name || name.startsWith(x.name) || name.includes(x.name),
  );
  return hit ? hit.color : null;
}

export default function PublicHealthFunds() {
  const { toast } = useToast();
  const [meta, setMeta] = useState<HfMeta | null>(null);
  const [results, setResults] = useState<HfPublicTopic[]>([]);
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [howToSwitchOpen, setHowToSwitchOpen] = useState(false);

  // Fund-switch interest form (מתעניין במעבר קופת חולים)
  const emptySwitch = {
    fullName: "", phone: "", email: "", idNumber: "", city: "",
    currentFund: "", currentSupplemental: "", targetFund: "", peopleCount: "", note: "",
  };
  const [switchOpen, setSwitchOpen] = useState(false);
  const [switchTopic, setSwitchTopic] = useState<{ id: number; topic: string } | null>(null);
  const [switchForm, setSwitchForm] = useState({ ...emptySwitch });
  const [switchSubmitting, setSwitchSubmitting] = useState(false);

  function openSwitch(row: { id: number; topic: string }) {
    setSwitchTopic({ id: row.id, topic: row.topic });
    setSwitchForm({ ...emptySwitch });
    setSwitchOpen(true);
  }

  async function submitSwitch() {
    const fullName = switchForm.fullName.trim();
    const phone = switchForm.phone.trim();
    if (!fullName) {
      toast({ title: "חסר שם", description: "נא למלא שם פרטי ומשפחה.", variant: "destructive" });
      return;
    }
    if (phone.replace(/\D/g, "").length < 6) {
      toast({ title: "חסר טלפון", description: "נא למלא מספר טלפון תקין.", variant: "destructive" });
      return;
    }
    setSwitchSubmitting(true);
    try {
      await apiRequest("POST", "/api/hf/public/switch-lead", {
        topicId: switchTopic?.id,
        ...switchForm,
        fullName,
        phone,
      });
      toast({ title: "הפנייה התקבלה", description: "נחזור אליך/ך בהקדם לגבי המעבר. תודה!" });
      setSwitchOpen(false);
    } catch {
      toast({ title: "שגיאה בשליחה", description: "לא הצלחנו לשלוח את הפנייה. נא לנסות שוב.", variant: "destructive" });
    } finally {
      setSwitchSubmitting(false);
    }
  }

  function buildParams(f: FilterState): URLSearchParams {
    const p = new URLSearchParams();
    if (f.q.trim()) p.set("q", f.q.trim());
    if (f.kind) p.set("kind", f.kind);
    if (f.category.trim()) p.set("category", f.category.trim());
    if (f.fund.trim()) p.set("fund", f.fund.trim());
    p.set("limit", "300");
    return p;
  }

  async function runSearch(f: FilterState) {
    setLoading(true);
    setOpenId(null);
    try {
      const res = await fetch(`${API_BASE}/api/hf/public/search?${buildParams(f).toString()}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetch(`${API_BASE}/api/hf/public/meta`)
      .then((r) => r.json())
      .then((m: HfMeta) => setMeta(m))
      .catch(() => {});
    runSearch(emptyFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(patch: Partial<FilterState>) {
    const next = { ...filters, ...patch };
    setFilters(next);
    return next;
  }

  function shareLink() {
    const p = buildParams(filters);
    const url = `${getPublicOrigin()}/#/health-funds${p.toString() ? `?${p.toString()}` : ""}`;
    if (navigator.share) {
      navigator.share({ title: meta?.title || "השוואת קופות חולים", url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(
        () => toast({ title: "הקישור הועתק" }),
        () => toast({ title: "העתיקו ידנית", description: url }),
      );
    }
  }

  const categories = useMemo(() => {
    if (!meta) return [] as string[];
    if (filters.kind === "fund") return meta.fundCategories;
    if (filters.kind === "gov") return meta.govCategories;
    if (filters.kind === "ngo") return meta.ngoCategories ?? [];
    return [...meta.fundCategories, ...meta.govCategories, ...(meta.ngoCategories ?? [])];
  }, [meta, filters.kind]);

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (filters.kind) c++;
    if (filters.category) c++;
    if (filters.fund) c++;
    return c;
  }, [filters]);

  function trackIcon(kind: string) {
    if (kind === "gov") return Landmark;
    if (kind === "ngo") return HandHeart;
    return Stethoscope;
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl" data-testid="page-public-health-funds">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <HealthBrand size={34} />
          <Link href="/" data-testid="link-hf-home">
            <a className="flex items-center gap-1.5 text-sm text-muted-foreground hover-elevate rounded-md px-2 py-1 transition-colors">
              <Logo className="h-7 w-auto" />
              <span className="hidden sm:inline">חזרה לבקלות</span>
              <ChevronLeft className="w-4 h-4" />
            </a>
          </Link>
        </div>
      </header>

      {/* Colorful hero band */}
      <section className="bg-gradient-to-l from-primary/10 via-accent/40 to-transparent border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-2">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-hf-title">
            {meta?.title || "השוואת קופות חולים מבית בקלות"}
          </h1>
          <p className="text-sm text-muted-foreground max-w-3xl leading-6">
            מאגר מרוכז של הטבות, החזרים וזכויות מכל קופות החולים ותוכניות הביטוח המשלים
            {' (שב"ן — ביטוח בריאות משלים) '}
            — וגם זכויות ממשרדי הממשלה ועמותות סיוע. מוצג מידע כללי בלבד: למי מיועדת ההטבה
            ומה ניתן לקבל. את הפירוט המדויק לכל קופה מקבלים בלחיצה על "קרא עוד".
          </p>
          {meta && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1" data-testid="hf-data-meta">
              <span className="inline-flex items-center gap-1"><Stethoscope className="w-3.5 h-3.5" /> נושאי קופות חולים: {meta.fundCount.toLocaleString("he-IL")}</span>
              <span className="inline-flex items-center gap-1"><Landmark className="w-3.5 h-3.5" /> זכויות ממשרדים: {meta.govCount.toLocaleString("he-IL")}</span>
              {!!meta.ngoCount && (
                <span className="inline-flex items-center gap-1"><HandHeart className="w-3.5 h-3.5" /> עמותות וסיוע משלים: {meta.ngoCount.toLocaleString("he-IL")}</span>
              )}
              <span className="inline-flex items-center gap-1 flex-wrap">
                {meta.funds.map((f) => (
                  <span key={f.key} className="inline-flex items-center gap-1 ml-2">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: f.color }} /> {f.name}
                  </span>
                ))}
              </span>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground/80">
            המידע מבוסס על מקורות רשמיים של הקופות ותקנון הביטוח המשלים. הנתונים להתרשמות בלבד; הזכאות המדויקת תלויה בתוכנית ובמועד.
          </p>
        </div>
      </section>

      {/* Two-column layout: SIDE search/filters column + accordion list */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-6 items-start">

          {/* ── SIDE COLUMN ── */}
          <aside className="lg:sticky lg:top-6 space-y-4" data-testid="hf-sidebar">
            <Card className="p-4 space-y-4">
              <div className="space-y-2">
                <label htmlFor="hf-search-input" className="text-xs font-semibold text-foreground">חיפוש</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-muted-foreground" />
                  <Input
                    id="hf-search-input"
                    value={filters.q}
                    onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && runSearch(filters)}
                    placeholder="נושא, הטבה או קהל יעד"
                    className="pr-9"
                    data-testid="input-hf-search"
                  />
                </div>
                <Button
                  onClick={() => runSearch(filters)}
                  className="w-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                  data-testid="button-hf-search"
                >
                  <Search className="w-4 h-4 ml-1" /> חיפוש
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">תחום</label>
                <div className="grid grid-cols-1 gap-1.5" data-testid="hf-track-toggle">
                  {TRACKS.map((t) => (
                    <Button
                      key={t.v || "all"}
                      variant={filters.kind === t.v ? "default" : "outline"}
                      size="sm"
                      className="justify-start transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
                      onClick={() => { const n = update({ kind: t.v, category: "" }); runSearch(n); }}
                      data-testid={`button-hf-track-${t.v || "all"}`}
                    >
                      <t.icon className="w-4 h-4 ml-1.5 shrink-0" /> {t.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="hf-fund-select" className="text-xs font-semibold text-foreground">קופת חולים</label>
                <select
                  id="hf-fund-select"
                  className="w-full border border-border rounded-md px-2 py-2 text-sm bg-background"
                  value={filters.fund}
                  onChange={(e) => { const n = update({ fund: e.target.value }); runSearch(n); }}
                  data-testid="select-hf-fund"
                >
                  <option value="">כל הקופות</option>
                  {meta?.funds.map((f) => <option key={f.key} value={f.key}>{f.name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="hf-category-select" className="text-xs font-semibold text-foreground">קטגוריה</label>
                <select
                  id="hf-category-select"
                  className="w-full border border-border rounded-md px-2 py-2 text-sm bg-background"
                  value={filters.category}
                  onChange={(e) => { const n = update({ category: e.target.value }); runSearch(n); }}
                  data-testid="select-hf-category"
                >
                  <option value="">כל הקטגוריות</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
                  onClick={shareLink}
                  data-testid="button-hf-share"
                >
                  <Share2 className="w-4 h-4 ml-1" /> שיתוף
                </Button>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setFilters(emptyFilters); runSearch(emptyFilters); }}
                    data-testid="button-hf-clear-filters"
                  >
                    <X className="w-4 h-4 ml-1" /> ניקוי
                  </Button>
                )}
              </div>
            </Card>

            <Card className="p-4 text-xs text-muted-foreground" data-testid="hf-contact-text">
              <div className="font-medium text-foreground mb-1">מרכז השירות של בקלות</div>
              צוות בקלות מסייע במימוש הזכויות וההטבות המגיעות לכם.
              <div className="mt-1 leading-5">טלפון 02-3131500 · דוא"ל l023131500@gmail.com · bkalut.org.il</div>
            </Card>
          </aside>

          {/* ── ACCORDION LIST ── */}
          <div className="space-y-4 min-w-0">
            {filters.kind === "ngo" && (
              <Card className="p-4 flex items-start gap-2.5 bg-muted/40" data-testid="hf-ngo-track-note">
                <HandHeart className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-foreground/90 leading-6">
                  עמותות וגופי סיוע המשלימים את סל הבריאות — השאלת ציוד רפואי, הסעות וליווי רפואי, סיוע כלכלי לטיפולים ותמיכה לחולים ולמשפחותיהם — לצד זכויות הקופות והמדינה.
                </p>
              </Card>
            )}
            {filters.kind === "gov" && (
              <Card className="p-4 flex items-start gap-2.5 bg-muted/40" data-testid="hf-gov-track-note">
                <Landmark className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-foreground/90 leading-6">
                  הטבות משלימות ממשרדי הממשלה השונים — זכויות, החזרים וסיועים המשלימים את סל הבריאות והטבות קופות החולים.
                </p>
              </Card>
            )}

            {categories.length > 0 && (
              <section className="flex flex-wrap gap-2" data-testid="hf-categories">
                <Button variant={filters.category === "" ? "default" : "outline"} size="sm"
                  className="transition-all duration-200 hover:-translate-y-0.5"
                  onClick={() => { const n = update({ category: "" }); runSearch(n); }} data-testid="button-hf-cat-all">הכול</Button>
                {categories.slice(0, 14).map((c) => (
                  <Button key={c} variant={filters.category === c ? "default" : "outline"} size="sm"
                    className="transition-all duration-200 hover:-translate-y-0.5"
                    onClick={() => { const n = update({ category: c }); runSearch(n); }} data-testid={`button-hf-cat-${c}`}>
                    <Tag className="w-3 h-3 ml-1" /> {c}
                  </Button>
                ))}
              </section>
            )}

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
              </div>
            ) : results.length === 0 ? (
              <Card className="p-10 text-center text-sm text-muted-foreground" data-testid="hf-no-results">
                לא נמצאו נושאים מתאימים. ניתן לשנות את החיפוש או הסינון.
              </Card>
            ) : (
              <>
                <div className="text-xs text-muted-foreground" data-testid="hf-result-count">
                  נמצאו {results.length.toLocaleString("he-IL")} נושאים
                </div>

                <div className="space-y-2.5" data-testid="hf-results">
                  {results.map((row) => {
                    const isOpen = openId === row.id;
                    const TIcon = trackIcon(row.kind);
                    const bestCol = fundColor(meta, "", row.bestFund);
                    return (
                      <Card
                        key={row.id}
                        className={`overflow-hidden transition-all duration-200 ${isOpen ? "shadow-md ring-1 ring-primary/20" : "hover:shadow-sm"}`}
                        data-testid={`hf-topic-${row.id}`}
                      >
                        {/* Accordion header — click to open/close */}
                        <button
                          type="button"
                          onClick={() => setOpenId(isOpen ? null : row.id)}
                          className="w-full text-right px-4 py-3.5 flex items-center gap-3 hover-elevate transition-colors"
                          data-testid={`button-hf-expand-${row.id}`}
                          aria-expanded={isOpen}
                        >
                          <ChevronDown aria-hidden="true" className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-base leading-snug truncate" data-testid={`hf-topic-name-${row.id}`}>
                              {row.topic}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap mt-1">
                              <span className="text-[11px] text-muted-foreground tabular-nums" data-testid={`hf-catalog-${row.id}`}>#{row.catalogNo}</span>
                              {row.category && (
                                <span className="text-[11px] px-2 py-0.5 rounded bg-muted/60 border border-border inline-flex items-center gap-1">
                                  <TIcon className="w-3 h-3" /> {row.category}
                                </span>
                              )}
                            </div>
                          </div>
                          {row.bestFund && (
                            <span
                              className={`hidden sm:inline-flex items-center gap-1 font-medium text-xs px-2 py-0.5 rounded shrink-0 ${bestCol ? "text-white" : "bg-primary text-primary-foreground"}`}
                              style={bestCol ? { background: bestCol } : undefined}
                              data-testid={`hf-best-chip-${row.id}`}
                            >
                              <Award className="w-3 h-3" /> {row.bestFund}
                            </span>
                          )}
                        </button>

                        {/* Expanded body — GENERAL info only */}
                        {isOpen && (
                          <div className="px-4 pb-4 pt-1 border-t border-border animate-in fade-in slide-in-from-top-1 duration-200 space-y-4">
                            {/* Audience — "suitable for" framing (audience field only, no fabricated data) */}
                            {row.audience && (
                              <div className="flex items-start gap-2 text-sm">
                                <Users className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                <span><span className="font-medium text-foreground">מתאים ל / למי מיועד: </span><span className="text-foreground/90">{row.audience}</span></span>
                              </div>
                            )}

                            {/* What can be received — overall range only */}
                            {(row.rangeText || row.benefitSummary) && (
                              <div className="flex items-start gap-2 text-sm">
                                <Wallet className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                <div>
                                  <div className="font-medium text-foreground">מה ניתן לקבל:</div>
                                  <div className="text-foreground/90" data-testid={`hf-range-${row.id}`}>
                                    {row.rangeText || row.benefitSummary}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Basic description of the difference between funds for this topic.
                                General comparison text only — precise per-fund numbers stay for
                                the "מידע המפורט למייל" flow. */}
                            {row.publicSiteText && (
                              <div
                                className="flex items-start gap-2 text-sm rounded-lg border border-border bg-muted/40 px-3 py-2.5"
                                data-testid={`hf-difference-${row.id}`}
                              >
                                <ArrowLeftRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                <div>
                                  <div className="font-medium text-foreground">ההבדל בין הקופות בנושא זה:</div>
                                  <div className="text-foreground/90 leading-relaxed mt-0.5">{row.publicSiteText}</div>
                                </div>
                              </div>
                            )}

                            {/* Which funds offer it — coloured blocks, PLAN names only */}
                            {row.fundsAvailable && row.fundsAvailable.length > 0 && (
                              <div className="space-y-2" data-testid={`hf-funds-${row.id}`}>
                                <div className="text-xs font-medium text-muted-foreground">קופות המציעות את ההטבה:</div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {row.fundsAvailable.map((fund) => {
                                    const col = fundColor(meta, fund.key, fund.name);
                                    return (
                                      <div key={fund.key} className="rounded-lg border border-border overflow-hidden" data-testid={`hf-fund-block-${row.id}-${fund.key}`}>
                                        <div
                                          className={`px-3 py-1.5 text-sm font-semibold ${col ? "text-white" : "bg-primary text-primary-foreground"}`}
                                          style={col ? { background: col } : undefined}
                                        >
                                          {fund.name}
                                        </div>
                                        <div className="px-3 py-2 text-xs text-foreground/90 bg-card">
                                          {fund.plans.length > 0 ? (
                                            <span>מסלולים: {fund.plans.join(" · ")}</span>
                                          ) : (
                                            <span className="text-muted-foreground">קיימת הטבה בתוכנית</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {row.sourceName && (
                              <p className="text-[11px] text-muted-foreground" data-testid={`hf-source-${row.id}`}>
                                מקור: {row.sourceName}
                              </p>
                            )}

                            <div className="pt-1 space-y-3">
                              <p className="text-xs text-muted-foreground">
                                לפירוט המדויק לכל קופה — שיעור ההחזר, הסכום, זמן ההמתנה, המסמכים ואופן הבקשה — מקבלים במייל. ניתן לבחור קבלת מידע, מידע ותזכורת, או טיפול מלא ע\"י צוות בקלות.
                              </p>
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* (1) Detailed info to email — name / phone / home address / email + info·reminder·treatment choice */}
                                <Link href={`/health-fund-service/${row.id}`} data-testid={`button-hf-detailed-email-${row.id}`}>
                                  <Button size="sm" className="group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0">
                                    <Mail className="w-4 h-4 ml-1" />
                                    מעוניינים במידע המפורט למייל
                                    <ChevronLeft className="w-4 h-4 mr-1 transition-transform duration-200 group-hover:-translate-x-0.5" />
                                  </Button>
                                </Link>
                                {/* (2) Interested in switching fund — immediately after */}
                                {row.kind === "fund" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openSwitch({ id: row.id, topic: row.topic })}
                                    data-testid={`button-hf-switch-${row.id}`}
                                    className="group border-primary/40 text-primary transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/5 hover:shadow-sm active:translate-y-0"
                                  >
                                    <ArrowLeftRight className="w-4 h-4 ml-1 transition-transform duration-200 group-hover:scale-110" />
                                    מעוניינים במעבר קופה
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </>
            )}

            {/* Personal-match CTA — soft offer routing to the EXISTING lead form (no App.tsx change) */}
            {results.length > 0 && (
              <Card
                className="p-5 sm:p-6 bg-primary text-primary-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                data-testid="hf-personal-match-cta"
              >
                <div className="flex items-start gap-3">
                  <Sparkles className="w-6 h-6 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-base">לקבלת התאמה אישית</div>
                    <p className="text-sm text-primary-foreground/90 max-w-md mt-0.5">
                      נשלח לכם את הפירוט המלא וההבדלים בין הקופות, לפי ההטבה שמעניינת אתכם. ללא התחייבות.
                    </p>
                  </div>
                </div>
                <Link href={`/health-fund-service/${results[0].id}`} data-testid="button-hf-personal-match">
                  <Button
                    variant="secondary"
                    className="group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 whitespace-nowrap"
                  >
                    לקבלת התאמה אישית <ChevronLeft className="w-4 h-4 mr-1 transition-transform duration-200 group-hover:-translate-x-0.5" />
                  </Button>
                </Link>
              </Card>
            )}

            {/* FAQ accordion — plain formal wording, no visitor-facing prompts */}
            <section className="pt-2" data-testid="hf-faq">
              <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-primary" /> שאלות נפוצות
              </h2>
              <div className="space-y-2">
                {FAQ.map((item, i) => {
                  const open = openFaq === i;
                  return (
                    <Card key={i} className="overflow-hidden" data-testid={`hf-faq-item-${i}`}>
                      <button
                        type="button"
                        onClick={() => setOpenFaq(open ? null : i)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-right hover-elevate"
                        data-testid={`button-hf-faq-${i}`}
                        aria-expanded={open}
                      >
                        <span className="font-medium text-sm text-foreground">{item.q}</span>
                        <ChevronDown aria-hidden="true" className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
                      </button>
                      {open && (
                        <div className="px-4 pb-4 pt-0 text-sm text-foreground/90 border-t border-border animate-in fade-in slide-in-from-top-1 duration-200" data-testid={`hf-faq-answer-${i}`}>
                          <p className="pt-3 leading-relaxed">{item.a}</p>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </section>

            <div className="pt-2">
              <Link href="/" data-testid="link-hf-back">
                <a className="text-sm text-primary inline-flex items-center gap-1 hover-elevate rounded-md px-2 py-1">
                  <ArrowRight className="w-4 h-4" aria-hidden="true" /> חזרה לדף הבית
                </a>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* How to switch a health fund — clear explanation at the bottom of the page */}
      <section className="border-t border-border bg-muted/30" data-testid="hf-how-to-switch">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <button
            type="button"
            onClick={() => setHowToSwitchOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-3 text-right rounded-lg border border-primary/30 bg-primary/5 px-4 py-3.5 hover-elevate transition-colors"
            data-testid="button-hf-how-to-switch"
            aria-expanded={howToSwitchOpen}
          >
            <span className="flex items-center gap-2 font-semibold text-foreground">
              <ListChecks className="w-5 h-5 text-primary" />
              איך עוברים קופת חולים? הסבר ברור בשלבים
            </span>
            <ChevronDown aria-hidden="true" className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-200 ${howToSwitchOpen ? "rotate-180" : ""}`} />
          </button>
          {howToSwitchOpen && (
            <div
              className="mt-3 rounded-lg border border-border bg-card px-4 py-4 text-sm text-foreground/90 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200"
              data-testid="hf-how-to-switch-body"
            >
              <p className="mb-3">
                מעבר בין קופות החולים הוא זכות חוקית הניתנת בחינם, וללא תקופת אכשרה — הכיסוי בקופה החדשה נכנס לתוקף אוטומטית.
              </p>
              <ol className="space-y-2 list-decimal pr-5 marker:text-primary marker:font-semibold">
                <li>בוחרים את קופת החולים החדשה — ניתן להשוות את ההטבות והמסלולים בדף זה.</li>
                <li>מגישים בקשת מעבר — דרך אתר המוסד לביטוח לאומי, באפליקציית הקופה החדשה, או בסניף דואר.</li>
                <li>אין צורך לבטל את החברות בקופה הנוכחית — המעבר מבוצע אוטומטית מול הקופה החדשה.</li>
                <li>המעבר נכנס לתוקף בתחילת אחד החודשים הקרובים, בהתאם למועד הבקשה.</li>
              </ol>
              <p className="mt-3 text-muted-foreground">
                צוות בקלות יכול ללוות אתכם בכל התהליך — פשוט לחצו על “מעוניינים במעבר קופה” שליד כל נושא, ונחזור אליכם.
              </p>
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-border bg-card/50 mt-4" data-testid="hf-footer">
        <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <HealthBrand size={30} />
          <p className="text-[11px] text-muted-foreground text-center sm:text-right">
            הבריאות שלכם · מבית בקלות. מידע להתרשמות בלבד.
          </p>
        </div>
      </footer>

      {/* Fund-switch interest form dialog — name + phone required, rest optional */}
      <Dialog open={switchOpen} onOpenChange={setSwitchOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl" data-testid="hf-switch-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-primary" /> מתעניין/ת במעבר קופת חולים
            </DialogTitle>
            <DialogDescription>
              {switchTopic?.topic ? `בנושא: ${switchTopic.topic}. ` : ""}מלאו פרטים ונחזור אליכם בהקדם. שם וטלפון בלבד חובה.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="sw-name">שם פרטי ומשפחה <span className="text-destructive">*</span></Label>
              <Input id="sw-name" data-testid="input-switch-name" value={switchForm.fullName}
                onChange={(e) => setSwitchForm({ ...switchForm, fullName: e.target.value })} placeholder="למשל: ישראל ישראלי" autoComplete="name" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sw-phone">טלפון <span className="text-destructive">*</span></Label>
              <Input id="sw-phone" data-testid="input-switch-phone" type="tel" inputMode="tel" value={switchForm.phone}
                onChange={(e) => setSwitchForm({ ...switchForm, phone: e.target.value })} placeholder="05X-XXXXXXX" autoComplete="tel" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sw-email">מייל</Label>
              <Input id="sw-email" data-testid="input-switch-email" type="email" value={switchForm.email}
                onChange={(e) => setSwitchForm({ ...switchForm, email: e.target.value })} placeholder="אופציונלי" autoComplete="email" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sw-id">תעודת זהות</Label>
              <Input id="sw-id" data-testid="input-switch-id" inputMode="numeric" value={switchForm.idNumber}
                onChange={(e) => setSwitchForm({ ...switchForm, idNumber: e.target.value })} placeholder="אופציונלי" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sw-city">עיר מגורים</Label>
              <Input id="sw-city" data-testid="input-switch-city" value={switchForm.city}
                onChange={(e) => setSwitchForm({ ...switchForm, city: e.target.value })} placeholder="אופציונלי" autoComplete="address-level2" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sw-people">מספר נפשות</Label>
              <Input id="sw-people" data-testid="input-switch-people" inputMode="numeric" value={switchForm.peopleCount}
                onChange={(e) => setSwitchForm({ ...switchForm, peopleCount: e.target.value })} placeholder="אופציונלי" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sw-current">קופה נוכחית</Label>
              <select id="sw-current" data-testid="select-switch-current" value={switchForm.currentFund}
                onChange={(e) => setSwitchForm({ ...switchForm, currentFund: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">אופציונלי</option>
                {SWITCH_FUND_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="sw-target">קופה שמעוניינים לעבור אליה</Label>
              <select id="sw-target" data-testid="select-switch-target" value={switchForm.targetFund}
                onChange={(e) => setSwitchForm({ ...switchForm, targetFund: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">אופציונלי</option>
                {SWITCH_TARGET_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="sw-supp">ביטוח בריאות משלים נוכחי (אם יש)</Label>
              <Input id="sw-supp" data-testid="input-switch-supp" value={switchForm.currentSupplemental}
                onChange={(e) => setSwitchForm({ ...switchForm, currentSupplemental: e.target.value })} placeholder="למשל: מושלם זהב / מכבי שלי (אופציונלי)" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="sw-note">הערה</Label>
              <Textarea id="sw-note" data-testid="input-switch-note" rows={2} value={switchForm.note}
                onChange={(e) => setSwitchForm({ ...switchForm, note: e.target.value })} placeholder="אופציונלי" />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setSwitchOpen(false)} data-testid="button-switch-cancel">ביטול</Button>
            <Button onClick={submitSwitch} disabled={switchSubmitting} data-testid="button-switch-submit"
              className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0">
              {switchSubmitting ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> שולח...</> : "שלחו פנייה"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
