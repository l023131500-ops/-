import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ArrowRight, Images, Sparkles } from "lucide-react";

interface AdRow {
  id: number;
  adType: string;
  styleId: string;
  community: string;
  fields: Record<string, string>;
  status: string;
  createdAt: number;
}

const TYPE_NAMES: Record<string, string> = {
  memorial: "מודעת אבל",
  event: "מודעת שמחה",
  organization: "מודעת ארגון",
};

export default function Gallery() {
  const { data: ads, isLoading } = useQuery<AdRow[]>({ queryKey: ["/api/ads"] });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo />
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1.5" data-testid="link-home">
              <Sparkles className="w-4 h-4" /> צור מודעה
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-lg font-bold flex items-center gap-2" style={{ fontFamily: '"Frank Ruhl Libre", serif' }}>
            <Images className="w-5 h-5 text-primary" /> היסטוריית מודעות
          </h1>
          <p className="text-sm text-muted-foreground">מודעות שנוצרו במערכת (הטיוטות נשמרות ללא התמונה המלאה ב-POC)</p>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">טוען…</p>
        ) : !ads || ads.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Images className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="mb-4">עדיין לא נוצרו מודעות</p>
            <Link href="/">
              <Button className="gap-1.5" data-testid="button-create-first">
                <Sparkles className="w-4 h-4" /> צור מודעה ראשונה
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ads.map((a) => {
              const title = a.fields.deceased || a.fields.headline || a.fields.names || "מודעה";
              return (
                <div key={a.id} className="rounded-xl border border-card-border bg-card p-4" data-testid={`row-ad-${a.id}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {TYPE_NAMES[a.adType] || a.adType}
                    </span>
                    <span className={`text-xs ${a.status === "done" ? "text-primary" : a.status === "error" ? "text-destructive" : "text-muted-foreground"}`}>
                      {a.status === "done" ? "הושלם" : a.status === "error" ? "שגיאה" : "טיוטה"}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm truncate" style={{ fontFamily: '"Frank Ruhl Libre", serif' }}>{title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(a.createdAt * 1000).toLocaleString("he-IL")}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
