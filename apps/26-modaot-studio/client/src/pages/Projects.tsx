/*
  העבודות שלי — הדרך חזרה אל מודעה שנשמרה.

  המדידה של ‎core.issues #129‎ (‎QA/platform/studio-client-calls-0810‎) מצאה
  שהשרת רושם חמישה מסלולי פרויקטים ושהלקוח קורא אחד: ‎POST /api/projects‎.
  כלומר לחיצה על "שמור" בעורך אכן שולחת את העבודה, ואין בלקוח מסך שמושך
  אותה בחזרה — הפרויקטים היו לכתיבה בלבד. העמוד הזה הוא הקורא.

  ‎GET /api/projects‎ מחזיר ‎select("*")‎, כלומר ‎layersJson‎ כבר בשורה, ולכן
  פתיחת פרויקט אינה מביאה אותו שוב לפי מזהה — היא מרכיבה את ה-doc מהשורה
  שכבר בידנו. ‎GET /api/projects/:id‎ נשאר בלי קורא בכוונה; קריאה שנייה לאותו
  מידע היא קריאה מיותרת, לא פיצ'ר חסר.

  ובניגוד ל-Home: כאן **לא** מופעל ‎applyCategoryDefaults‎. הוא ממלא קופי
  ברירת מחדל לקטגוריה, וזה נכון לתבנית ריקה — על עבודה שמורה הוא היה דורס
  את הטקסט שהמשתמש כתב.
*/
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Crown, FolderOpen, Home as HomeIcon, MessageSquare, PenLine, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CanvasStage from "@/components/CanvasStage";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getStyle } from "@shared/styles";
import { getCategory } from "@shared/knowledge";
import { getFormat } from "@shared/formats";
import { useTemplateContext } from "@/lib/templateContext";
import type { TemplateDoc } from "@shared/layers";

interface ProjectRow {
  id: number;
  name: string;
  category: string;
  style: string;
  format: string;
  width: number;
  height: number;
  layersJson: string;
  thumbnail: string | null;
  createdAt: number;
  updatedAt: number;
}

/** ‎layersJson‎ מחזיק רק ‎{background, layers}‎ — ‎width/height‎ יושבים בשורה. */
function docOf(p: ProjectRow): TemplateDoc | null {
  try {
    const parsed = JSON.parse(p.layersJson);
    if (!parsed || !Array.isArray(parsed.layers)) return null;
    return { width: p.width, height: p.height, background: parsed.background, layers: parsed.layers };
  } catch {
    return null;
  }
}

/** ‎clientNotes‎ יושב באותו ‎layersJson‎, כשדה אח ל-‎background‎/‎layers‎ — לא חלק מ-‎TemplateDoc‎. */
function clientNotesOf(p: ProjectRow): string {
  try {
    const parsed = JSON.parse(p.layersJson);
    return typeof parsed?.clientNotes === "string" ? parsed.clientNotes : "";
  } catch {
    return "";
  }
}

const dateLabel = (seconds: number) =>
  new Date(seconds * 1000).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });

