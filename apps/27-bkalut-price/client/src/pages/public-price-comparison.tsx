import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Logo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";
import { API_BASE } from "@/lib/queryClient";
import { getPublicOrigin } from "@/lib/utils";
import { Search, Tag, Store, ArrowRight, FileDown, Share2, Sparkles, SlidersHorizontal, X, Send, ShoppingCart, Plus, Trash2, ScanBarcode } from "lucide-react";
import { BarcodeScannerDialog, isBarcodeScanSupported } from "@/components/barcode-scanner-dialog";

// The published pplx.app sandbox auto-pauses when idle; the first requests after
// it resumes return 503 for a few seconds. Retry a few times so the page loads
// reliably on a cold start instead of showing an empty state.
async function fetchApi(path: string, init?: RequestInit, retries = 4): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    const res = await fetch(`${API_BASE}${path}`, init).catch(() => null);
    if (res && res.status !== 503) return res;
    if (i < retries) await new Promise((r) => setTimeout(r, 1500 + i * 1000));
  }
  return fetch(`${API_BASE}${path}`, init);
}

type PcChainKind = "regulatory" | "voluntary";
interface PcCategory { id: number; name: string }
interface PcStoreOpt { id: number; name: string; city: string | null }
interface PcOffer {
  storeId: number; storeName: string; chainId: string | null; chainKind: PcChainKind;
  city: string | null; neighborhood: string | null;
  price: number; unitPrice: number | null; onSale: boolean; saleNote: string | null; updatedAt: string | null;
}
interface PcSearchRow {
  product: { id: number; name: string; brand: string | null; unit: string | null; barcode: string | null; imageUrl: string | null };
  categoryName: string | null;
  chainCount: number;
  cheapestPrice: number | null;
  cheapestStore: string | null;
  cheapestChainKind: PcChainKind | null;
  dearestPrice: number | null;
  spreadPct: number | null;
  kinds: PcChainKind[];
  offers: PcOffer[];
}
interface PcPromotion { id: number; title: string; description: string | null }
interface PcFilters {
  categories: PcCategory[];
  cities: string[];
  brands: string[];
  stores: PcStoreOpt[];
}
interface PcRecommendation {
  hasData: boolean;
  message: string;
  product?: { id: number; name: string };
  bestPrice?: number;
  bestStore?: string;
  savings?: number;
  savingsPct?: number;
  alternatives?: Array<{ name: string; bestPrice: number | null; bestStore: string | null }>;
}
interface PcPublicSettings { enabled: boolean; title: string; subtitle: string; contactText: string }
interface PcPublicMeta {
  lastUpdatedAt: string | null;
  activeSources: number;
  productCount: number;
  storeCount: number;
  hasRealData: boolean;
  showSampleData: boolean;
  merchantPortalEnabled?: boolean;
  hasSupplierData?: boolean;
  supplierPriceCount?: number;
}

const fmt = (n: number) => `₪${n.toFixed(2)}`;

const SAVINGS_STORAGE_KEY = "mechiron-savings-total";
const SHOPPING_LIST_KEY = "mechiron-shopping-list";

interface ListItem {
  productId: number;
  name: string;
  cheapestPrice: number | null;
  offers: PcOffer[];
}

function loadShoppingList(): ListItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SHOPPING_LIST_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveShoppingList(list: ListItem[]) {
  window.localStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(list));
}

interface StoreTotal {
  storeId: number;
  storeName: string;
  total: number;
  coversAll: boolean;
  itemsCovered: number;
}

function computeStoreTotals(list: ListItem[]): StoreTotal[] {
  const byStore = new Map<number, StoreTotal>();
  for (const item of list) {
    for (const offer of item.offers) {
      const existing = byStore.get(offer.storeId);
      if (existing) {
        existing.total += offer.price;
        existing.itemsCovered += 1;
      } else {
        byStore.set(offer.storeId, { storeId: offer.storeId, storeName: offer.storeName, total: offer.price, itemsCovered: 1, coversAll: false });
      }
    }
  }
  const totals = Array.from(byStore.values());
  for (const t of totals) t.coversAll = t.itemsCovered === list.length;
  return totals.sort((a, b) => (a.coversAll === b.coversAll ? a.total - b.total : a.coversAll ? -1 : 1));
}

