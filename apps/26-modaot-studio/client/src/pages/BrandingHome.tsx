// מחלקת מיתוג — עמוד נחיתה. מציג את התהליך, ארכיטיפים, ורשימת מותגים שמורים.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Compass, Palette, PenTool, BookOpen, ArrowLeft, Home as HomeIcon,
  Sparkles, ScrollText, Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ARCHETYPES, ARCHETYPE_GROUPS } from "@shared/branding";

interface BrandRow {
  id: number;
  brandName: string;
  logoPng: string | null;
  logoSvg: string | null;
  updatedAt: number;
}

const dateLabel = (seconds: number) =>
  new Date(seconds * 1000).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });

const STEPS = [
  { icon: Compass, title: "בריף אסטרטגי", desc: "שאלון עומק בן 35 שאלות (או 12 שאלות ליבה) שממפה זהות, קהל, מסרים והעדפות חזותיות" },
  { icon: Sparkles, title: "אסטרטגיה + ארכיטיפ", desc: "מנוע Claude בוחר ארכיטיפ מותג (יונג), מנסח מיצוב, ערכים וקול המותג" },
  { icon: Palette, title: "פלטה וטיפוגרפיה", desc: "פלטת צבעים עם HEX/RGB/CMYK ויחסי שימוש, וסולם טיפוגרפי בגופנים עבריים" },
  { icon: PenTool, title: "לוגו + וקטור", desc: "קונספטי לוגו ב-Nano Banana Pro עם עברית מדויקת, וקטוריזציה ל-SVG חד דרך Recraft" },
  { icon: BookOpen, title: "ספר מותג", desc: "ספר מותג מלא בן 7 סעיפים — מוכן להורדה כ-PDF ולהעברה למעצבים ולספקים" },
];

export default function BrandingHome() {
  const [, navigate] = useLocation();
  const { data: brands } = useQuery<BrandRow[]>({ queryKey: ["/api/brands"] });
  const [busyId, setBusyId] = useState<number | null>(null);

  async function del(id: number) {
    if (busyId !== null) return;
    if (!confirm("למחוק את המותג?")) return;
    setBusyId(id);
    try {
      await apiRequest("DELETE", `/api/brands/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#F5EEDD]" dir="rtl">
      <div
        className="pointer-events-none fixed inset-0 opacity-40"
        style={{ background: "radial-gradient(circle at 15% 0%, rgba(201,162,39,0.12), transparent 45%), radial-gradient(circle at 85% 25%, rgba(201,162,39,0.08), transparent 40%)" }}
      />
      {/* כותרת */}
      <header className="relative z-10 border-b border-[#C9A227]/20 bg-[#0B1220]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <ScrollText className="h-6 w-6 text-[#C9A227]" />
            <h1 className="text-xl font-bold tracking-wide">מחלקת <span className="text-[#C9A227]">המיתוג</span></h1>
          </div>
          <Button
            variant="outline"
            className="gap-2 border-[#C9A227]/40 text-[#C9A227] hover:bg-[#C9A227]/10"
            onClick={() => navigate("/")}
            data-testid="link-home"
          >
            <HomeIcon className="h-4 w-4" /> למנוע המודעות
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-14">
        {/* פתיח */}
        <section className="mb-14 text-center">
          <p className="mb-3 text-sm font-medium tracking-wide text-[#C9A227]">זהות מותג מלאה — מהאסטרטגיה ועד ספר המותג</p>
          <h2 className="mx-auto max-w-3xl text-xl font-bold leading-relaxed text-[#F5EEDD]">
            בונים מותג שלם: ארכיטיפ, מיצוב, פלטה, טיפוגרפיה, לוגו וקטורי וספר מותג — הכל מותאם לקהל התורני
          </h2>
          <div className="mt-8 flex justify-center gap-3">
            <Button
              size="lg"
              className="gap-2 bg-[#C9A227] text-[#0B1220] hover:bg-[#DDB63A]"
              onClick={() => navigate("/branding/brief")}
              data-testid="button-start-brief"
            >
              <Sparkles className="h-5 w-5" /> התחל בריף מותג
            </Button>
          </div>
        </section>

        {/* התהליך */}
        <section className="mb-16">
          <h3 className="mb-6 text-center text-xl font-bold">איך זה עובד</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <Card key={i} className="border-[#C9A227]/20 bg-[#101B32]">
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#C9A227]/15">
                        <Icon className="h-5 w-5 text-[#C9A227]" />
                      </div>
                      <span className="text-xs font-bold text-[#C9A227]">שלב {i + 1}</span>
                    </div>
                    <h4 className="mb-1 text-sm font-bold">{s.title}</h4>
                    <p className="text-xs leading-relaxed text-[#F5EEDD]/70">{s.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* מותגים שמורים */}
        {brands && brands.length > 0 && (
          <section className="mb-16">
            <h3 className="mb-6 text-xl font-bold">המותגים שלי</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {brands.map((b) => (
                <Card
                  key={b.id}
                  className="group cursor-pointer border-[#C9A227]/20 bg-[#101B32] transition hover:border-[#C9A227]/60"
                  onClick={() => navigate(`/branding/${b.id}`)}
                  data-testid={`card-brand-${b.id}`}
                >
                  <div className="flex h-32 items-center justify-center border-b border-[#C9A227]/10 bg-white/95 p-4">
                    {b.logoPng ? (
                      <img src={b.logoPng} alt={b.brandName} className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="text-sm text-[#0B1220]/40">אין עדיין לוגו</span>
                    )}
                  </div>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <h4 className="text-sm font-bold" data-testid={`text-brand-name-${b.id}`}>{b.brandName}</h4>
                      {b.logoSvg && <Badge variant="outline" className="mt-1 border-[#C9A227]/40 text-[10px] text-[#C9A227]">SVG וקטורי</Badge>}
                      <p className="mt-1 text-[10px] text-[#F5EEDD]/40" data-testid={`text-brand-updated-${b.id}`}>
                        עודכן לאחרונה {dateLabel(b.updatedAt)}
                      </p>
                    </div>
                    <button
                      className="text-[#F5EEDD]/40 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={(e) => { e.stopPropagation(); del(b.id); }}
                      disabled={busyId === b.id}
                      data-testid={`button-delete-brand-${b.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* ארכיטיפים */}
        <section>
          <h3 className="mb-2 text-xl font-bold">12 ארכיטיפי המותג</h3>
          <p className="mb-6 text-sm text-[#F5EEDD]/70">מבוסס על תורת הארכיטיפים של יונג — כל מותג נשען על ארכיטיפ דומיננטי אחד</p>
          {ARCHETYPE_GROUPS.map((g) => (
            <div key={g.key} className="mb-6">
              <h4 className="mb-3 text-sm font-bold text-[#C9A227]">{g.name}</h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {ARCHETYPES.filter((a) => a.group === g.key).map((a) => (
                  <div key={a.key} className="rounded-lg border border-[#C9A227]/15 bg-[#101B32] p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="flex gap-1">
                        {a.palette.slice(0, 3).map((c, i) => (
                          <span key={i} className="h-4 w-4 rounded-full border border-white/10" style={{ background: c }} />
                        ))}
                      </div>
                      <h5 className="text-sm font-bold">{a.name}</h5>
                    </div>
                    <p className="text-xs leading-relaxed text-[#F5EEDD]/60">{a.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