export default function Projects() {
  const [, navigate] = useLocation();
  const { setSelected } = useTemplateContext();
  const { data: projects, isLoading, error } = useQuery<ProjectRow[]>({ queryKey: ["/api/projects"] });
  const [busyId, setBusyId] = useState<number | null>(null);

  function openProject(p: ProjectRow) {
    const doc = docOf(p);
    if (!doc) return;
    setSelected({
      doc,
      category: p.category,
      style: p.style,
      format: p.format,
      name: p.name,
      projectId: p.id,
      clientNotes: clientNotesOf(p),
    });
    navigate("/editor");
  }

  async function del(id: number) {
    if (!confirm("למחוק את העבודה השמורה?")) return;
    setBusyId(id);
    try {
      await apiRequest("DELETE", `/api/projects/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#F5EEDD]" dir="rtl">
      <div
        className="pointer-events-none fixed inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(circle at 15% 0%, rgba(201,162,39,0.12), transparent 45%), radial-gradient(circle at 85% 25%, rgba(201,162,39,0.08), transparent 40%)",
        }}
      />

      <header className="relative z-10 border-b border-[#C9A227]/20 bg-[#0B1220]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-y-3 px-6 py-5">
          <div className="flex items-center gap-3">
            <Crown className="h-6 w-6 text-[#C9A227]" />
            <h1 className="text-xl font-bold tracking-wide">
              העבודות <span className="text-[#C9A227]">שלי</span>
            </h1>
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

      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-12">
        <p className="mb-8 text-sm leading-relaxed text-[#F5EEDD]/70">
          כל מודעה שנשמרה מהעורך מופיעה כאן. פתיחה מחזירה את השכבות בדיוק כפי שנשמרו, והשמירה הבאה
          מתעדכנת על אותה עבודה במקום ליצור עותק חדש.
        </p>

        {isLoading && <p className="text-sm text-[#F5EEDD]/60" data-testid="text-loading">טוען עבודות…</p>}

        {error && (
          <Card className="border-red-500/30 bg-[#101B32]">
            <CardContent className="p-6">
              <h3 className="mb-1 text-sm font-bold text-red-300">לא הצלחנו לטעון את העבודות</h3>
              <p className="text-xs text-[#F5EEDD]/60" data-testid="text-error">
                {String((error as Error)?.message ?? error)}
              </p>
            </CardContent>
          </Card>
        )}

        {projects && projects.length === 0 && (
          <Card className="border-[#C9A227]/20 bg-[#101B32]" data-testid="card-empty">
            <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#C9A227]/15">
                <FolderOpen className="h-7 w-7 text-[#C9A227]" />
              </div>
              <div>
                <h3 className="mb-1 text-base font-bold">עדיין אין עבודות שמורות</h3>
                <p className="text-sm text-[#F5EEDD]/60">
                  בחרו תבנית, ערכו אותה, ולחצו "שמור פרויקט" בעורך — היא תופיע כאן.
                </p>
              </div>
              <Button
                className="gap-2 bg-[#C9A227] text-[#0B1220] hover:bg-[#DDB63A]"
                onClick={() => navigate("/")}
                data-testid="button-pick-template"
              >
                <PenLine className="h-4 w-4" /> בחירת תבנית
              </Button>
            </CardContent>
          </Card>
        )}

        {projects && projects.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => {
              const doc = docOf(p);
              const style = getStyle(p.style);
              const category = getCategory(p.category);
              const fmt = getFormat(p.format);
              const clientNotes = clientNotesOf(p);
              return (
                <Card
                  key={p.id}
                  className="group cursor-pointer overflow-hidden border-[#C9A227]/20 bg-[#101B32] transition hover:border-[#C9A227]/60 hover:shadow-[0_0_30px_rgba(201,162,39,0.15)]"
                  onClick={() => openProject(p)}
                  data-testid={`card-project-${p.id}`}
                >
                  {doc ? (
                    <LazyPreview>
                      {/* 200 ולא 220: פורמט 1080×1350 בגובה 220 היה נחתך למעלה ולמטה */}
                      <CanvasStage doc={doc} interactive={false} maxDisplayWidth={200} />
                    </LazyPreview>
                  ) : (
                    <div className="flex h-[280px] items-center justify-center border-b border-[#C9A227]/10 bg-[#0B1220] px-4 text-center text-xs text-[#F5EEDD]/50">
                      השכבות של העבודה הזו אינן ניתנות לקריאה — אי אפשר להציג תצוגה מקדימה
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold" data-testid={`text-project-name-${p.id}`}>{p.name}</h4>
                      <ArrowLeft className="h-4 w-4 shrink-0 text-[#C9A227] opacity-0 transition group-hover:opacity-100" />
                    </div>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      {style && (
                        <Badge variant="outline" className="border-[#C9A227]/30 text-[10px] text-[#C9A227]">
                          {style.label}
                        </Badge>
                      )}
                      {category && (
                        <Badge variant="outline" className="border-[#C9A227]/20 text-[10px] text-[#F5EEDD]/70">
                          {category.label}
                        </Badge>
                      )}
                      {fmt && (
                        <Badge
                          variant="outline"
                          title={`${fmt.width}×${fmt.height}px · יחס ${fmt.ratio}`}
                          className="border-[#C9A227]/20 text-[10px] text-[#F5EEDD]/70"
                          data-testid={`badge-format-${p.id}`}
                        >
                          {fmt.label}
                        </Badge>
                      )}
                      {/* dir="ltr": בתוך פסקה RTL הדפדפן היה מסדר 1080×1350 כ-1350×1080 */}
                      <span dir="ltr" className="text-[10px] text-[#F5EEDD]/40">{p.width}×{p.height}</span>
                      {clientNotes && (
                        <span title={clientNotes} data-testid={`badge-client-notes-${p.id}`}>
                          <MessageSquare className="h-3 w-3 text-[#C9A227]/70" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#F5EEDD]/50" data-testid={`text-project-updated-${p.id}`}>
                        עודכן {dateLabel(p.updatedAt)}
                        {p.createdAt !== p.updatedAt && (
                          <span className="text-[#F5EEDD]/35"> · נוצר {dateLabel(p.createdAt)}</span>
                        )}
                      </span>
                      <button
                        className="text-[#F5EEDD]/40 transition hover:text-red-400 disabled:opacity-40"
                        disabled={busyId === p.id}
                        onClick={(e) => { e.stopPropagation(); del(p.id); }}
                        aria-label={`מחיקת ${p.name}`}
                        data-testid={`button-delete-project-${p.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

/*
  אותו שיקול שנרשם ב-Home: כל תצוגה מקדימה היא מודעה שמרונדרת בפועל דרך
  ‎CanvasStage‎, ורינדור של כמה כאלה בבת אחת קפץ שם ל-TBT של 5.2 שניות.
  התיבה שומרת על אותו גובה לפני ואחרי, ולכן אין קפיצת פריסה.
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
      className="flex h-[280px] items-center justify-center overflow-hidden border-b border-[#C9A227]/10 bg-[#0B1220]"
    >
      {show ? children : <span className="sr-only">תצוגה מקדימה נטענת</span>}
    </div>
  );
}
