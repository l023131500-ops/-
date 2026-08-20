import { useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Logo } from "@/components/logo";
import { API_BASE } from "@/lib/queryClient";
import { ArrowRight, Store, TrendingUp } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from "recharts";

// Retry through the pplx.app sandbox cold-start 503 window.
async function fetchApi(path: string, retries = 4): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    const res = await fetch(`${API_BASE}${path}`).catch(() => null);
    if (res && res.status !== 503) return res;
    if (i < retries) await new Promise((r) => setTimeout(r, 1500 + i * 1000));
  }
  return fetch(`${API_BASE}${path}`);
}

type PcChainKind = "regulatory" | "voluntary";

interface PcCompareOffer {
  storeId: number; storeName: string; chainId: string | null; chainKind: PcChainKind;
  city: string | null; neighborhood: string | null;
  price: number; unitPrice: number | null; onSale: boolean; saleNote: string | null;
  updatedAt: string | null; isCheapest: boolean;
}
interface PcHistoryRow { storeId: number; price: number; onSale: boolean; source: string | null; recordedAt: string }
interface PcComparison {
  product: { id: number; name: string; brand: string | null; unit: string | null; barcode: string | null; imageUrl: string | null };
  categoryName: string | null;
  barcode: string;
  chainCount: number;
  cheapestPrice: number | null;
  dearestPrice: number | null;
  spreadPct: number | null;
  offers: PcCompareOffer[];
  regulatory: PcCompareOffer[];
  voluntary: PcCompareOffer[];
  history: PcHistoryRow[];
}

const fmt = (n: number) => `₪${n.toFixed(2)}`;
const KIND_LABEL: Record<PcChainKind, string> = { regulatory: "רשתות מפוקחות (חוק שקיפות)", voluntary: "רשתות מצטרפות (התנדבותי)" };