function optimalSplitTotal(list: ListItem[]): number {
  return list.reduce((sum, item) => sum + (item.cheapestPrice ?? 0), 0);
}

function loadSavedTotal(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(SAVINGS_STORAGE_KEY);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function addToSavedTotal(amount: number): number {
  const next = loadSavedTotal() + amount;
  window.localStorage.setItem(SAVINGS_STORAGE_KEY, String(next));
  return next;
}

function formatUpdatedAt(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("he-IL", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(d);
}

interface FilterState {
  q: string;
  categoryId: number | null;
  city: string;
  brand: string;
  storeId: string;
  minPrice: string;
  maxPrice: string;
  promoOnly: boolean;
  minChains: string;
  kind: "" | PcChainKind;
  sort: "price" | "unitPrice" | "name" | "updated";
}

const emptyFilters: FilterState = {
  q: "", categoryId: null, city: "", brand: "", storeId: "", minPrice: "", maxPrice: "", promoOnly: false, minChains: "", kind: "", sort: "price",
};

const KIND_LABEL: Record<PcChainKind, string> = { regulatory: "רשתות מפוקחות", voluntary: "רשתות מצטרפות" };

export default function PublicPriceComparison() {
  const { toast } = useToast();
  const [meta, setMeta] = useState<PcFilters>({ categories: [], cities: [], brands: [], stores: [] });
  const [results, setResults] = useState<PcSearchRow[]>([]);
  const [promotions, setPromotions] = useState<PcPromotion[]>([]);
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<PcPublicSettings | null>(null);
  const [pcMeta, setPcMeta] = useState<PcPublicMeta | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [recommendation, setRecommendation] = useState<PcRecommendation | null>(null);
  const [recLoading, setRecLoading] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savedTotal, setSavedTotal] = useState(() => loadSavedTotal());
  const [shoppingList, setShoppingList] = useState<ListItem[]>(() => loadShoppingList());
  const [showList, setShowList] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanSupported] = useState(() => isBarcodeScanSupported());
  const emptySubmission = { merchantName: "", merchantContact: "", storeName: "", city: "", productName: "", brand: "", unit: "", barcode: "", price: "", note: "" };
  const [submission, setSubmission] = useState({ ...emptySubmission });

  async function submitPrice() {
    if (!submission.merchantName.trim() || !submission.storeName.trim() || !submission.productName.trim() || !submission.price.trim()) {
      toast({ title: "חסרים שדות חובה", description: "שם העסק, שם החנות, שם המוצר ומחיר.", variant: "destructive" });
      return;
    }
    const priceNum = Number(submission.price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      toast({ title: "מחיר לא תקין", description: "יש להזין מחיר גדול מאפס.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/pc/public/submit-price`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...submission, price: priceNum }),
      });
      const d = await res.json();
      if (!res.ok) { toast({ title: "ההגשה נכשלה", description: d?.message, variant: "destructive" }); return; }
      toast({ title: "ההצעה התקבלה", description: d?.message });
      setSubmission({ ...emptySubmission });
      setShowSubmit(false);
    } catch {
      toast({ title: "ההגשה נכשלה", description: "נסו שוב מאוחר יותר.", variant: "destructive" });
    } finally { setSubmitting(false); }
  }

  function buildParams(f: FilterState): URLSearchParams {
    const p = new URLSearchParams();
    if (f.q.trim()) p.set("q", f.q.trim());
    if (f.categoryId) p.set("categoryId", String(f.categoryId));
    if (f.city.trim()) p.set("city", f.city.trim());
    if (f.brand.trim()) p.set("brand", f.brand.trim());
    if (f.storeId) p.set("storeId", f.storeId);
    if (f.minPrice.trim()) p.set("minPrice", f.minPrice.trim());
    if (f.maxPrice.trim()) p.set("maxPrice", f.maxPrice.trim());
    if (f.promoOnly) p.set("promoOnly", "1");
    if (f.minChains.trim()) p.set("minChains", f.minChains.trim());
    if (f.kind) p.set("kind", f.kind);
    if (f.sort) p.set("sort", f.sort);
    return p;
  }

  async function runSearch(f: FilterState) {
    setLoading(true);
    try {
      const res = await fetchApi(`/api/pc/public/catalog?${buildParams(f).toString()}`);
      if (res.status === 403) { setDisabled(true); setResults([]); return; }
      const data = await res.json();
      setResults(Array.isArray(data.results) ? data.results : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Load sequentially, not in parallel: the single-threaded sandbox can only
    // serve one request at a time on a cold resume, so a parallel burst causes
    // 503s. Fetch light metadata first, then the (heavier) catalog last.
    (async () => {
      let metaFailed = false;
      try {
        const s: PcPublicSettings = await fetchApi(`/api/pc/public/settings`).then((r) => r.json());
        setSettings(s);
        if (s && s.enabled === false) { setDisabled(true); setLoading(false); return; }
        await fetchApi(`/api/pc/public/meta`).then((r) => r.json()).then((d: PcPublicMeta) => setPcMeta(d)).catch(() => { metaFailed = true; });
        await fetchApi(`/api/pc/public/filters`).then((r) => r.json()).then((d) => setMeta(d)).catch(() => { metaFailed = true; });
        await fetchApi(`/api/pc/public/promotions`).then((r) => r.json()).then((d) => setPromotions(Array.isArray(d) ? d : [])).catch(() => setPromotions([]));
        if (metaFailed) {
          toast({ title: "חלק מהנתונים לא נטענו", description: "אפשרויות הסינון עשויות להיות חסרות. נסו לרענן את הדף." });
        }
        await runSearch(emptyFilters);
      } catch {
        await runSearch(emptyFilters);
      }
    })();
  }, []);

  async function askAssistant() {
    setRecLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/pc/public/recommend?${buildParams(filters).toString()}`);
      const data: PcRecommendation = await res.json();
      setRecommendation(data);
      if (data.hasData && typeof data.savings === "number" && data.savings > 0) {
        setSavedTotal(addToSavedTotal(data.savings));
      }
    } catch {
      setRecommendation({ hasData: false, message: "אירעה שגיאה. נסו שוב מאוחר יותר." });
    } finally {
      setRecLoading(false);
    }
  }

  function isInList(productId: number): boolean {
    return shoppingList.some((i) => i.productId === productId);
  }

  function addToList(row: PcSearchRow) {
    if (isInList(row.product.id)) return;
    const next = [...shoppingList, { productId: row.product.id, name: row.product.name, cheapestPrice: row.cheapestPrice, offers: row.offers }];
    setShoppingList(next);
    saveShoppingList(next);
    toast({ title: "נוסף לרשימת הקניות", description: row.product.name });
  }

  function removeFromList(productId: number) {
    const next = shoppingList.filter((i) => i.productId !== productId);
    setShoppingList(next);
    saveShoppingList(next);
  }

  function openReport() {
    const p = buildParams(filters);
    p.set("print", "1");
    window.open(`${API_BASE}/api/pc/public/report?${p.toString()}`, "_blank");
  }

  function shareLink() {
    const p = buildParams(filters);
    const url = `${getPublicOrigin()}/#/price-comparison${p.toString() ? `?${p.toString()}` : ""}`;
    if (navigator.share) {
      navigator.share({ title: settings?.title || "השוואת מחירים", url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(
        () => toast({ title: "הקישור הועתק" }),
        () => toast({ title: "העתיקו ידנית", description: url }),
      );
    }
  }

  function onBarcodeDetected(code: string) {
    const n = update({ q: code });
    runSearch(n);
    toast({ title: "ברקוד נסרק", description: code });
  }

  function update(patch: Partial<FilterState>) {
    const next = { ...filters, ...patch };
    setFilters(next);
    return next;
  }

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (filters.categoryId) c++;
    if (filters.city) c++;
    if (filters.brand) c++;
    if (filters.storeId) c++;
    if (filters.minPrice) c++;
    if (filters.maxPrice) c++;
    if (filters.promoOnly) c++;
    if (filters.minChains) c++;
    if (filters.kind) c++;
    return c;
  }, [filters]);

  if (disabled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4" dir="rtl" data-testid="page-pc-disabled">
        <Card className="p-8 max-w-md text-center space-y-3">
          <Store className="w-10 h-10 text-muted-foreground mx-auto" />
          <h1 className="text-lg font-bold">האתר אינו זמין כעת</h1>
          <p className="text-sm text-muted-foreground">שירות השוואת המחירים אינו פעיל כרגע. נסו שוב מאוחר יותר.</p>
          <Link href="/" data-testid="link-pc-disabled-home">
            <a className="text-sm text-primary inline-flex items-center gap-1 justify-center">
              <ArrowRight className="w-4 h-4" /> חזרה לדף הבית
            </a>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl" data-testid="page-public-price-comparison">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <Link href="/" data-testid="link-pc-home">
            <a className="flex items-center gap-2"><Logo className="h-8 w-auto" /></a>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">השוואת מחירים</span>
            <a
              href="/subscribe?app=mechiron"
              data-testid="nav-pc-pricing"
              className="text-sm hover-elevate rounded-md px-2 py-1"
            >
              מחירון
            </a>
          </div>
        </div>
      </header>

      <main id="main-content" className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <section className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-pc-title">
            {settings?.title || "השוואת מחירים — חוסכים בקלות"}
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            {settings?.subtitle || "השוו מחירים של מוצרים נפוצים בין חנויות וסניפים, ומצאו היכן משתלם לקנות."}
          </p>

          {/* Data freshness / source metadata — DB-driven, honest about origin. */}
          {pcMeta && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1" data-testid="pc-data-meta">
              {formatUpdatedAt(pcMeta.lastUpdatedAt) ? (
                <span>עודכן לאחרונה: {formatUpdatedAt(pcMeta.lastUpdatedAt)}</span>
              ) : (
                <span>הנתונים מתעדכנים אוטומטית כל בוקר</span>
              )}
              <span>מקורות פעילים: {pcMeta.activeSources}</span>
              <span>מוצרים: {pcMeta.productCount.toLocaleString("he-IL")}</span>
              <span>חנויות: {pcMeta.storeCount.toLocaleString("he-IL")}</span>
              {pcMeta.showSampleData && (
                <span className="text-amber-600 dark:text-amber-500">כולל נתוני דוגמה (לתצוגה בלבד)</span>
              )}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground/80">
            הנתונים מבוססים על קובצי שקיפות מחירים שמפרסמות הרשתות לפי חוק. המחירים נכונים למועד העדכון האחרון.
          </p>

          {savedTotal > 0 && (
            <div
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20"
              data-testid="pc-savings-tracker"
            >
              <Sparkles className="w-3.5 h-3.5" /> חסכת {fmt(savedTotal)} עד כה בהשוואות שלך במכשיר הזה
            </div>
          )}
        </section>

        {/* Search bar + actions */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-muted-foreground" />
              <Input
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && runSearch(filters)}
                placeholder="חיפוש מוצר, מותג או ברקוד"
                className="pr-9"
                data-testid="input-pc-search"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => runSearch(filters)} data-testid="button-pc-search"><Search className="w-4 h-4 ml-1" /> חיפוש</Button>
              <Button variant="outline" onClick={() => setShowFilters((v) => !v)} data-testid="button-pc-toggle-filters">
                <SlidersHorizontal className="w-4 h-4 ml-1" /> סינון{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </Button>
              {scanSupported && (
                <Button variant="outline" onClick={() => setShowScanner(true)} data-testid="button-pc-scan-barcode">
                  <ScanBarcode className="w-4 h-4 ml-1" /> סריקת ברקוד
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={askAssistant} disabled={recLoading} data-testid="button-pc-assistant">
              <Sparkles className="w-4 h-4 ml-1" /> {recLoading ? "מחשב…" : "עוזר חיסכון חכם"}
            </Button>
            <Button variant="outline" size="sm" onClick={openReport} data-testid="button-pc-report"><FileDown className="w-4 h-4 ml-1" /> הורדת דוח PDF</Button>
            <Button variant="outline" size="sm" onClick={shareLink} data-testid="button-pc-share"><Share2 className="w-4 h-4 ml-1" /> שיתוף</Button>
            <Button variant="outline" size="sm" onClick={() => setShowList((v) => !v)} data-testid="button-pc-toggle-list">
              <ShoppingCart className="w-4 h-4 ml-1" /> רשימת קניות{shoppingList.length > 0 ? ` (${shoppingList.length})` : ""}
            </Button>
          </div>
        </section>

        {/* Smart shopping list — client-side, built from products already added.
            Shows which single store covers the whole list cheapest, vs. the
            "optimal split" (each item at its own cheapest store). */}
        {showList && (
          <Card className="p-4 space-y-3" data-testid="pc-shopping-list">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold flex items-center gap-1"><ShoppingCart className="w-4 h-4" /> רשימת הקניות שלי</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowList(false)}><X className="w-4 h-4" /></Button>
            </div>
            {shoppingList.length === 0 ? (
              <p className="text-sm text-muted-foreground">הרשימה ריקה. לחצו על "הוספה לרשימה" ליד מוצר כדי להתחיל.</p>
            ) : (
              <>
                <ul className="space-y-1.5">
                  {shoppingList.map((item) => (
                    <li key={item.productId} className="flex items-center justify-between gap-2 text-sm" data-testid={`pc-list-item-${item.productId}`}>
                      <span className="truncate">{item.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {item.cheapestPrice != null && <span className="tabular-nums text-muted-foreground">{fmt(item.cheapestPrice)}</span>}
                        <Button variant="ghost" size="icon" onClick={() => removeFromList(item.productId)} data-testid={`button-pc-list-remove-${item.productId}`}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="pt-2 border-t border-border space-y-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">סה"כ בפיצול אופטימלי (כל מוצר בזול ביותר):</span>
                    <span className="font-semibold tabular-nums" data-testid="pc-list-optimal-total">{fmt(optimalSplitTotal(shoppingList))}</span>
                  </div>
                  {(() => {
                    const totals = computeStoreTotals(shoppingList);
                    const complete = totals.find((t) => t.coversAll);
                    return complete ? (
                      <div className="flex items-center justify-between" data-testid="pc-list-best-store">
                        <span className="text-muted-foreground">הכי משתלם לקנות הכל בחנות אחת:</span>
                        <span className="font-semibold tabular-nums">{complete.storeName} · {fmt(complete.total)}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground" data-testid="pc-list-no-single-store">אין חנות אחת שמוכרת את כל הפריטים ברשימה — מוצג רק הפיצול האופטימלי.</p>
                    );
                  })()}
                </div>
              </>
            )}
          </Card>
        )}

        {/* Advanced filters panel */}
        {showFilters && (
          <Card className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="pc-filters-panel">
            <select className="border border-border rounded-md px-2 py-2 text-sm bg-background" value={filters.city}
              onChange={(e) => { const n = update({ city: e.target.value }); runSearch(n); }} data-testid="select-pc-city" aria-label="עיר">
              <option value="">כל הערים</option>
              {meta.cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="border border-border rounded-md px-2 py-2 text-sm bg-background" value={filters.brand}
              onChange={(e) => { const n = update({ brand: e.target.value }); runSearch(n); }} data-testid="select-pc-brand" aria-label="מותג">
              <option value="">כל המותגים</option>
              {meta.brands.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <select className="border border-border rounded-md px-2 py-2 text-sm bg-background" value={filters.storeId}
              onChange={(e) => { const n = update({ storeId: e.target.value }); runSearch(n); }} data-testid="select-pc-store" aria-label="חנות">
              <option value="">כל החנויות</option>
              {meta.stores.map((s) => <option key={s.id} value={s.id}>{s.name}{s.city ? ` · ${s.city}` : ""}</option>)}
            </select>
            <Input type="number" inputMode="decimal" placeholder="מחיר מינימום" value={filters.minPrice}
              onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && runSearch(filters)} data-testid="input-pc-min-price" />
            <Input type="number" inputMode="decimal" placeholder="מחיר מקסימום" value={filters.maxPrice}
              onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && runSearch(filters)} data-testid="input-pc-max-price" />
            <select className="border border-border rounded-md px-2 py-2 text-sm bg-background" value={filters.minChains}
              onChange={(e) => { const n = update({ minChains: e.target.value }); runSearch(n); }} data-testid="select-pc-min-chains" aria-label="מספר רשתות מינימלי">
              <option value="">כל מספר הרשתות</option>
              <option value="2">נמכר ב-2 רשתות ומעלה</option>
              <option value="3">נמכר ב-3 רשתות ומעלה</option>
              <option value="4">נמכר ב-4 רשתות ומעלה</option>
            </select>
            <select className="border border-border rounded-md px-2 py-2 text-sm bg-background" value={filters.kind}
              onChange={(e) => { const n = update({ kind: e.target.value as FilterState["kind"] }); runSearch(n); }} data-testid="select-pc-kind" aria-label="סוג רשת">
              <option value="">כל סוגי הרשתות</option>
              <option value="regulatory">{KIND_LABEL.regulatory}</option>
              <option value="voluntary">{KIND_LABEL.voluntary}</option>
            </select>
            <select className="border border-border rounded-md px-2 py-2 text-sm bg-background" value={filters.sort}
              onChange={(e) => { const n = update({ sort: e.target.value as FilterState["sort"] }); runSearch(n); }} data-testid="select-pc-sort" aria-label="מיון">
              <option value="price">מיון: מחיר נמוך</option>
              <option value="unitPrice">מיון: מחיר ליחידה</option>
              <option value="name">מיון: שם</option>
              <option value="updated">מיון: עודכן לאחרונה</option>
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={filters.promoOnly}
                onChange={(e) => { const n = update({ promoOnly: e.target.checked }); runSearch(n); }} data-testid="checkbox-pc-promo-only" />
              מבצעים בלבד
            </label>
            <Button variant="ghost" size="sm" className="justify-self-start" onClick={() => { setFilters(emptyFilters); runSearch(emptyFilters); }} data-testid="button-pc-clear-filters">
              <X className="w-4 h-4 ml-1" /> ניקוי סינון
            </Button>
          </Card>
        )}

        {/* AI assistant result */}
        {recommendation && (
          <Card className="p-4 border-primary/30 bg-primary/5 space-y-2" data-testid="pc-assistant-result">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold flex items-center gap-1"><Sparkles className="w-4 h-4 text-primary" /> המלצת חיסכון</h2>
              <Button variant="ghost" size="icon" onClick={() => setRecommendation(null)}><X className="w-4 h-4" /></Button>
            </div>
            <p className="text-sm">{recommendation.message}</p>
            {recommendation.hasData && recommendation.alternatives && recommendation.alternatives.length > 0 && (
              <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                <span className="font-medium">מוצרים נוספים משתלמים: </span>
                {recommendation.alternatives.map((a, i) => (
                  <span key={i}>{a.name}{a.bestPrice != null ? ` (${fmt(a.bestPrice)}, ${a.bestStore})` : ""}{i < recommendation.alternatives!.length - 1 ? " · " : ""}</span>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Categories quick filter */}
        <section className="flex flex-wrap gap-2" data-testid="pc-categories">
          <Button variant={filters.categoryId === null ? "default" : "outline"} size="sm"
            onClick={() => { const n = update({ categoryId: null }); runSearch(n); }} data-testid="button-pc-cat-all">הכול</Button>
          {meta.categories.map((c) => (
            <Button key={c.id} variant={filters.categoryId === c.id ? "default" : "outline"} size="sm"
              onClick={() => { const n = update({ categoryId: c.id }); runSearch(n); }} data-testid={`button-pc-cat-${c.id}`}>
              <Tag className="w-3 h-3 ml-1" /> {c.name}
            </Button>
          ))}
        </section>

        {promotions.length > 0 && (
          <section className="space-y-2" data-testid="pc-promotions">
            <h2 className="text-sm font-semibold text-muted-foreground">מבצעים</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {promotions.slice(0, 6).map((p) => (
                <Card key={p.id} className="p-4 border-primary/20 bg-primary/5" data-testid={`pc-promo-${p.id}`}>
                  <div className="font-medium text-sm">{p.title}</div>
                  {p.description && <div className="text-xs text-muted-foreground mt-1">{p.description}</div>}
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Results */}
        <section className="space-y-3" data-testid="pc-results">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)
          ) : results.length === 0 ? (
            pcMeta && !pcMeta.hasRealData && activeFilterCount === 0 && !filters.q.trim() ? (
              <Card className="p-8 text-center text-sm text-muted-foreground space-y-2" data-testid="pc-no-data">
                <Store className="w-8 h-8 text-muted-foreground mx-auto" />
                <div className="font-semibold text-foreground">עדיין אין נתוני מחירים מאומתים</div>
                <p>מאגר המחירים מתעדכן אוטומטית מקובצי שקיפות המחירים של הרשתות מדי בוקר. ברגע שייובאו נתונים, הם יוצגו כאן.</p>
              </Card>
            ) : (
              <Card className="p-8 text-center text-sm text-muted-foreground" data-testid="pc-no-results">
                לא נמצאו מוצרים מתאימים. נסו לשנות את החיפוש או הסינון.
              </Card>
            )
          ) : (
            results.map((row) => (
              <Card key={row.product.id} className="p-4" data-testid={`pc-product-${row.product.id}`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <button className="min-w-0 text-right" onClick={() => setExpanded(expanded === row.product.id ? null : row.product.id)} data-testid={`button-pc-expand-${row.product.id}`}>
                    <div className="font-semibold">{row.product.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {[row.product.brand, row.product.unit, row.categoryName].filter(Boolean).join(" · ")}
                    </div>
                    {row.product.barcode && <div className="text-[11px] text-muted-foreground">ברקוד: <span dir="ltr">{row.product.barcode}</span></div>}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted/70 border border-border" data-testid={`pc-chaincount-${row.product.id}`}>
                        נמכר ב-{row.chainCount} רשתות
                      </span>
                      {row.spreadPct != null && row.spreadPct > 0 && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30" data-testid={`pc-spread-${row.product.id}`}>
                          פער מחירים {row.spreadPct}%
                        </span>
                      )}
                      {row.kinds.map((k) => (
                        <span key={k} className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20" data-testid={`pc-kind-${row.product.id}-${k}`}>
                          {KIND_LABEL[k]}
                        </span>
                      ))}
                    </div>
                  </button>
                  {row.cheapestPrice !== null && (
                    <div className="text-left">
                      <div className="text-xs text-muted-foreground">המחיר הזול ביותר</div>
                      <div className="text-lg font-bold text-primary tabular-nums">{fmt(row.cheapestPrice)}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                        <Store className="w-3 h-3" /> {row.cheapestStore}
                      </div>
                      {row.product.barcode && (
                        <Link href={`/compare/${encodeURIComponent(row.product.barcode)}`} data-testid={`link-pc-compare-${row.product.id}`}>
                          <a className="text-[11px] text-primary inline-flex items-center gap-1 mt-1">השוואה מלאה <ArrowRight className="w-3 h-3" /></a>
                        </Link>
                      )}
                      <Button
                        variant={isInList(row.product.id) ? "secondary" : "outline"}
                        size="sm"
                        className="mt-1.5 h-7 text-[11px]"
                        disabled={isInList(row.product.id)}
                        onClick={() => addToList(row)}
                        data-testid={`button-pc-add-list-${row.product.id}`}
                      >
                        <Plus className="w-3 h-3 ml-1" /> {isInList(row.product.id) ? "ברשימה" : "הוספה לרשימה"}
                      </Button>
                    </div>
                  )}
                </div>
                {(expanded === row.product.id || row.offers.length > 1) && row.offers.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    {expanded === row.product.id ? (
                      <table className="w-full text-xs" data-testid={`pc-offer-table-${row.product.id}`}>
                        <thead>
                          <tr className="text-muted-foreground">
                            <th className="text-right font-medium py-1">חנות</th>
                            <th className="text-right font-medium py-1">עיר</th>
                            <th className="text-left font-medium py-1">מחיר</th>
                          </tr>
                        </thead>
                        <tbody>
                          {row.offers.map((o, idx) => (
                            <tr key={o.storeId} className={idx === 0 ? "text-primary font-semibold" : ""}>
                              <td className="py-1">{o.storeName}{o.onSale && <span className="text-primary"> · מבצע</span>}</td>
                              <td className="py-1 text-muted-foreground">{o.city || "—"}</td>
                              <td className="py-1 text-left tabular-nums">{fmt(o.price)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {row.offers.map((o) => (
                          <span key={o.storeId} className="text-xs px-2 py-1 rounded bg-muted/60 border border-border tabular-nums" data-testid={`pc-offer-${row.product.id}-${o.storeId}`}>
                            {o.storeName}: <span className="font-medium">{fmt(o.price)}</span>
                            {o.onSale && <span className="text-primary"> · מבצע</span>}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))
          )}
        </section>

        {settings?.contactText && (
          <Card className="p-4 text-sm text-muted-foreground whitespace-pre-line" data-testid="pc-contact-text">
            {settings.contactText}
          </Card>
        )}

        {/* Supplier/business price submission (second track) — only when the
            admin enabled the merchant portal. Submissions are reviewed before
            they ever appear, and never mix into the official comparison. */}
        {pcMeta?.merchantPortalEnabled && (
          <section data-testid="pc-submit-section">
            {!showSubmit ? (
              <Button variant="outline" size="sm" onClick={() => setShowSubmit(true)} data-testid="button-pc-submit-open">
                <Send className="w-4 h-4 ml-1" /> בעל עסק? הגישו הצעת מחיר
              </Button>
            ) : (
              <Card className="p-4 space-y-3" data-testid="pc-submit-form">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">הגשת הצעת מחיר על-ידי עסק</h2>
                  <Button variant="ghost" size="icon" onClick={() => setShowSubmit(false)}><X className="w-4 h-4" /></Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  ההצעה נבדקת על-ידי הצוות לפני פרסום, ומסומנת כ"מחיר ספק" בנפרד ממחירי הרשתות הרשמיים. אינה משתתפת בהשוואה הרשמית.
                </p>
                <div className="grid sm:grid-cols-2 gap-2">
                  <Input placeholder="שם העסק *" value={submission.merchantName} onChange={(e) => setSubmission({ ...submission, merchantName: e.target.value })} data-testid="input-pc-sub-merchant" />
                  <Input placeholder="פרטי קשר (טלפון/מייל)" value={submission.merchantContact} onChange={(e) => setSubmission({ ...submission, merchantContact: e.target.value })} data-testid="input-pc-sub-contact" />
                  <Input placeholder="שם החנות *" value={submission.storeName} onChange={(e) => setSubmission({ ...submission, storeName: e.target.value })} data-testid="input-pc-sub-store" />
                  <Input placeholder="עיר" value={submission.city} onChange={(e) => setSubmission({ ...submission, city: e.target.value })} data-testid="input-pc-sub-city" autoComplete="address-level2" />
                  <Input placeholder="שם המוצר *" value={submission.productName} onChange={(e) => setSubmission({ ...submission, productName: e.target.value })} data-testid="input-pc-sub-product" />
                  <Input placeholder="מותג" value={submission.brand} onChange={(e) => setSubmission({ ...submission, brand: e.target.value })} data-testid="input-pc-sub-brand" />
                  <Input placeholder="יחידה (למשל 1 ליטר)" value={submission.unit} onChange={(e) => setSubmission({ ...submission, unit: e.target.value })} data-testid="input-pc-sub-unit" />
                  <Input placeholder="ברקוד" dir="ltr" value={submission.barcode} onChange={(e) => setSubmission({ ...submission, barcode: e.target.value })} data-testid="input-pc-sub-barcode" />
                  <Input type="number" step="0.01" min={0} inputMode="decimal" placeholder="מחיר ₪ *" value={submission.price} onChange={(e) => setSubmission({ ...submission, price: e.target.value })} data-testid="input-pc-sub-price" />
                  <Input placeholder="הערה (לא חובה)" value={submission.note} onChange={(e) => setSubmission({ ...submission, note: e.target.value })} data-testid="input-pc-sub-note" />
                </div>
                <Button size="sm" disabled={submitting} onClick={submitPrice} data-testid="button-pc-submit-price">
                  <Send className="w-4 h-4 ml-1" /> {submitting ? "שולח…" : "שליחת ההצעה"}
                </Button>
              </Card>
            )}
          </section>
        )}

        <div className="pt-4">
          <Link href="/" data-testid="link-pc-back">
            <a className="text-sm text-primary inline-flex items-center gap-1">
              <ArrowRight className="w-4 h-4" /> חזרה לדף הבית
            </a>
          </Link>
        </div>
      </main>

      {scanSupported && (
        <BarcodeScannerDialog open={showScanner} onOpenChange={setShowScanner} onDetected={onBarcodeDetected} />
      )}
    </div>
  );
}
