import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";
import { API_BASE } from "@/lib/queryClient";
import { CheckCircle2, Download, FileUp, Store } from "lucide-react";

interface TokenInfo {
  storeName: string;
  city: string | null;
  lastUploadAt: string | null;
  uploadCount: number;
}

interface UploadResult {
  ok: boolean;
  productsUpserted: number;
  pricesCreated: number;
  pricesUpdated: number;
  errors: number;
}

export default function VoluntarySubmitPage() {
  const [, params] = useRoute("/submit/:token");
  const token = params?.token || "";
  const { toast } = useToast();
  const [info, setInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/pc/submit/${encodeURIComponent(token)}/info`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("invalid"))))
      .then((d: TokenInfo) => setInfo(d))
      .catch(() => setInvalid(true))
      .finally(() => setLoading(false));
  }, [token]);

  async function upload() {
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`${API_BASE}/api/pc/submit/${encodeURIComponent(token)}`, { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.message || "העלאה נכשלה");
      setResult(d);
      toast({ title: "הקובץ התקבל", description: `נקלטו ${d.productsUpserted} מוצרים, ${d.pricesCreated + d.pricesUpdated} מחירים.` });
    } catch (e: any) {
      toast({ title: "העלאה נכשלה", description: e?.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/30" dir="rtl">
      <header className="bg-white border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Logo />
          <span className="text-sm text-muted-foreground">העלאת מחירים — חנות מצטרפת</span>
        </div>
      </header>

      <main id="main-content" className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        {loading ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">טוען…</Card>
        ) : invalid || !info ? (
          <Card className="p-8 text-center space-y-2" role="alert" aria-live="assertive">
            <h1 className="font-semibold text-lg">הקישור אינו תקין</h1>
            <p className="text-sm text-muted-foreground">ייתכן שהקישור בוטל או שגוי. פנו למנהל המערכת לקבלת קישור חדש.</p>
          </Card>
        ) : (
          <>
            <Card className="p-5 space-y-2">
              <h1 className="font-semibold text-xl flex items-center gap-2" style={{ color: "#01696F" }}>
                <Store className="w-5 h-5" /> {info.storeName}
              </h1>
              {info.city && <p className="text-sm text-muted-foreground">{info.city}</p>}
              <p className="text-sm text-muted-foreground">
                כאן ניתן להעלות את קובץ המחירים של החנות. המחירים ישולבו בהשוואת המחירים הציבורית במסלול החנויות המצטרפות.
              </p>
              {info.lastUploadAt && (
                <p className="text-xs text-muted-foreground">
                  העלאה אחרונה: {new Date(info.lastUploadAt).toLocaleString("he-IL")} (סה"כ {info.uploadCount})
                </p>
              )}
            </Card>

            <Card className="p-5 space-y-3">
              <h2 className="font-semibold text-sm">הוראות</h2>
              <ul className="text-sm text-muted-foreground list-disc pr-5 space-y-1">
                <li>הקובץ יכול להיות בפורמט CSV, Excel‏ (XLSX) או JSON.</li>
                <li>העמודות הנדרשות: <b>barcode</b> (ברקוד), <b>product_name</b> (שם מוצר), <b>brand</b> (מותג), <b>unit</b> (יחידה), <b>price</b> (מחיר).</li>
                <li>הברקוד הוא מפתח ההשוואה בין החנויות — חשוב למלא אותו במדויק.</li>
                <li>אפשר להוריד תבנית מוכנה ולמלא אותה.</li>
              </ul>
              <a
                href={`/api/pc/submit/${encodeURIComponent(token)}/template.csv`}
                className="inline-flex items-center gap-1 text-sm"
                style={{ color: "#01696F" }}
                data-testid="link-vol-template"
              >
                <Download className="w-4 h-4" /> הורדת תבנית CSV
              </a>
            </Card>

            <Card className="p-5 space-y-3">
              <h2 className="font-semibold text-sm">העלאת קובץ</h2>
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.json,text/csv,application/json"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm file:ml-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm"
                data-testid="input-vol-file"
              />
              <Button
                onClick={upload}
                disabled={!file || uploading}
                style={{ backgroundColor: "#01696F" }}
                data-testid="button-vol-upload"
              >
                <FileUp className="w-4 h-4 ml-1" /> {uploading ? "מעלה…" : "העלאה"}
              </Button>

              {result && (
                <div className="text-sm border-t border-border pt-3 flex items-start gap-2" role="status" aria-live="polite" data-testid="vol-result">
                  <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "#01696F" }} />
                  <div>
                    <p className="font-semibold">הקובץ נקלט בהצלחה</p>
                    <p className="text-muted-foreground">
                      מוצרים: {result.productsUpserted} · מחירים חדשים: {result.pricesCreated} · עודכנו: {result.pricesUpdated}
                      {result.errors > 0 && ` · שגיאות: ${result.errors}`}
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
