import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Download, Globe, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// docs/architecture.md §8 "Whitelist נטפרי (חובה)" — the fixed base list every
// deployment of this platform needs whitelisted, regardless of which tenants
// have a custom domain activated.
const BASE_WHITELIST = [
  "https://egod.lovable.app",
  "https://*.lovable.app",
  "https://hkkkynyoigzlttpynoeo.supabase.co",
  "wss://hkkkynyoigzlttpynoeo.supabase.co",
  "https://cdn.gpteng.co",
  "https://ai.gateway.lovable.dev",
];

export default function AdminWhitelist() {
  const [copied, setCopied] = useState(false);

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["admin-whitelist-domains"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, slug, display_name, status, custom_domain")
        .not("custom_domain", "is", null)
        .order("display_name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const activeDomains = tenants.filter((t) => t.status === "active");
  const inactiveDomains = tenants.filter((t) => t.status !== "active");

  const fullList = useMemo(() => {
    const custom = activeDomains.map((t) => `https://${t.custom_domain}`);
    return [...BASE_WHITELIST, ...custom];
  }, [activeDomains]);

  const copyList = async () => {
    try {
      await navigator.clipboard.writeText(fullList.join("\n"));
      setCopied(true);
      toast.success("הרשימה הועתקה");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("שגיאה בהעתקה");
    }
  };

  const downloadList = () => {
    const blob = new Blob([fullList.join("\n") + "\n"], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "netfree-whitelist.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl flex items-center gap-2">
          <ShieldCheck className="h-7 w-7" /> רשימת נטפרי (Whitelist)
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyList}>
            <Copy className="h-4 w-4 ml-1" /> {copied ? "הועתק!" : "העתק רשימה"}
          </Button>
          <Button onClick={downloadList}>
            <Download className="h-4 w-4 ml-1" /> הורדה כקובץ
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-6 max-w-3xl">
        רשימה זו מיועדת לשליחה לשירות הסינון "נטפרי" כדי שכל האתרים והדומיינים המשמשים את
        המערכת (כולל דומיינים מותאמים אישית שהופעלו לטננטים) לא ייחסמו. הרשימה הבסיסית קבועה
        (תשתית הפלטפורמה); הדומיינים המותאמים מתעדכנים אוטומטית לפי{" "}
        <span className="font-medium">דף פרטי ארגון ← דומיין מותאם אישית</span> לכל טננט פעיל.
      </p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">רשימה בסיסית (תשתית)</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 font-mono text-sm" dir="ltr">
            {BASE_WHITELIST.map((d) => (
              <li key={d} className="text-foreground/90">{d}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-4 w-4" /> דומיינים מותאמים — טננטים פעילים
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground text-sm">טוען...</div>
          ) : activeDomains.length === 0 ? (
            <div className="text-muted-foreground text-sm">
              אין כרגע טננט פעיל עם דומיין מותאם אישית. ניתן להוסיף דרך דף פרטי הארגון.
            </div>
          ) : (
            <div className="divide-y">
              {activeDomains.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-sm font-medium">{t.display_name}</div>
                    <div className="text-xs text-muted-foreground font-mono" dir="ltr">https://{t.custom_domain}</div>
                  </div>
                  <Badge>פעיל</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {inactiveDomains.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-muted-foreground">דומיינים שהוגדרו אך הטננט אינו פעיל</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              דומיינים אלו אינם נכללים ברשימה שמועתקת/מורדת — הטננט אינו פעיל ולכן האתר לא אמור להיות
              מוגש בו כרגע.
            </p>
            <div className="divide-y">
              {inactiveDomains.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-sm font-medium">{t.display_name}</div>
                    <div className="text-xs text-muted-foreground font-mono" dir="ltr">https://{t.custom_domain}</div>
                  </div>
                  <Badge variant="secondary">{t.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
