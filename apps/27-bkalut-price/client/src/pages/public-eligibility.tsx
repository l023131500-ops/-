import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { PublicRightRow, MetaResponse } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  Search,
  ArrowLeft,
  ArrowRight,
  ScrollText,
  Tag,
  CheckCircle2,
  Sparkles,
  X,
  Target,
  ChevronRight,
  Filter,
} from "lucide-react";

const CONTACT_PHONE = "02-3131500";
const CONTACT_EMAIL = "l023131500@gmail.com";

interface PublicParamsTopicsResponse {
  enabled: boolean;
  items: Array<{
    id: number;
    title: string;
    category: string;
    subCategory: string;
    description: string;
    profileConditions: string[];
    tags: string[];
  }>;
}

interface CatalogSettings {
  exactStateSearchEnabled: boolean;
}

function searchableText(r: PublicRightRow): string {
  return [r.topic, r.category, r.subCategory, r.audience, r.publicSiteText, r.whatReceived]
    .filter(Boolean)
    .join(" \n ")
    .toLowerCase();
}

export default function PublicEligibility() {
  const { data: rows, isLoading } = useQuery<PublicRightRow[]>({ queryKey: ["/api/public/rights"] });
  const { data: meta } = useQuery<MetaResponse>({ queryKey: ["/api/meta"] });
  const { data: settings } = useQuery<CatalogSettings>({ queryKey: ["/api/public/catalog-settings"] });

  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [exactStateOpen, setExactStateOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const { data: paramsTopics } = useQuery<PublicParamsTopicsResponse>({
    queryKey: ["/api/public/params-topics"],
    enabled: exactStateOpen,
  });

  const categories = useMemo(() => {
    if (meta?.rightsCategories?.length) return meta.rightsCategories;
    if (!rows) return [];
    return Array.from(new Set(rows.map((r) => r.category).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, "he"),
    );
  }, [meta, rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const ql = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (category && r.category !== category) return false;
      if (ql && !searchableText(r).includes(ql)) return false;
      return true;
    });
  }, [rows, q, category]);

  const hasSelection = q.trim().length > 0 || category !== null;
  const visible = filtered.slice(0, hasSelection ? 60 : 24);

  function clearSelection() {
    setQ("");
    setCategory(null);
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" dir="rtl">
      <header className="border-b border-border bg-sidebar text-sidebar-foreground sticky top-0 z-30">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/" data-testid="link-home-public" className="flex items-center -mr-2 px-2 py-1">
            <Logo size={28} showWordmark={false} />
            <span className="font-bold text-base mr-2">בקלות</span>
          </Link>
          <Link
            href="/"
            data-testid="link-back-to-home"
            className="inline-flex items-center gap-1 text-[13px] hover-elevate rounded-md px-2 py-1"
          >
            <ArrowRight className="w-4 h-4" />
            חזרה לאתר
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-primary/5 to-background border-b border-border">
          <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-8 md:py-12 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-3">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>בדיקת זכאות בקליק</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold leading-tight tracking-tight">
              קטלוג הזכויות וההטבות הציבורי
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-3 max-w-2xl mx-auto">
              חיפוש לפי נושא או קטגוריה, מידע ראשוני ברור, ובדיקת זכאות בקליק לכל נושא.
            </p>
          </div>
        </section>

        {/* Two action squares: profile-based + exact-state */}
        <section className="border-b border-border">
          <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-6 grid md:grid-cols-2 gap-4" data-testid="actions-grid">
            <Link href="/potential" data-testid="link-potential-scanner" className="block group">
              <Card className="p-5 rounded-2xl border-2 border-primary/40 hover:border-primary bg-card hover-elevate transition-all h-full">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold leading-snug">
                      בדיקת זכויות לפי פרופיל
                    </h2>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1 leading-relaxed">
                      ענו על שאלות קצרות על הפרופיל האישי — נציע מה שווה לבדוק.
                    </p>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-primary shrink-0 mt-1 transition-transform group-hover:-translate-x-0.5" />
                </div>
              </Card>
            </Link>

            {settings?.exactStateSearchEnabled !== false && (
              <button
                type="button"
                onClick={() => setExactStateOpen(true)}
                className="text-right block group"
                data-testid="button-exact-state-search"
              >
                <Card className="p-5 rounded-2xl border-2 border-[hsl(190_55%_50%)] hover:border-[hsl(190_70%_40%)] bg-card hover-elevate transition-all h-full">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-12 h-12 rounded-full bg-[hsl(190_55%_92%)] text-[hsl(190_70%_30%)] flex items-center justify-center">
                      <Target className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-bold leading-snug">
                        חיפוש לפי מצב מדויק
                      </h2>
                      <p className="text-xs md:text-sm text-muted-foreground mt-1 leading-relaxed">
                        מצאו מצבים והטבות לפי תנאים ספציפיים מתוך מאגר הנושאים שלנו.
                      </p>
                    </div>
                    <ArrowLeft className="w-4 h-4 text-[hsl(190_70%_30%)] shrink-0 mt-1 transition-transform group-hover:-translate-x-0.5" />
                  </div>
                </Card>
              </button>
            )}
          </div>
        </section>

        {/* Sticky selection banner (desktop top + mobile) */}
        {hasSelection && (
          <div className="sticky top-14 z-20 border-b border-border bg-primary/10 backdrop-blur" data-testid="selection-banner">
            <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs md:text-sm">
                <Filter className="w-4 h-4 text-primary" />
                <span className="font-semibold">סינון פעיל:</span>
                {category && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 text-primary px-2 py-0.5 text-[11px] md:text-xs font-medium">
                    קטגוריה: {category}
                  </span>
                )}
                {q.trim() && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 text-primary px-2 py-0.5 text-[11px] md:text-xs font-medium">
                    חיפוש: “{q.trim()}”
                  </span>
                )}
                <span className="text-muted-foreground mr-1">· {filtered.length} תוצאות</span>
              </div>
              <Button size="sm" variant="ghost" onClick={clearSelection} data-testid="button-clear-selection">
                <X className="w-3.5 h-3.5 ml-1" />
                ניקוי
              </Button>
            </div>
          </div>
        )}

        {/* Topics sidebar + results layout */}
        <section className="border-b border-border">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 md:py-8 grid md:grid-cols-[260px_1fr] gap-5">
            {/* Sidebar (desktop) */}
            <aside className="hidden md:block sticky top-28 self-start" data-testid="sidebar-filters">
              <Card className="p-4 border border-card-border bg-card">
                <div className="mb-3">
                  <h3 className="text-sm font-bold mb-1">חיפוש מהיר</h3>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="מילת מפתח..."
                      className="pr-9 h-9 text-sm"
                      data-testid="input-public-search"
                    />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold mb-2 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" />
                    קטגוריות
                  </h3>
                  {isLoading ? (
                    <div className="space-y-1.5">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-7 w-full rounded-md" />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto pl-1">
                      <button
                        type="button"
                        onClick={() => setCategory(null)}
                        className={`text-right px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                          category === null
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card hover-elevate border-border text-foreground/85"
                        }`}
                        data-testid="chip-cat-all"
                      >
                        הכל
                      </button>
                      {categories.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCategory(c === category ? null : c)}
                          className={`text-right px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                            category === c
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card hover-elevate border-border text-foreground/85"
                          }`}
                          data-testid={`chip-cat-${c}`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </aside>

            {/* Mobile filter toggle */}
            <div className="md:hidden -mt-2 mb-1 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMobileFiltersOpen((v) => !v)}
                data-testid="button-mobile-filters"
              >
                <Filter className="w-3.5 h-3.5 ml-1" />
                סינון ({categories.length} קטגוריות)
              </Button>
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="חיפוש..."
                  className="pr-9 h-9 text-sm"
                />
              </div>
            </div>

            {mobileFiltersOpen && (
              <div className="md:hidden -mt-2">
                <Card className="p-3 border border-card-border bg-card">
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => { setCategory(null); setMobileFiltersOpen(false); }}
                      className={`px-2.5 py-1 rounded-md text-[11px] border ${
                        category === null ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"
                      }`}
                    >
                      הכל
                    </button>
                    {categories.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => { setCategory(c === category ? null : c); setMobileFiltersOpen(false); }}
                        className={`px-2.5 py-1 rounded-md text-[11px] border ${
                          category === c ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* Results */}
            <div data-testid="topics-results">
              <div className="flex items-end justify-between flex-wrap gap-3 mb-3">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold">נושאים לבדיקה</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {hasSelection
                      ? `${filtered.length} תוצאות תואמות`
                      : `${meta?.rightsCount ?? rows?.length ?? 0} נושאים זמינים`}
                  </p>
                </div>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-xl" />
                  ))}
                </div>
              ) : visible.length === 0 ? (
                <Card className="p-6 text-center text-sm text-muted-foreground">
                  לא נמצאו נושאים תואמים. נסו מילה אחרת או קטגוריה אחרת.
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3" data-testid="results-list">
                  {visible.map((r) => {
                    const snippet = (r.publicSiteText || r.whatReceived || "").trim();
                    return (
                      <Link
                        key={r.id}
                        href={`/p/topic/${r.id}`}
                        data-testid={`card-topic-${r.id}`}
                        className="block group"
                      >
                        <Card className="p-4 hover-elevate h-full flex flex-col gap-2 rounded-xl border border-card-border bg-card transition-shadow group-hover:shadow-md">
                          <div className="flex items-center gap-2 flex-wrap">
                            {r.category && (
                              <span className="rounded-md font-medium text-[10px] px-2 py-0.5 bg-primary/10 text-primary border border-primary/20">
                                {r.category}
                              </span>
                            )}
                            {r.subCategory && (
                              <span className="text-[10px] text-muted-foreground truncate">
                                {r.subCategory}
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm md:text-base font-semibold leading-snug text-foreground">
                            {r.topic}
                          </h3>
                          {snippet && (
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {snippet.slice(0, 180)}
                            </p>
                          )}
                          <div className="mt-auto pt-1.5 inline-flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              בדיקת זכאות
                            </span>
                            <ArrowLeft className="w-3.5 h-3.5 text-primary transition-transform group-hover:-translate-x-0.5" />
                          </div>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              )}
              {filtered.length > visible.length && (
                <p className="text-xs text-muted-foreground mt-4 text-center">
                  מציג {visible.length} מתוך {filtered.length} תוצאות.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-8 text-center">
            <h2 className="text-xl md:text-2xl font-bold">לא בטוחים מה מגיע לכם?</h2>
            <p className="text-muted-foreground text-sm mt-2">
              חפשו נושא ולחצו על “בדיקת זכאות” — נדריך אתכם שלב-שלב.
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              לכל שאלה — {CONTACT_PHONE} · {CONTACT_EMAIL}
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="text-center md:text-right">
            ארגון בקלות · {CONTACT_PHONE} · {CONTACT_EMAIL}
            <div className="opacity-70 mt-1">המידע באתר ראשוני בלבד — לבדיקה מלאה לחצו על “בדיקת זכאות”.</div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/terms"
              className="px-2 py-1 rounded-md hover-elevate inline-flex items-center gap-1"
              data-testid="footer-terms"
            >
              <ScrollText className="w-3.5 h-3.5" />
              תנאים
            </Link>
          </div>
        </div>
      </footer>

      {/* Exact-state search modal */}
      {exactStateOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3"
          onClick={() => setExactStateOpen(false)}
          data-testid="exact-state-modal"
        >
          <Card
            className="w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col bg-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b p-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-[hsl(190_70%_30%)]" />
                  חיפוש לפי מצב מדויק
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  מצבים ותנאים ספציפיים. לחצו על מצב כדי לראות נושאים קרובים בקטלוג.
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setExactStateOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {!paramsTopics ? (
                <p className="text-sm text-muted-foreground text-center py-8">טוען רשימת מצבים...</p>
              ) : !paramsTopics.enabled ? (
                <p className="text-sm text-muted-foreground text-center py-8">החיפוש לפי מצב מדויק אינו פעיל כעת.</p>
              ) : paramsTopics.items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">אין מצבים זמינים כרגע.</p>
              ) : (
                paramsTopics.items.map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => {
                      setQ(it.title);
                      setCategory(it.category || null);
                      setExactStateOpen(false);
                    }}
                    className="block w-full text-right rounded-md border border-border bg-muted/20 hover:bg-primary/5 hover:border-primary/30 p-3 transition-colors"
                    data-testid={`exact-state-item-${it.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{it.title}</p>
                        {it.category && (
                          <p className="text-[11px] text-primary mt-0.5">
                            {it.category}{it.subCategory ? ` · ${it.subCategory}` : ""}
                          </p>
                        )}
                        {it.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                            {it.description}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1 rotate-180" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