function formatUpdatedAt(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

function OfferTable({ offers }: { offers: PcCompareOffer[] }) {
  if (offers.length === 0) {
    return <div className="text-xs text-muted-foreground py-2">אין כרגע מחירים מקבוצה זו.</div>;
  }
  return (
    <table className="w-full text-sm" data-testid="compare-offer-table">
      <thead>
        <tr className="text-muted-foreground text-xs border-b border-border">
          <th className="text-right font-medium py-2">חנות / רשת</th>
          <th className="text-right font-medium py-2">עיר</th>
          <th className="text-right font-medium py-2">עודכן</th>
          <th className="text-left font-medium py-2">מחיר</th>
        </tr>
      </thead>
      <tbody>
        {offers.map((o) => (
          <tr key={o.storeId} className={`border-b border-border/60 ${o.isCheapest ? "bg-primary/5" : ""}`} data-testid={`compare-offer-${o.storeId}`}>
            <td className={`py-2 ${o.isCheapest ? "font-semibold text-primary" : ""}`}>
              {o.storeName}
              {o.isCheapest && <span className="text-[11px] mr-1 px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">הזול ביותר</span>}
              {o.onSale && <span className="text-[11px] text-primary"> · מבצע</span>}
            </td>
            <td className="py-2 text-muted-foreground text-xs">{o.city || "—"}</td>
            <td className="py-2 text-muted-foreground text-xs">{formatUpdatedAt(o.updatedAt) || "—"}</td>
            <td className={`py-2 text-left tabular-nums ${o.isCheapest ? "font-bold text-primary" : ""}`}>{fmt(o.price)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function PublicProductCompare() {
  const [, params] = useRoute("/compare/:barcode");
  const barcode = params?.barcode ? decodeURIComponent(params.barcode) : "";
  const [data, setData] = useState<PcComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!barcode) return;
    setLoading(true);
    setNotFound(false);
    fetchApi(`/api/pc/public/compare/${encodeURIComponent(barcode)}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        if (!r.ok) return null;
        return r.json();
      })
      .then((d: PcComparison | null) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [barcode]);

  // Build a cheapest-over-time sparkline series from history (oldest → newest).
  const series = useMemo(() => {
    if (!data || data.history.length === 0) return [];
    const byTime = [...data.history].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
    return byTime.map((h) => ({ t: h.recordedAt, price: h.price }));
  }, [data]);

  return (
    <div className="min-h-screen bg-background" dir="rtl" data-testid="page-public-product-compare">
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <Link href="/" data-testid="link-compare-home"><a className="flex items-center gap-2"><Logo className="h-8 w-auto" /></a></Link>
          <Link href="/price-comparison" data-testid="link-compare-back-search">
            <a className="text-sm text-primary inline-flex items-center gap-1">חזרה לחיפוש <ArrowRight className="w-4 h-4" /></a>
          </Link>
        </div>
      </header>

      <main id="main-content" className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {loading ? (
          <>
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-48 rounded-lg" />
          </>
        ) : notFound || !data ? (
          <Card className="p-8 text-center text-sm text-muted-foreground space-y-2" data-testid="compare-not-found">
            <Store className="w-8 h-8 text-muted-foreground mx-auto" />
            <div className="font-semibold text-foreground">המוצר לא נמצא</div>
            <p>לא נמצא מוצר עם הברקוד <span dir="ltr">{barcode}</span> במאגר.</p>
            <Link href="/price-comparison" data-testid="link-compare-empty-search">
              <a className="text-primary inline-flex items-center gap-1 justify-center">חזרה לחיפוש <ArrowRight className="w-4 h-4" /></a>
            </Link>
          </Card>
        ) : (
          <>
            <section className="space-y-3" data-testid="compare-header">
              <h1 className="text-2xl font-bold tracking-tight">{data.product.name}</h1>
              <div className="text-sm text-muted-foreground">
                {[data.product.brand, data.product.unit, data.categoryName].filter(Boolean).join(" · ")}
              </div>
              <div className="text-xs text-muted-foreground" dir="ltr">ברקוד: {data.barcode}</div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs px-2.5 py-1 rounded-full bg-muted/70 border border-border" data-testid="compare-chaincount">
                  נמכר ב-{data.chainCount} רשתות
                </span>
                {data.cheapestPrice != null && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20" data-testid="compare-cheapest">
                    הזול ביותר: {fmt(data.cheapestPrice)}
                  </span>
                )}
                {data.spreadPct != null && data.spreadPct > 0 && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30" data-testid="compare-spread">
                    פער מחירים {data.spreadPct}%
                  </span>
                )}
              </div>
            </section>

            {series.length > 1 && (
              <Card className="p-4 space-y-2" data-testid="compare-history">
                <h2 className="text-sm font-semibold flex items-center gap-1"><TrendingUp className="w-4 h-4 text-primary" /> מגמת מחיר</h2>
                <div className="h-24" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <YAxis hide domain={["dataMin", "dataMax"]} />
                      <Tooltip formatter={(v: number) => fmt(Number(v))} labelFormatter={(l) => formatUpdatedAt(String(l)) || ""} />
                      <Line type="monotone" dataKey="price" stroke="#01696F" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            {/* Regulatory vs voluntary — kept as two distinct groupings. */}
            <section className="space-y-2" data-testid="compare-regulatory">
              <h2 className="text-sm font-semibold">{KIND_LABEL.regulatory}</h2>
              <Card className="p-4"><OfferTable offers={data.regulatory} /></Card>
            </section>
            <section className="space-y-2" data-testid="compare-voluntary">
              <h2 className="text-sm font-semibold">{KIND_LABEL.voluntary}</h2>
              <Card className="p-4"><OfferTable offers={data.voluntary} /></Card>
            </section>

            <p className="text-[11px] text-muted-foreground/80">
              הנתונים מבוססים על קובצי שקיפות מחירים שמפרסמות הרשתות לפי חוק ועל מקורות מצטרפים. המחירים נכונים למועד העדכון האחרון.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
