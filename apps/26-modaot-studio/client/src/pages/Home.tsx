// עמוד הבית — נחיתה מרשימה בעברית, RTL, אווירה חרדית-מכובדת (נייבי כהה + זהב).
// שלוש נקודות כניסה + גלריית תבניות חיה (CanvasStage) עם סינון לפי קבוצה.

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles,
  PenLine,
  LayoutTemplate,
  BookOpen,
  Heart,
  Calendar,
  Users,
  Crown,
  ArrowLeft,
  ScrollText,
  FolderOpen,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CanvasStage from "@/components/CanvasStage";
import { getStyle } from "@shared/styles";
import { getCategory, GROUPS } from "@shared/knowledge";
import { getTemplateDef } from "@shared/templates";
import { applyCategoryDefaults } from "@/lib/copyEngine";
import { useTemplateContext } from "@/lib/templateContext";
import type { TemplateDoc } from "@shared/layers";

interface TemplateRow {
  id: number;
  category: string;
  style: string;
  format: string;
  name: string;
  width: number;
  height: number;
  layersJson: string;
  builtin: number;
}

const GROUP_ICONS: Record<string, any> = {
  shiurim: BookOpen,
  lifecycle: Heart,
  yearcycle: Calendar,
  events: Users,
};

export default function Home() {
  const [, navigate] = useLocation();
  const { setSelected } = useTemplateContext();
  const [activeGroup, setActiveGroup] = useState<string>("shiurim");

  const { data: templates, isLoading } = useQuery<TemplateRow[]>({
    queryKey: ["/api/templates"],
  });

  const parsedTemplates = useMemo(() => {
    if (!templates) return [];
    return templates.map((t) => {
      let doc: TemplateDoc | null = null;
      try {
        const parsed = JSON.parse(t.layersJson);
        // layersJson מכיל רק {background, layers} — יש להשלים width/height מהשורה עצמה
        doc = { width: t.width, height: t.height, background: parsed.background, layers: parsed.layers };
      } catch {
        doc = null;
      }
      return { ...t, doc };
    });
  }, [templates]);

  const filtered = useMemo(() => {
    return parsedTemplates.filter((t) => {
      const cat = getCategory(t.category);
      return (cat?.group ?? "shiurim") === activeGroup;
    });
  }, [parsedTemplates, activeGroup]);

  function openTemplate(t: { id: number; category: string; style: string; format: string; name: string; doc: TemplateDoc | null }) {
    if (!t.doc) return;
    const withDefaults = applyCategoryDefaults(t.doc, t.category);
    setSelected({
      doc: withDefaults,
      category: t.category,
      style: t.style,
      format: t.format,
      name: t.name,
      templateId: t.id,
    });
    navigate("/editor");
  }

  function openBlankFlow() {
    // ברירת מחדל: התחלה מתבנית "שיעור עיון בגמרא" — הראשונה שבנויה עבור ה-POC
    const def = getTemplateDef("shiur_malchut");
    if (!def) return;
    const doc = applyCategoryDefaults(def.build(1080, 1350), def.category);
    setSelected({
      doc,
      category: def.category,
      style: def.style,
      format: def.format,
      name: def.name,
    });
    navigate("/editor");
  }

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#F5EEDD]" dir="rtl">
      {/* רקע דקורטיבי עדין */}
      <div
        className="pointer-events-none fixed inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(circle at 20% 0%, rgba(201,162,39,0.12), transparent 45%), radial-gradient(circle at 85% 20%, rgba(201,162,39,0.08), transparent 40%)",
        }}
      />

      {/* כותרת עליונה */}
      <header className="relative z-10 border-b border-[#C9A227]/20 bg-[#0B1220]/80 backdrop-blur">
        {/* ‎flex-wrap‎ ולא ‎justify-between‎ לבדו: ברוחב 390 הכותרת
            ("מודעות · מנוע העיצוב החרדי", ‎text-xl‎) וקבוצת הכפתורים לא
            נכנסות יחד ל-342px שנשארים אחרי ‎px-6‎, והשורה דחפה את העמוד
            ל-507px — גלישה אופקית של 117px. עם גלישת שורה הן פשוט יורדות
            אחת מתחת לשנייה, ובדסקטופ שום דבר לא משתנה. */}
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-y-3 px-6 py-5">
          <div className="flex items-center gap-3">
            <Crown className="h-6 w-6 text-[#C9A227]" />
            <h1 className="text-xl font-bold tracking-wide">
              מודעות <span className="text-[#C9A227]">·</span> מנוע העיצוב החרדי
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="gap-2 border-[#C9A227]/40 text-[#C9A227] hover:bg-[#C9A227]/10"
              onClick={() => navigate("/projects")}
              data-testid="link-projects"
            >
              <FolderOpen className="h-4 w-4" /> העבודות שלי
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-[#C9A227]/40 text-[#C9A227] hover:bg-[#C9A227]/10"
              onClick={() => navigate("/branding")}
              data-testid="link-branding"
            >
              <ScrollText className="h-4 w-4" /> מחלקת מיתוג
            </Button>
            <a
              href="https://more30.com/subscribe?app=studio"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-[#C9A227]/40 px-3 text-sm font-medium text-[#C9A227] transition hover:bg-[#C9A227]/10"
              data-testid="link-pricing"
            >
              <Crown className="h-4 w-4" /> מחירון
            </a>
            <Badge variant="outline" className="border-[#C9A227]/40 text-[#C9A227]">
              גרסת POC
            </Badge>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-14">
        {/* פתיח */}
        <section className="mb-16 text-center">
          <p className="mb-3 text-sm font-medium tracking-wide text-[#C9A227]">
            עיצוב מודעות ברמת מעצב — לשיעורי תורה, שמחות ואירועי הקהילה
          </p>
          <h2 className="mx-auto max-w-3xl text-xl font-bold leading-relaxed text-[#F5EEDD] sm:text-xl">
            כותרות ענקיות, מסגרות זהב ועיטורי יודאיקה — כל מודעה נבנית משכבות טקסט אמיתיות,
            לא תמונה שטוחה
          </h2>
        </section>

        {/* שלוש נקודות כניסה */}
        <section className="mb-16 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <EntryCard
            icon={<Sparkles className="h-7 w-7 text-[#C9A227]" />}
            title="בריף חכם"
            desc="שאלון קצר שמבין את הקונספט — ומציע 3-4 כיווני עיצוב מנוסחים בדיוק לרעיון שלך"
            highlight
            onClick={() => navigate("/brief")}
          />
          <EntryCard
            icon={<LayoutTemplate className="h-7 w-7 text-[#C9A227]" />}
            title="מחלקת הפרסום"
            desc="גלריית מאות סגנונות — חתימות של משרדי הפרסום המובילים. סנן לפי משרד ואווירה"
            onClick={() => navigate("/studio")}
          />
          <EntryCard
            icon={<PenLine className="h-7 w-7 text-[#C9A227]" />}
            title="התחל מתבנית"
            desc="עיין בגלריית התבניות המעוצבות למטה והתחל מהן ישירות"
            onClick={() => {
              document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth" });
            }}
          />
        </section>

        {/* גלריית תבניות */}
        <section id="gallery">
          <div className="mb-6 flex flex-col items-center gap-4 text-center">
            <h3 className="text-xl font-bold text-[#F5EEDD]">גלריית תבניות</h3>
            <p className="max-w-2xl text-sm text-[#F5EEDD]/70">
              המיקוד הנוכחי הוא <span className="font-semibold text-[#C9A227]">שיעורי תורה</span> —
              תבניות מוכנות ברמת מעצב. בסיס הידע קיים לכל הקבוצות, ושאר הקטגוריות בדרך.
            </p>
          </div>

          {/* ⚠️ ‎TabsList‎ הוא ‎inline-flex‎ שאינו מתכווץ: עם כל קבוצות הידע
              הוא נמדד 625px, וברוחב 390 הוא זה שדחף את **כל העמוד** לגלילה
              אופקית של 117px (‎scrollWidth 507‎). DESIGN_STANDARD §5 אומר את
              הכלל: תוכן רחב גולל בתוך המכל שלו, גוף העמוד לעולם לא.
              ‎justify-start‎ במקום ‎center‎ כשגוללים — אחרת הלשונית הראשונה
              מתחילה מחוץ לתחום ואי אפשר להגיע אליה. */}
          {/*
            🔴 כאן ישב ‎<Tabs>‎ של Radix — **בלי אף ‎<TabsContent>‎**.
            נמדד בדפדפן: ארבעה ‎role="tab"‎ שכל אחד מהם מצהיר
            ‎aria-controls="radix-…-content-…"‎, ו-‎getElementById‎ על כל
            ארבעתם מחזיר ‎null‎. אפס ‎role="tabpanel"‎ בעמוד. זה
            ה-‎aria-valid-attr-value‎ שנכשל, אבל הליקוי גדול מהציון: קורא מסך
            הכריז "לשונית, 1 מתוך 4, שולטת בלוח" — ולוח כזה לא קיים.

            אלה מעולם לא היו לשוניות אלא **מסנן**: הם מחליפים אילו תבניות
            מוצגות באותה רשימה. ולכן הם נכתבו כמה שהם: קבוצת כפתורי סינון עם
            ‎aria-pressed‎, ו-‎role="group"‎ עם שם. אותו מראה בדיוק.
          */}
          <div
            role="group"
            aria-label="סינון גלריית התבניות לפי קבוצה"
            className="mb-10 -mx-6 flex justify-start gap-1 overflow-x-auto px-6 sm:mx-0 sm:justify-center sm:px-0"
          >
            <div className="inline-flex shrink-0 gap-1 rounded-md bg-[#101B32] p-1">
              {GROUPS.map((g) => {
                const Icon = GROUP_ICONS[g.key] ?? BookOpen;
                const enabled = g.key === "shiurim";
                const active = g.key === activeGroup;
                return (
                  <button
                    key={g.key}
                    type="button"
                    disabled={!enabled}
                    aria-pressed={active}
                    onClick={() => setActiveGroup(g.key)}
                    className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50 ${
                      active
                        ? "bg-[#C9A227] text-[#0B1220]"
                        : "text-[#F5EEDD]/80 hover:text-[#F5EEDD]"
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {g.label}
                    {!enabled && <span className="text-[10px] opacity-80">(בקרוב)</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {isLoading && (
            <p className="text-center text-[#F5EEDD]/60">טוען תבניות...</p>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="mx-auto max-w-md rounded-lg border border-[#C9A227]/20 bg-[#101B32] p-8 text-center">
              <p className="text-[#F5EEDD]/80">קבוצה זו בקרוב — בסיס הידע מוכן, התבניות בבנייה.</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t) => {
              if (!t.doc) return null;
              const style = getStyle(t.style);
              const cat = getCategory(t.category);
              return (
                <Card
                  key={t.id}
                  className="group cursor-pointer overflow-hidden border-[#C9A227]/20 bg-[#101B32] transition hover:border-[#C9A227]/60 hover:shadow-[0_0_30px_rgba(201,162,39,0.15)]"
                  onClick={() => openTemplate(t as any)}
                >
                  <LazyPreview>
                    <CanvasStage doc={t.doc} interactive={false} maxDisplayWidth={220} />
                  </LazyPreview>
                  <CardContent className="p-4">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-[#F5EEDD]">{t.name}</h4>
                      <ArrowLeft className="h-4 w-4 text-[#C9A227] opacity-0 transition group-hover:opacity-100" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="border-[#C9A227]/30 text-[10px] text-[#C9A227]">
                        {style.label}
                      </Badge>
                      {cat && (
                        <Badge variant="outline" className="border-[#F5EEDD]/20 text-[10px] text-[#F5EEDD]/70">
                          {cat.label}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </main>

      {/* ‎/40‎ נתן 3.45:1 על הרקע הכהה — מתחת ל-4.5 בגודל 12px. ‎/60‎ = 6.32:1. */}
      <footer className="relative z-10 border-t border-[#C9A227]/10 py-8 text-center text-xs text-[#F5EEDD]/60">
        מודעות · מנוע העיצוב החרדי — גרסת POC לשיעורי תורה
      </footer>
    </div>
  );
}

function EntryCard({
  icon,
  title,
  desc,
  onClick,
  highlight,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <Card
      className={`cursor-pointer bg-[#101B32] p-1 transition hover:-translate-y-1 hover:border-[#C9A227]/60 hover:shadow-[0_10px_40px_rgba(201,162,39,0.15)] ${
        highlight ? "border-[#C9A227]/60 shadow-[0_0_25px_rgba(201,162,39,0.12)]" : "border-[#C9A227]/20"
      }`}
      onClick={onClick}
      data-testid={`entry-${title}`}
    >
      <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#C9A227]/10">
          {icon}
        </div>
        <h3 className="text-base font-bold text-[#F5EEDD]">{title}</h3>
        <p className="text-sm leading-relaxed text-[#F5EEDD]/60">{desc}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 border-[#C9A227]/40 text-[#C9A227] hover:bg-[#C9A227] hover:text-[#0B1220]"
        >
          המשך
        </Button>
      </CardContent>
    </Card>
  );
}

/*
  תצוגה מקדימה שנצבעת רק כשמתקרבים אליה.

  כל תצוגה בגלריה היא **מודעה שלמה שמרונדרת בפועל** — ‎CanvasStage‎ בונה את
  כל שכבות הטקסט, מודד אותן ומתאים גדלים. זה יפה, וזה גם יקר: ברגע
  שהגלריה התמלאה (היא הייתה ריקה בפרודקשן בגלל באג ה-API), ‎TBT‎ קפץ ל-5.2
  שניות. ארבע מודעות שנבנות בבת אחת לפני שהמשתמש בכלל גלל אליהן.

  התיבה שומרת את אותו גובה לפני ואחרי, ולכן אין קפיצת פריסה (CLS נשאר 0).
  ‎rootMargin‎ נדיב, כך שהתצוגה מוכנה לפני שהיא נכנסת למסך.
*/
function LazyPreview({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || show) return;
    if (typeof IntersectionObserver === "undefined") {
      setShow(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [show]);

  return (
    <div
      ref={ref}
      className="flex min-h-[300px] items-center justify-center bg-[#0B1220] py-6"
    >
      {show ? children : <span className="sr-only">תצוגה מקדימה נטענת</span>}
    </div>
  );
}
