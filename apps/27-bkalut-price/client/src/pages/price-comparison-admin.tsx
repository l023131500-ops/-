import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getPublicOrigin } from "@/lib/utils";
import { Trash2, Plus, ExternalLink, Globe, Copy, Settings2, Save, Play, RefreshCw, Database, Upload, Activity } from "lucide-react";

interface Category { id: number; name: string; sortOrder: number; active: boolean }
interface Store { id: number; name: string; branch: string | null; city: string | null; active: boolean }
interface Product { id: number; categoryId: number | null; name: string; brand: string | null; unit: string | null; active: boolean }
interface Price { id: number; productId: number; storeId: number; price: number; onSale: boolean; saleNote: string | null }
interface Promotion { id: number; storeId: number | null; title: string; description: string | null; active: boolean }
type PcChainKind = "regulatory" | "voluntary";
interface FeedSource {
  id: number; chainName: string; chainId: string | null; sourceUrl: string | null;
  sourceType: string; sourceKind: PcChainKind; feedFormat: string; feedKinds: string | null; notes: string | null;
  verified: boolean; active: boolean; lastStatus: string | null; lastRunAt: string | null; lastMessage: string | null;
  adapter: string | null; directFileUrl: string | null; discoveryUrl: string | null;
  maxFilesPerRun: number; lastError: string | null; lastSuccessAt: string | null;
}
interface PcDataHealth {
  products: number; withBarcode: number; uniqueBarcodes: number; categorized: number; uncategorized: number;
  withImage: number; withAnyPrice: number; inChains2Plus: number; inChains3Plus: number; inChains4Plus: number;
  chains: number; regulatoryChains: number; voluntaryChains: number;
}
const KIND_LABEL: Record<PcChainKind, string> = { regulatory: "מפוקחת (חוק)", voluntary: "מצטרפת" };
interface ImportJob {
  id: number; feedSourceId: number | null; trigger: string; kind: string | null; status: string;
  storesUpserted: number; productsUpserted: number; pricesUpserted: number; promotionsUpserted: number;
  errors: number; startedAt: string; finishedAt: string | null; message: string | null;
}
interface PcStats {
  categories: number; stores: number; products: number; prices: number; promotions: number;
  feedSources: number; activeFeedSources: number; importJobs: number; priceHistory: number; lastImportAt: string | null;
}
interface PcSettings {
  publicEnabled: boolean;
  merchantPortalEnabled: boolean;
  showSampleData: boolean;
  publicTitle: string;
  publicSubtitle: string;
  contactText: string;
  automationEndpoint: string;
}
interface Submission {
  id: number; merchantName: string; merchantContact: string | null; storeName: string; city: string | null;
  productName: string; brand: string | null; unit: string | null; barcode: string | null;
  price: number; onSale: boolean; saleNote: string | null; validUntil: string | null; note: string | null;
  trust: "unverified" | "verified" | "trusted"; status: "pending" | "approved" | "rejected";
  reviewedBy: string | null; reviewNote: string | null; reviewedAt: string | null; createdAt: string;
}
interface VoluntaryToken {
  id: number; token: string; storeId: number; storeName: string; city: string | null; chainId: string;
  contactEmail: string | null; active: boolean; lastUploadAt: string | null; uploadCount: number; createdAt: string;
}

export default function PriceComparisonAdmin() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productPrices, setProductPrices] = useState<Price[]>([]);

  const [newCat, setNewCat] = useState("");
  const [newStore, setNewStore] = useState({ name: "", branch: "", city: "" });
  const [newProduct, setNewProduct] = useState({ name: "", brand: "", unit: "", categoryId: "" });
  const [newPrice, setNewPrice] = useState({ storeId: "", price: "", onSale: false, saleNote: "" });
  const [newPromo, setNewPromo] = useState({ title: "", description: "", storeId: "" });
  const [settings, setSettings] = useState<PcSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const [stats, setStats] = useState<PcStats | null>(null);
  const [dataHealth, setDataHealth] = useState<PcDataHealth | null>(null);
  const [feeds, setFeeds] = useState<FeedSource[]>([]);
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [jobLogs, setJobLogs] = useState<Record<number, Array<{ id: number; level: string; message: string }>>>({});
  const [runningFeed, setRunningFeed] = useState<number | null>(null);
  const [newFeed, setNewFeed] = useState({ chainName: "", chainId: "", sourceUrl: "", sourceType: "publishprice", sourceKind: "regulatory", feedFormat: "gz", feedKinds: "PriceFull", notes: "", adapter: "url", directFileUrl: "", discoveryUrl: "" });
  const [uploadFeedId, setUploadFeedId] = useState<string>("");
  const [uploadKind, setUploadKind] = useState<string>("PriceFull");
  const [uploading, setUploading] = useState(false);

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [subFilter, setSubFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [reviewing, setReviewing] = useState<number | null>(null);
  const subFilterRef = useRef(subFilter);
  subFilterRef.current = subFilter;

  const [volTokens, setVolTokens] = useState<VoluntaryToken[]>([]);
  const [newVol, setNewVol] = useState({ storeName: "", city: "", contactEmail: "" });
  const [creatingVol, setCreatingVol] = useState(false);

  const publicUrl = `${getPublicOrigin()}/#/price-comparison`;
  const adminUrl = `${getPublicOrigin()}/#/price-comparison-admin`;

  async function loadAll() {
    try {
      const [c, s, p, pr, st] = await Promise.all([
        apiRequest("GET", "/api/pc/admin/categories").then((r) => r.json()),
        apiRequest("GET", "/api/pc/admin/stores").then((r) => r.json()),
        apiRequest("GET", "/api/pc/admin/products").then((r) => r.json()),
        apiRequest("GET", "/api/pc/admin/promotions").then((r) => r.json()),
        apiRequest("GET", "/api/pc/admin/settings").then((r) => r.json()),
      ]);
      setCategories(c); setStores(s); setProducts(p); setPromotions(pr); setSettings(st);
    } catch (e) {
      toast({ title: "שגיאה בטעינה", variant: "destructive" });
    }
  }

  async function loadEtl() {
    try {
      const [stat, fd, jb, dh] = await Promise.all([
        apiRequest("GET", "/api/pc/admin/stats").then((r) => r.json()),
        apiRequest("GET", "/api/pc/admin/feeds").then((r) => r.json()),
        apiRequest("GET", "/api/pc/admin/jobs").then((r) => r.json()),
        apiRequest("GET", "/api/pc/admin/data-health").then((r) => r.json()),
      ]);
      setStats(stat); setFeeds(fd); setJobs(jb); setDataHealth(dh);
    } catch {
      /* non-fatal — ETL tab simply stays empty */
    }
  }

  async function loadSubmissions() {
    const requestedFilter = subFilter;
    try {
      const qs = requestedFilter === "all" ? "" : `?status=${requestedFilter}`;
      const r = await apiRequest("GET", `/api/pc/admin/submissions${qs}`);
      const d = await r.json();
      if (subFilterRef.current !== requestedFilter) return; // a newer filter click already superseded this response
      setSubmissions(d.submissions ?? []);
      setPendingCount(d.pending ?? 0);
    } catch { /* non-fatal — tab stays empty */ }
  }

  async function reviewSubmission(id: number, action: "approve" | "reject") {
    setReviewing(id);
    try {
      await apiRequest("POST", `/api/pc/admin/submissions/${id}/${action}`);
      toast({ title: action === "approve" ? "ההצעה אושרה ונוספה כמחיר ספק" : "ההצעה נדחתה" });
      await loadSubmissions();
      await loadEtl();
    } catch (e: any) {
      toast({ title: "הפעולה נכשלה", description: e?.message, variant: "destructive" });
    } finally { setReviewing(null); }
  }

  async function loadVolTokens() {
    try {
      const r = await apiRequest("GET", "/api/pc/admin/voluntary-tokens");
      setVolTokens(await r.json());
    } catch { /* non-fatal — tab stays empty */ }
  }
  async function createVolToken() {
    if (!newVol.storeName.trim()) return;
    setCreatingVol(true);
    try {
      await apiRequest("POST", "/api/pc/admin/voluntary-tokens", newVol);
      setNewVol({ storeName: "", city: "", contactEmail: "" });
      await loadVolTokens();
      toast({ title: "טוקן נוצר", description: "העתיקו את הקישור ושלחו לחנות." });
    } catch (e: any) {
      toast({ title: "היצירה נכשלה", description: e?.message, variant: "destructive" });
    } finally { setCreatingVol(false); }
  }
  async function toggleVolToken(t: VoluntaryToken) {
    try {
      await apiRequest("PATCH", `/api/pc/admin/voluntary-tokens/${t.id}`, { active: !t.active });
      await loadVolTokens();
    } catch { toast({ title: "העדכון נכשל", variant: "destructive" }); }
  }

  useEffect(() => { loadAll(); loadEtl(); loadVolTokens(); }, []);
  useEffect(() => { loadSubmissions(); }, [subFilter]);

  async function addFeed() {
    if (!newFeed.chainName.trim()) return;
    try {
      // sourceType mirrors the chosen adapter so existing logic + the importer agree.
      await apiRequest("POST", "/api/pc/admin/feeds", { ...newFeed, sourceType: newFeed.adapter });
      setNewFeed({ chainName: "", chainId: "", sourceUrl: "", sourceType: "publishprice", sourceKind: "regulatory", feedFormat: "gz", feedKinds: "PriceFull", notes: "", adapter: "url", directFileUrl: "", discoveryUrl: "" });
      await loadEtl();
      toast({ title: "מקור הנתונים נוסף", description: "המקור נוסף כלא-פעיל עד לאימות. הפעילו אותו לאחר בדיקה." });
    } catch { toast({ title: "ההוספה נכשלה", variant: "destructive" }); }
  }
  async function toggleFeed(f: FeedSource, patch: Partial<FeedSource>) {
    try {
      await apiRequest("PATCH", `/api/pc/admin/feeds/${f.id}`, patch);
      await loadEtl();
    } catch { toast({ title: "העדכון נכשל", variant: "destructive" }); }
  }
  async function runFeed(id: number) {
    setRunningFeed(id);
    try {
      const r = await apiRequest("POST", `/api/pc/admin/feeds/${id}/run`);
      const data = await r.json();
      if (data.logs) setJobLogs((prev) => ({ ...prev, [data.job.id]: data.logs }));
      toast({ title: data.job?.status === "ok" ? "הייבוא הסתיים" : "הייבוא הסתיים עם הערות", description: data.job?.message || "" });
      await loadEtl();
    } catch (e: any) {
      toast({ title: "הייבוא נכשל", description: e?.message, variant: "destructive" });
    } finally { setRunningFeed(null); }
  }
  async function runDaily() {
    try {
      const r = await apiRequest("POST", "/api/pc/admin/import/daily");
      const d = await r.json();
      toast({ title: "ייבוא יומי הופעל", description: d.summary });
      await loadEtl();
    } catch { toast({ title: "ההפעלה נכשלה", variant: "destructive" }); }
  }
  async function loadJobLogs(jobId: number) {
    try {
      const r = await apiRequest("GET", `/api/pc/admin/jobs/${jobId}/logs`);
      const logs = await r.json();
      setJobLogs((prev) => ({ ...prev, [jobId]: logs }));
    } catch { /* ignore */ }
  }
  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const isGz = file.name.toLowerCase().endsWith(".gz");
      const body: Record<string, unknown> = { filename: file.name, kind: uploadKind };
      if (isGz) {
        const buf = await file.arrayBuffer();
        let binary = "";
        const bytes = new Uint8Array(buf);
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        body.base64 = btoa(binary);
      } else {
        body.content = await file.text();
      }
      const r = await apiRequest("POST", `/api/pc/admin/feeds/${uploadFeedId || 0}/upload`, body);
      const d = await r.json();
      if (d.logs && d.job) setJobLogs((prev) => ({ ...prev, [d.job.id]: d.logs }));
      toast({ title: "הקובץ עובד", description: d.job?.message || "" });
      await loadEtl();
    } catch (e: any) {
      toast({ title: "העלאת הקובץ נכשלה", description: e?.message, variant: "destructive" });
    } finally { setUploading(false); }
  }

  async function saveSettings(patch: Partial<PcSettings>) {
    setSavingSettings(true);
    try {
      const r = await apiRequest("PATCH", "/api/pc/admin/settings", patch);
      const next = await r.json();
      setSettings(next);
      toast({ title: "ההגדרות נשמרו" });
    } catch {
      toast({ title: "שמירת ההגדרות נכשלה", variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  }

  function copy(url: string) {
    navigator.clipboard.writeText(url).then(
      () => toast({ title: "הקישור הועתק", description: url }),
      () => toast({ title: "העתיקו ידנית", description: url }),
    );
  }

  async function loadPrices(prod: Product) {
    setSelectedProduct(prod);
    const r = await apiRequest("GET", `/api/pc/admin/products/${prod.id}/prices`);
    setProductPrices(await r.json());
  }

  async function addCategory() {
    if (!newCat.trim()) return;
    try {
      await apiRequest("POST", "/api/pc/admin/categories", { name: newCat });
      setNewCat(""); await loadAll();
      toast({ title: "הקטגוריה נוספה" });
    } catch { toast({ title: "הוספת הקטגוריה נכשלה", variant: "destructive" }); }
  }
  async function addStore() {
    if (!newStore.name.trim()) return;
    try {
      await apiRequest("POST", "/api/pc/admin/stores", newStore);
      setNewStore({ name: "", branch: "", city: "" }); await loadAll();
      toast({ title: "החנות נוספה" });
    } catch { toast({ title: "הוספת החנות נכשלה", variant: "destructive" }); }
  }
  async function addProduct() {
    if (!newProduct.name.trim()) return;
    try {
      await apiRequest("POST", "/api/pc/admin/products", {
        name: newProduct.name, brand: newProduct.brand, unit: newProduct.unit,
        categoryId: newProduct.categoryId ? Number(newProduct.categoryId) : null,
      });
      setNewProduct({ name: "", brand: "", unit: "", categoryId: "" }); await loadAll();
      toast({ title: "המוצר נוסף" });
    } catch { toast({ title: "הוספת המוצר נכשלה", variant: "destructive" }); }
  }
  async function addPrice() {
    if (!selectedProduct || !newPrice.storeId || !newPrice.price) return;
    try {
      await apiRequest("POST", "/api/pc/admin/prices", {
        productId: selectedProduct.id, storeId: Number(newPrice.storeId),
        price: Number(newPrice.price), onSale: newPrice.onSale, saleNote: newPrice.saleNote,
      });
      setNewPrice({ storeId: "", price: "", onSale: false, saleNote: "" });
      loadPrices(selectedProduct);
      toast({ title: "המחיר נוסף" });
    } catch { toast({ title: "הוספת המחיר נכשלה", variant: "destructive" }); }
  }
  async function addPromo() {
    if (!newPromo.title.trim()) return;
    try {
      await apiRequest("POST", "/api/pc/admin/promotions", {
        title: newPromo.title, description: newPromo.description,
        storeId: newPromo.storeId ? Number(newPromo.storeId) : null,
      });
      setNewPromo({ title: "", description: "", storeId: "" }); await loadAll();
      toast({ title: "המבצע נוסף" });
    } catch { toast({ title: "הוספת המבצע נכשלה", variant: "destructive" }); }
  }

  async function del(url: string, after: () => void) {
    try {
      await apiRequest("DELETE", url); after();
      toast({ title: "נמחק בהצלחה" });
    } catch { toast({ title: "המחיקה נכשלה", variant: "destructive" }); }
  }

  const storeName = (id: number) => stores.find((s) => s.id === id)?.name || `#${id}`;

  return (
    <div className="space-y-6" dir="rtl" data-testid="page-pc-admin">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">מערכת נפרדת — אינה מעורבת בנתוני הזכויות או הניהול הפיננסי</p>
        <h1 className="text-xl md:text-2xl font-bold">ניהול השוואת מחירים</h1>
      </header>

      <Card className="p-4 space-y-3" data-testid="pc-public-link">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <Globe className="w-4 h-4 text-primary shrink-0" />
            <span className="shrink-0">האתר הציבורי:</span>
            <code dir="ltr" className="text-xs bg-muted/60 px-2 py-1 rounded border border-border truncate">{publicUrl}</code>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => copy(publicUrl)} title="העתקת הקישור הציבורי" data-testid="button-pc-copy-public"><Copy className="w-4 h-4" /></Button>
            <Button asChild variant="outline" size="sm">
              <a href={publicUrl} target="_blank" rel="noreferrer" data-testid="button-pc-open-public">
                <ExternalLink className="w-4 h-4 ml-1" /> פתיחה
              </a>
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap border-t border-border pt-3">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <Settings2 className="w-4 h-4 text-primary shrink-0" />
            <span className="shrink-0">קישור הניהול (לאדמין):</span>
            <code dir="ltr" className="text-xs bg-muted/60 px-2 py-1 rounded border border-border truncate">{adminUrl}</code>
          </div>
          <Button variant="ghost" size="icon" onClick={() => copy(adminUrl)} title="העתקת קישור הניהול" data-testid="button-pc-copy-admin"><Copy className="w-4 h-4" /></Button>
        </div>
        {settings && !settings.publicEnabled && (
          <p className="text-xs text-destructive border-t border-border pt-3" data-testid="pc-disabled-notice">
            האתר הציבורי כבוי כעת — מבקרים יקבלו הודעה שהאתר אינו זמין. ניתן להפעיל בלשונית "הגדרות".
          </p>
        )}
      </Card>

      <Tabs defaultValue="products" dir="rtl">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="feeds" data-testid="tab-pc-feeds">מקורות נתונים וייבוא</TabsTrigger>
          <TabsTrigger value="products" data-testid="tab-pc-products">מוצרים ומחירים</TabsTrigger>
          <TabsTrigger value="stores" data-testid="tab-pc-stores">חנויות</TabsTrigger>
          <TabsTrigger value="categories" data-testid="tab-pc-categories">קטגוריות</TabsTrigger>
          <TabsTrigger value="promotions" data-testid="tab-pc-promotions">מבצעים</TabsTrigger>
          <TabsTrigger value="submissions" data-testid="tab-pc-submissions">
            הצעות ספקים{pendingCount > 0 && <span className="mr-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-primary text-primary-foreground text-[11px] tabular-nums">{pendingCount}</span>}
          </TabsTrigger>
          <TabsTrigger value="voluntary" data-testid="tab-pc-voluntary">ספקים וולונטריים</TabsTrigger>
          <TabsTrigger value="automation" data-testid="tab-pc-automation">אוטומציה ו-API</TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-pc-settings">הגדרות</TabsTrigger>
        </TabsList>

        {/* Feeds + Import (ETL) */}
        <TabsContent value="feeds" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2" data-testid="pc-stats">
            {stats && [
              { label: "מקורות פעילים", v: `${stats.activeFeedSources}/${stats.feedSources}` },
              { label: "חנויות", v: stats.stores },
              { label: "מוצרים", v: stats.products },
              { label: "מחירים", v: stats.prices },
              { label: "היסטוריית מחירים", v: stats.priceHistory },
            ].map((c, i) => (
              <Card key={i} className="p-3 text-center">
                <div className="text-lg font-bold tabular-nums">{c.v}</div>
                <div className="text-xs text-muted-foreground">{c.label}</div>
              </Card>
            ))}
          </div>

          {/* Data-health dashboard — catalog coverage + cross-chain depth. */}
          {dataHealth && (
            <Card className="p-4 space-y-3" data-testid="pc-data-health">
              <h3 className="font-semibold text-sm">בריאות הנתונים — עומק וכיסוי</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {[
                  { label: "מוצרים", v: dataHealth.products },
                  { label: "עם ברקוד", v: dataHealth.withBarcode },
                  { label: "ברקודים ייחודיים", v: dataHealth.uniqueBarcodes },
                  { label: "עם תמונה", v: dataHealth.withImage },
                  { label: "מסווגים בקטגוריה", v: dataHealth.categorized },
                  { label: "ללא קטגוריה", v: dataHealth.uncategorized },
                  { label: "נמכרים ב-2+ רשתות", v: dataHealth.inChains2Plus },
                  { label: "נמכרים ב-3+ רשתות", v: dataHealth.inChains3Plus },
                  { label: "נמכרים ב-4+ רשתות", v: dataHealth.inChains4Plus },
                  { label: "סה\"כ רשתות", v: dataHealth.chains },
                  { label: "רשתות מפוקחות", v: dataHealth.regulatoryChains },
                  { label: "רשתות מצטרפות", v: dataHealth.voluntaryChains },
                ].map((c, i) => (
                  <div key={i} className="p-2 rounded border border-border text-center" data-testid={`pc-health-${i}`}>
                    <div className="text-base font-bold tabular-nums">{c.v.toLocaleString("he-IL")}</div>
                    <div className="text-[11px] text-muted-foreground">{c.label}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Database className="w-4 h-4" /> מקורות נתונים (ETL)</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={loadEtl} data-testid="button-pc-refresh-etl"><RefreshCw className="w-4 h-4 ml-1" /> רענון</Button>
                <Button size="sm" onClick={runDaily} data-testid="button-pc-run-daily"><Play className="w-4 h-4 ml-1" /> ייבוא יומי (כל הפעילים)</Button>
              </div>
            </div>
            <div className="text-xs rounded-md border border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-1" data-testid="pc-live-import-notice">
              <p className="font-semibold">להפעלת ייבוא חי (נתונים אמיתיים) נדרשים שלושה תנאים:</p>
              <ol className="list-decimal pr-4 space-y-0.5">
                <li>הגדרת סודות ב-GitHub: <code dir="ltr">SUPABASE_URL</code> ו-<code dir="ltr">SUPABASE_SERVICE_ROLE_KEY</code> (Settings → Secrets and variables → Actions).</li>
                <li>המקור מסומן כ"מאומת" וגם "פעיל" — רק לאחר שהמתאם ייבא קובץ אמיתי בהצלחה.</li>
                <li>קיים <code dir="ltr">direct_file_url</code> מאומת, או מתאם עם גילוי קישורים (למשל שופרסל).</li>
              </ol>
              <p>הייבוא היומי רץ אוטומטית פעם ביום דרך GitHub Actions (Workflow: "Price Comparison — Daily Import"), וניתן גם להריץ ידנית דרך workflow_dispatch. פירוט מלא: <code dir="ltr">docs/price-comparison-live-import.md</code>.</p>
              <p>אין עדיין חיבור לאימייל / וואטסאפ / ימות — בשלב זה רק ייבוא נתונים אמיתי. אתר הלקוח לא יציג "מחירים חיים" כל עוד אין מחיר עם <code dir="ltr">source=import</code>.</p>
            </div>

            <div className="grid sm:grid-cols-3 gap-2 border-t border-border pt-3">
              <Input placeholder="שם רשת" value={newFeed.chainName} onChange={(e) => setNewFeed({ ...newFeed, chainName: e.target.value })} data-testid="input-pc-feed-chain" />
              <Input placeholder="מזהה רשת (ChainId)" value={newFeed.chainId} onChange={(e) => setNewFeed({ ...newFeed, chainId: e.target.value })} />
              <select className="border border-border rounded-md px-2 text-sm bg-background" value={newFeed.adapter} onChange={(e) => setNewFeed({ ...newFeed, adapter: e.target.value })} data-testid="select-pc-feed-adapter">
                <option value="url">url (קובץ ישיר)</option>
                <option value="shufersal">shufersal (גילוי)</option>
                <option value="cerberus">cerberus (שלד)</option>
                <option value="nibit">nibit (שלד)</option>
                <option value="matrix">matrix (שלד)</option>
                <option value="openisrael">openisrael (חיצוני)</option>
              </select>
              <Input dir="ltr" placeholder="כתובת קובץ ישירה (direct_file_url, .gz/.xml)" value={newFeed.directFileUrl} onChange={(e) => setNewFeed({ ...newFeed, directFileUrl: e.target.value })} data-testid="input-pc-feed-direct-url" />
              <Input dir="ltr" placeholder="עמוד רשימה לגילוי (discovery_url)" value={newFeed.discoveryUrl} onChange={(e) => setNewFeed({ ...newFeed, discoveryUrl: e.target.value })} data-testid="input-pc-feed-discovery-url" />
              <Input dir="ltr" placeholder="כתובת מקור בסיס (URL)" value={newFeed.sourceUrl} onChange={(e) => setNewFeed({ ...newFeed, sourceUrl: e.target.value })} data-testid="input-pc-feed-url" />
              <select className="border border-border rounded-md px-2 text-sm bg-background" value={newFeed.feedFormat} onChange={(e) => setNewFeed({ ...newFeed, feedFormat: e.target.value })}>
                <option value="gz">gz</option>
                <option value="xml">xml</option>
                <option value="json">json</option>
              </select>
              <select className="border border-border rounded-md px-2 text-sm bg-background" value={newFeed.feedKinds} onChange={(e) => setNewFeed({ ...newFeed, feedKinds: e.target.value })}>
                <option value="PriceFull">PriceFull</option>
                <option value="PromoFull">PromoFull</option>
                <option value="Stores">Stores</option>
              </select>
              <select className="border border-border rounded-md px-2 text-sm bg-background" value={newFeed.sourceKind} onChange={(e) => setNewFeed({ ...newFeed, sourceKind: e.target.value as PcChainKind })} data-testid="select-pc-feed-kind">
                <option value="regulatory">רשת מפוקחת (חוק שקיפות)</option>
                <option value="voluntary">רשת מצטרפת (התנדבותי)</option>
              </select>
            </div>
            <Button size="sm" onClick={addFeed} data-testid="button-pc-add-feed"><Plus className="w-4 h-4 ml-1" /> הוספת מקור</Button>

            <div className="space-y-2 border-t border-border pt-3">
              {feeds.length === 0 && <p className="text-xs text-muted-foreground">אין עדיין מקורות נתונים.</p>}
              {feeds.map((f) => (
                <div key={f.id} className="p-3 rounded border border-border space-y-2" data-testid={`pc-feed-${f.id}`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-sm">
                      <span className="font-semibold">{f.chainName}</span>
                      <span className={`text-[11px] mr-1 px-1.5 py-0.5 rounded-full border ${f.sourceKind === "voluntary" ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30" : "bg-primary/10 text-primary border-primary/20"}`} data-testid={`pc-feed-kind-${f.id}`}>{KIND_LABEL[f.sourceKind]}</span>
                      <span className="text-xs text-muted-foreground"> · {f.adapter || f.sourceType} · {f.feedFormat} · {f.feedKinds || "—"}{f.maxFilesPerRun ? ` · ≤${f.maxFilesPerRun} קבצים` : ""}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <select className="border border-border rounded px-1.5 py-0.5 text-xs bg-background" value={f.sourceKind} onChange={(e) => toggleFeed(f, { sourceKind: e.target.value as PcChainKind })} data-testid={`select-pc-feed-kind-${f.id}`}>
                        <option value="regulatory">מפוקחת</option>
                        <option value="voluntary">מצטרפת</option>
                      </select>
                      <label className="flex items-center gap-1 text-xs"><Switch checked={f.verified} onCheckedChange={(v) => toggleFeed(f, { verified: v })} data-testid={`switch-pc-feed-verified-${f.id}`} /> מאומת</label>
                      <label className="flex items-center gap-1 text-xs"><Switch checked={f.active} onCheckedChange={(v) => toggleFeed(f, { active: v })} data-testid={`switch-pc-feed-active-${f.id}`} /> פעיל</label>
                      <Button size="sm" variant="outline" disabled={runningFeed === f.id} onClick={() => runFeed(f.id)} data-testid={`button-pc-run-feed-${f.id}`}>
                        {runningFeed === f.id ? <RefreshCw className="w-4 h-4 ml-1 animate-spin" /> : <Play className="w-4 h-4 ml-1" />} הרצה
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => del(`/api/pc/admin/feeds/${f.id}`, loadEtl)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </div>
                  {f.directFileUrl && <code dir="ltr" className="block text-xs bg-muted/60 px-2 py-1 rounded truncate" title="direct_file_url">{f.directFileUrl}</code>}
                  {!f.directFileUrl && f.discoveryUrl && <code dir="ltr" className="block text-xs bg-muted/40 px-2 py-1 rounded truncate" title="discovery_url">{f.discoveryUrl}</code>}
                  {!f.directFileUrl && !f.discoveryUrl && f.sourceUrl && <code dir="ltr" className="block text-xs bg-muted/60 px-2 py-1 rounded truncate">{f.sourceUrl}</code>}
                  <div className="text-xs text-muted-foreground">
                    סטטוס אחרון: <b>{f.lastStatus || "טרם רץ"}</b>{f.lastRunAt && ` · ${new Date(f.lastRunAt).toLocaleString("he-IL")}`}
                    {f.lastSuccessAt && <span className="text-green-600 dark:text-green-400"> · ייבוא מוצלח אחרון: {new Date(f.lastSuccessAt).toLocaleString("he-IL")}</span>}
                    {f.lastMessage && <span> · {f.lastMessage}</span>}
                  </div>
                  {f.lastError && <div className="text-xs text-destructive break-words" data-testid={`pc-feed-error-${f.id}`}>שגיאה אחרונה: {f.lastError}</div>}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Upload className="w-4 h-4" /> העלאת קובץ ידנית (XML / GZ)</h3>
            <div className="grid sm:grid-cols-3 gap-2">
              <select className="border border-border rounded-md px-2 text-sm bg-background" value={uploadFeedId} onChange={(e) => setUploadFeedId(e.target.value)} data-testid="select-pc-upload-feed">
                <option value="">— ללא שיוך למקור —</option>
                {feeds.map((f) => <option key={f.id} value={f.id}>{f.chainName}</option>)}
              </select>
              <select className="border border-border rounded-md px-2 text-sm bg-background" value={uploadKind} onChange={(e) => setUploadKind(e.target.value)} data-testid="select-pc-upload-kind">
                <option value="PriceFull">PriceFull</option>
                <option value="PromoFull">PromoFull</option>
                <option value="Stores">Stores</option>
              </select>
              <input type="file" accept=".xml,.gz,.json,text/xml,application/gzip" disabled={uploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.currentTarget.value = ""; }}
                className="text-sm" data-testid="input-pc-upload-file" />
            </div>
            <p className="text-xs text-muted-foreground">הקובץ ינותח באופן הגנתי. שורות שלא ניתן למפות נספרות כשגיאות ומתועדות ביומן.</p>
          </Card>

          <Card className="p-4 space-y-2">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Activity className="w-4 h-4" /> היסטוריית ייבוא</h3>
            <div className="space-y-1 max-h-[420px] overflow-auto">
              {jobs.length === 0 && <p className="text-xs text-muted-foreground">אין עדיין הרצות ייבוא.</p>}
              {jobs.map((j) => (
                <div key={j.id} className="p-2 rounded border border-border text-sm" data-testid={`pc-job-${j.id}`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span>
                      <b className={j.status === "ok" ? "text-emerald-600" : j.status === "error" ? "text-destructive" : ""}>{j.status}</b>
                      <span className="text-xs text-muted-foreground"> · {j.trigger} · {j.kind || "—"} · {new Date(j.startedAt).toLocaleString("he-IL")}</span>
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => loadJobLogs(j.id)} data-testid={`button-pc-job-logs-${j.id}`}>יומן</Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    חנויות+{j.storesUpserted} · מוצרים+{j.productsUpserted} · מחירים+{j.pricesUpserted} · מבצעים+{j.promotionsUpserted} · שגיאות {j.errors}
                  </div>
                  {jobLogs[j.id] && (
                    <pre dir="ltr" className="mt-2 text-[11px] bg-muted/50 rounded p-2 max-h-40 overflow-auto whitespace-pre-wrap">
                      {jobLogs[j.id].map((l) => `[${l.level}] ${l.message}`).join("\n")}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Products + Prices */}
        <TabsContent value="products" className="space-y-4">
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">הוספת מוצר</h3>
            <div className="grid sm:grid-cols-4 gap-2">
              <Input placeholder="שם המוצר" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} data-testid="input-pc-product-name" />
              <Input placeholder="מותג" value={newProduct.brand} onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })} />
              <Input placeholder="יחידה" value={newProduct.unit} onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })} />
              <select className="border border-border rounded-md px-2 text-sm bg-background" value={newProduct.categoryId} onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })}>
                <option value="">— קטגוריה —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <Button size="sm" onClick={addProduct} data-testid="button-pc-add-product"><Plus className="w-4 h-4 ml-1" /> הוספה</Button>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-4 space-y-2">
              <h3 className="font-semibold text-sm">מוצרים ({products.length})</h3>
              <div className="space-y-1 max-h-[420px] overflow-auto">
                {products.map((p) => (
                  <div key={p.id} className={`flex items-center justify-between gap-2 p-2 rounded border ${selectedProduct?.id === p.id ? "border-primary bg-primary/5" : "border-border"}`}>
                    <button className="text-right text-sm flex-1" onClick={() => loadPrices(p)} data-testid={`pc-product-row-${p.id}`}>
                      <span className="font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground"> {[p.brand, p.unit].filter(Boolean).join(" · ")}</span>
                    </button>
                    <Button size="icon" variant="ghost" onClick={() => del(`/api/pc/admin/products/${p.id}`, loadAll)} data-testid={`button-pc-del-product-${p.id}`}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <h3 className="font-semibold text-sm">
                {selectedProduct ? `מחירים עבור: ${selectedProduct.name}` : "בחרו מוצר לעריכת מחירים"}
              </h3>
              {selectedProduct && (
                <>
                  <div className="space-y-1">
                    {productPrices.map((pr) => (
                      <div key={pr.id} className="flex items-center justify-between gap-2 text-sm p-2 rounded border border-border">
                        <span>{storeName(pr.storeId)}: <b className="tabular-nums">₪{pr.price.toFixed(2)}</b>{pr.onSale && <span className="text-primary"> · מבצע</span>}</span>
                        <Button size="icon" variant="ghost" onClick={() => del(`/api/pc/admin/prices/${pr.id}`, () => loadPrices(selectedProduct))}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    {productPrices.length === 0 && <p className="text-xs text-muted-foreground">אין עדיין מחירים למוצר זה.</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                    <select className="border border-border rounded-md px-2 text-sm bg-background" value={newPrice.storeId} onChange={(e) => setNewPrice({ ...newPrice, storeId: e.target.value })} data-testid="select-pc-price-store">
                      <option value="">— חנות —</option>
                      {stores.map((s) => <option key={s.id} value={s.id}>{s.name}{s.branch ? ` (${s.branch})` : ""}</option>)}
                    </select>
                    <Input type="number" step="0.01" min={0} placeholder="מחיר" value={newPrice.price} onChange={(e) => setNewPrice({ ...newPrice, price: e.target.value })} data-testid="input-pc-price" />
                    <label className="flex items-center gap-2 text-sm col-span-2">
                      <Switch checked={newPrice.onSale} onCheckedChange={(v) => setNewPrice({ ...newPrice, onSale: v })} /> במבצע
                    </label>
                    <Button size="sm" className="col-span-2" onClick={addPrice} data-testid="button-pc-add-price"><Plus className="w-4 h-4 ml-1" /> הוספת מחיר</Button>
                  </div>
                </>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Stores */}
        <TabsContent value="stores" className="space-y-4">
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">הוספת חנות</h3>
            <div className="grid sm:grid-cols-3 gap-2">
              <Input placeholder="שם החנות" value={newStore.name} onChange={(e) => setNewStore({ ...newStore, name: e.target.value })} data-testid="input-pc-store-name" />
              <Input placeholder="סניף" value={newStore.branch} onChange={(e) => setNewStore({ ...newStore, branch: e.target.value })} />
              <Input placeholder="עיר" value={newStore.city} onChange={(e) => setNewStore({ ...newStore, city: e.target.value })} />
            </div>
            <Button size="sm" onClick={addStore} data-testid="button-pc-add-store"><Plus className="w-4 h-4 ml-1" /> הוספה</Button>
          </Card>
          <Card className="p-4 space-y-1">
            {stores.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 p-2 rounded border border-border text-sm">
                <span>{s.name} {s.branch && <span className="text-muted-foreground">· {s.branch}</span>} {s.city && <span className="text-muted-foreground">· {s.city}</span>}</span>
                <Button size="icon" variant="ghost" onClick={() => del(`/api/pc/admin/stores/${s.id}`, loadAll)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            ))}
          </Card>
        </TabsContent>

        {/* Categories */}
        <TabsContent value="categories" className="space-y-4">
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">הוספת קטגוריה</h3>
            <div className="flex gap-2">
              <Input placeholder="שם הקטגוריה" value={newCat} onChange={(e) => setNewCat(e.target.value)} data-testid="input-pc-category-name" />
              <Button size="sm" onClick={addCategory} data-testid="button-pc-add-category"><Plus className="w-4 h-4 ml-1" /> הוספה</Button>
            </div>
          </Card>
          <Card className="p-4 space-y-1">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 p-2 rounded border border-border text-sm">
                <span>{c.name}</span>
                <Button size="icon" variant="ghost" onClick={() => del(`/api/pc/admin/categories/${c.id}`, loadAll)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            ))}
          </Card>
        </TabsContent>

        {/* Promotions */}
        <TabsContent value="promotions" className="space-y-4">
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">הוספת מבצע</h3>
            <div className="grid sm:grid-cols-3 gap-2">
              <Input placeholder="כותרת" value={newPromo.title} onChange={(e) => setNewPromo({ ...newPromo, title: e.target.value })} data-testid="input-pc-promo-title" />
              <Input placeholder="תיאור" value={newPromo.description} onChange={(e) => setNewPromo({ ...newPromo, description: e.target.value })} />
              <select className="border border-border rounded-md px-2 text-sm bg-background" value={newPromo.storeId} onChange={(e) => setNewPromo({ ...newPromo, storeId: e.target.value })}>
                <option value="">— כל החנויות —</option>
                {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <Button size="sm" onClick={addPromo} data-testid="button-pc-add-promo"><Plus className="w-4 h-4 ml-1" /> הוספה</Button>
          </Card>
          <Card className="p-4 space-y-1">
            {promotions.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 p-2 rounded border border-border text-sm">
                <span>{p.title}{p.storeId && <span className="text-muted-foreground"> · {storeName(p.storeId)}</span>}</span>
                <Button size="icon" variant="ghost" onClick={() => del(`/api/pc/admin/promotions/${p.id}`, loadAll)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            ))}
          </Card>
        </TabsContent>

        {/* Supplier submissions review (second track) */}
        <TabsContent value="submissions" className="space-y-4">
          <Card className="p-4 space-y-3" data-testid="pc-submissions">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="font-semibold text-sm">הצעות מחיר מספקים/עסקים</h3>
              <div className="flex items-center gap-2">
                <select className="border border-border rounded-md px-2 py-1 text-sm bg-background" value={subFilter} onChange={(e) => setSubFilter(e.target.value as any)} data-testid="select-pc-sub-filter">
                  <option value="pending">ממתינות לאישור</option>
                  <option value="approved">מאושרות</option>
                  <option value="rejected">נדחו</option>
                  <option value="all">הכול</option>
                </select>
                <Button size="sm" variant="outline" onClick={loadSubmissions} data-testid="button-pc-refresh-submissions"><RefreshCw className="w-4 h-4 ml-1" /> רענון</Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              הצעות שהוגשו על-ידי עסקים. הן אינן מופיעות בהשוואה הרשמית עד לאישור, וגם לאחר אישור הן מסומנות כ"מחיר ספק" בלבד — נפרד ממחירי הרשתות הרשמיים.
            </p>
            <div className="space-y-2 border-t border-border pt-3">
              {submissions.length === 0 && <p className="text-xs text-muted-foreground">אין הצעות בסטטוס זה.</p>}
              {submissions.map((sub) => (
                <div key={sub.id} className="p-3 rounded border border-border space-y-2" data-testid={`pc-submission-${sub.id}`}>
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="text-sm space-y-0.5">
                      <div><span className="font-semibold">{sub.productName}</span>{sub.brand && <span className="text-muted-foreground"> · {sub.brand}</span>}{sub.unit && <span className="text-muted-foreground"> · {sub.unit}</span>}</div>
                      <div className="tabular-nums">₪{sub.price.toFixed(2)}{sub.onSale && <span className="text-primary"> · מבצע</span>}{sub.validUntil && <span className="text-muted-foreground"> · בתוקף עד {sub.validUntil}</span>}</div>
                      <div className="text-xs text-muted-foreground">
                        {sub.storeName}{sub.city && ` · ${sub.city}`} · עסק: {sub.merchantName}{sub.merchantContact && ` · ${sub.merchantContact}`}
                      </div>
                      {sub.barcode && <div className="text-xs text-muted-foreground" dir="ltr">ברקוד: {sub.barcode}</div>}
                      {sub.note && <div className="text-xs text-muted-foreground">הערה: {sub.note}</div>}
                      <div className="text-xs text-muted-foreground">התקבל: {new Date(sub.createdAt).toLocaleString("he-IL")}</div>
                      {sub.status !== "pending" && (
                        <div className="text-xs">
                          סטטוס: <b className={sub.status === "approved" ? "text-emerald-600" : "text-destructive"}>{sub.status === "approved" ? "אושר" : "נדחה"}</b>
                          {sub.reviewedAt && ` · ${new Date(sub.reviewedAt).toLocaleString("he-IL")}`}
                        </div>
                      )}
                    </div>
                    {sub.status === "pending" && (
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" disabled={reviewing === sub.id} onClick={() => reviewSubmission(sub.id, "approve")} data-testid={`button-pc-approve-${sub.id}`}>אישור</Button>
                        <Button size="sm" variant="outline" disabled={reviewing === sub.id} onClick={() => reviewSubmission(sub.id, "reject")} data-testid={`button-pc-reject-${sub.id}`}>דחייה</Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Voluntary suppliers — self-submit tokens */}
        <TabsContent value="voluntary" className="space-y-4">
          <Card className="p-4 space-y-3" data-testid="pc-voluntary-new">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> חנות מצטרפת חדשה</h3>
            <p className="text-xs text-muted-foreground">
              יצירת קישור אישי לחנות מצטרפת (וולונטרית). דרך הקישור החנות מעלה בעצמה קובץ מחירים (CSV/XLSX/JSON) ללא צורך בהתחברות. המחירים מסומנים כ"מצטרפת" ומופיעים במסלול הוולונטרי הנפרד.
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">שם החנות</Label>
                <Input value={newVol.storeName} onChange={(e) => setNewVol({ ...newVol, storeName: e.target.value })} placeholder="מכולת השכונה" data-testid="input-pc-vol-name" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">עיר (לא חובה)</Label>
                <Input value={newVol.city} onChange={(e) => setNewVol({ ...newVol, city: e.target.value })} data-testid="input-pc-vol-city" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">דוא"ל איש קשר (לא חובה)</Label>
                <Input value={newVol.contactEmail} onChange={(e) => setNewVol({ ...newVol, contactEmail: e.target.value })} dir="ltr" data-testid="input-pc-vol-email" />
              </div>
            </div>
            <Button size="sm" disabled={creatingVol || !newVol.storeName.trim()} onClick={createVolToken} data-testid="button-pc-vol-create">
              <Plus className="w-4 h-4 ml-1" /> יצירת קישור
            </Button>
          </Card>

          <Card className="p-4 space-y-3" data-testid="pc-voluntary-list">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="font-semibold text-sm">חנויות מצטרפות</h3>
              <Button size="sm" variant="outline" onClick={loadVolTokens} data-testid="button-pc-vol-refresh"><RefreshCw className="w-4 h-4 ml-1" /> רענון</Button>
            </div>
            <div className="space-y-2 border-t border-border pt-3">
              {volTokens.length === 0 && <p className="text-xs text-muted-foreground">אין חנויות מצטרפות עדיין.</p>}
              {volTokens.map((t) => {
                const link = `${getPublicOrigin()}/#/submit/${t.token}`;
                return (
                  <div key={t.id} className="p-3 rounded border border-border space-y-2" data-testid={`pc-vol-${t.id}`}>
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="text-sm space-y-0.5">
                        <div className="font-semibold">{t.storeName}{t.city && <span className="text-muted-foreground"> · {t.city}</span>}</div>
                        {t.contactEmail && <div className="text-xs text-muted-foreground" dir="ltr">{t.contactEmail}</div>}
                        <div className="text-xs text-muted-foreground">
                          {t.lastUploadAt ? `העלאה אחרונה: ${new Date(t.lastUploadAt).toLocaleString("he-IL")} · סה"כ ${t.uploadCount}` : "טרם הועלו קבצים"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded ${t.active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{t.active ? "פעיל" : "בוטל"}</span>
                        <Button variant="ghost" size="icon" onClick={() => copy(link)} title="העתקת הקישור" data-testid={`button-pc-vol-copy-${t.id}`}><Copy className="w-4 h-4" /></Button>
                        <Button size="sm" variant="outline" onClick={() => toggleVolToken(t)} data-testid={`button-pc-vol-toggle-${t.id}`}>{t.active ? "ביטול" : "הפעלה"}</Button>
                      </div>
                    </div>
                    <code dir="ltr" className="block text-xs bg-muted/60 px-2 py-1 rounded border border-border break-all">{link}</code>
                  </div>
                );
              })}
            </div>
          </Card>
        </TabsContent>

        {/* Automation + API */}
        <TabsContent value="automation" className="space-y-4">
          <Card className="p-4 space-y-3" data-testid="pc-automation-info">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Activity className="w-4 h-4" /> אוטומציה: קול / מייל / וואטסאפ / n8n</h3>
            <p className="text-sm text-muted-foreground">
              ערוצי אוטומציה שולחים שאילתת מוצר, המערכת מחפשת במאגר, מתעדת את הבקשה, וכאשר יש פרטי קשר ונתונים מאומתים — שולחת ליד לאפיק ה-n8n הקיים. אין שינוי במבני ההודעות של טופסי הזכויות.
            </p>
            <div className="space-y-1">
              <Label className="text-xs">נקודת קצה לאוטומציה (POST)</Label>
              <code dir="ltr" className="block text-xs bg-muted/60 px-2 py-1 rounded border border-border">{origin}/api/pc/automation/query</code>
              <p className="text-xs text-muted-foreground">גוף הבקשה: {`{ channel: "voice|email|whatsapp|n8n", q: "חלב", city?, brand?, promoOnly?, contact? }`}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">נקודת קצה לתזמון יומי (POST, מאובטח בטוקן ה-API)</Label>
              <code dir="ltr" className="block text-xs bg-muted/60 px-2 py-1 rounded border border-border">{origin}/api/pc/cron/daily-import</code>
              <p className="text-xs text-muted-foreground">הגדירו ספק תזמון חיצוני (n8n / cron) שיקרא לכתובת הזו פעם ביום עם הטוקן. את הטוקן מנהלים במסך "גישת API".</p>
            </div>
            <a href={`${origin}/#/api-access`} className="text-sm text-primary inline-flex items-center gap-1" data-testid="link-pc-api-access">
              <ExternalLink className="w-4 h-4" /> ניהול טוקן ה-API
            </a>
          </Card>
        </TabsContent>

        {/* Settings */}
        <TabsContent value="settings" className="space-y-4">
          {!settings ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">טוען הגדרות…</Card>
          ) : (
            <SettingsForm settings={settings} saving={savingSettings} onSave={saveSettings} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SettingsForm({ settings, saving, onSave }: { settings: PcSettings; saving: boolean; onSave: (patch: Partial<PcSettings>) => void }) {
  const [form, setForm] = useState<PcSettings>(settings);
  useEffect(() => { setForm(settings); }, [settings]);

  return (
    <Card className="p-4 space-y-4" data-testid="pc-settings-form">
      <h3 className="font-semibold flex items-center gap-2"><Settings2 className="w-4 h-4" /> הגדרות השוואת מחירים</h3>

      <div className="space-y-3 border-t border-border pt-3">
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>האתר הציבורי פעיל
            <span className="block text-xs text-muted-foreground">כשכבוי — המבקרים יראו הודעה שהאתר אינו זמין כעת.</span>
          </span>
          <Switch checked={form.publicEnabled} onCheckedChange={(v) => onSave({ publicEnabled: v })} data-testid="switch-pc-public-enabled" />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>הצגת נתוני דמו/דוגמה
            <span className="block text-xs text-muted-foreground">השאירו דלוק עד להזנת נתונים אמיתיים.</span>
          </span>
          <Switch checked={form.showSampleData} onCheckedChange={(v) => onSave({ showSampleData: v })} data-testid="switch-pc-sample-data" />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>פורטל ספקים/חנויות (עתידי)
            <span className="block text-xs text-muted-foreground">תשתית להרשמת ספקים בעתיד. כבוי כברירת מחדל.</span>
          </span>
          <Switch checked={form.merchantPortalEnabled} onCheckedChange={(v) => onSave({ merchantPortalEnabled: v })} data-testid="switch-pc-merchant-portal" />
        </label>
      </div>

      <div className="space-y-3 border-t border-border pt-3">
        <div className="space-y-1">
          <Label className="text-xs">כותרת ראשית באתר הציבורי</Label>
          <Input value={form.publicTitle} onChange={(e) => setForm({ ...form, publicTitle: e.target.value })} data-testid="input-pc-public-title" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">כותרת משנה / תיאור</Label>
          <Textarea value={form.publicSubtitle} onChange={(e) => setForm({ ...form, publicSubtitle: e.target.value })} aria-label="כותרת משנה / תיאור" data-testid="input-pc-public-subtitle" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">טקסט יצירת קשר (מוצג בתחתית האתר, לא חובה)</Label>
          <Textarea value={form.contactText} onChange={(e) => setForm({ ...form, contactText: e.target.value })} aria-label="טקסט יצירת קשר (מוצג בתחתית האתר, לא חובה)" data-testid="input-pc-contact-text" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">נקודת קצה לאוטומציה (לא חובה)</Label>
          <Input dir="ltr" value={form.automationEndpoint} onChange={(e) => setForm({ ...form, automationEndpoint: e.target.value })} placeholder="ברירת מחדל: אפיק הוובהוק הקיים" data-testid="input-pc-automation-endpoint" />
          <p className="text-xs text-muted-foreground">השאירו ריק כדי להשתמש באפיק הוובהוק הקיים. אין לשמור כאן סודות/מפתחות.</p>
        </div>
        <Button size="sm" disabled={saving} onClick={() => onSave({
          publicTitle: form.publicTitle, publicSubtitle: form.publicSubtitle,
          contactText: form.contactText, automationEndpoint: form.automationEndpoint,
        })} data-testid="button-pc-save-settings">
          <Save className="w-4 h-4 ml-1" /> שמירת ההגדרות
        </Button>
      </div>
    </Card>
  );
}
