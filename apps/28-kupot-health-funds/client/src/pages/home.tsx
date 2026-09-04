import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Heart, X, SlidersHorizontal, FileDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TopicCard } from "@/components/TopicCard";
import { BrandLogo } from "@/components/BrandLogo";
import {
  HeroCompareIllustration,
  FundTrackIcon,
  GovTrackIcon,
  NgoTrackIcon,
} from "@/components/illustrations";
import { API_BASE } from "@/lib/queryClient";
import {
  type HfTopic,
  type HfMeta,
  KIND_LABELS,
  fundColor,
  readableText,
  bestFundKey,
} from "@/lib/hf";

type Kind = "fund" | "gov" | "ngo";

/*
  כמה כרטיסים נצבעים לפני שהמשתמש ביקש עוד.

  🔴 קודם נצבעו **כולם**: `filtered.map(...)` על 435 הנושאים, כל אחד
  ‎motion.div‎ עם השהיה משלו וכל אחד רכיב שמחזיק ‎useQuery‎ משלו. נמדד:
  460 אלמנטים אינטראקטיביים בעמוד, ‎total-blocking-time‎ **6,220ms**,
  ‎time-to-interactive‎ 11.1 שניות. במילים אחרות — העמוד היה קפוא בערך עשר
  שניות אחרי שהוא כבר נראה מוכן, וזה הדבר הגרוע ביותר שאפשר לעשות למשתמש:
  ממשק שנראה מוכן ואינו מגיב.

  24 הוא בערך שני מסכים של תוצאות. השאר נטענים כשמגיעים אליהם — גם
  אוטומטית בגלילה וגם בכפתור מפורש, כי גלילה אינה נגישה למקלדת.
*/
const PAGE_SIZE = 24;

export default function Home() {
  const [kind, setKind] = useState<Kind>("fund");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");
  const [fund, setFund] = useState<string>("");

  const { data: meta } = useQuery<HfMeta>({ queryKey: ["/api/hf/meta"] });
  const { data: topics, isLoading } = useQuery<HfTopic[]>({
    queryKey: ["/api/hf/topics"],
  });

  const categories = useMemo(() => {
    if (!meta) return [];
    const list =
      kind === "fund"
        ? meta.fundCategories
        : kind === "gov"
          ? meta.govCategories
          : meta.ngoCategories;
    return list.slice(0, 14);
  }, [meta, kind]);

  // ההשוואה בפועל: לפי הקופה הבולטת בנושא. הסינון הקודם רץ על fundsAvailable,
  // שמחזיק לכל נושא את אותן ארבע הקופות — ולכן בחירת קופה החזירה את כל 435
  // הנושאים והציגה למשתמש "השוואה" שלא השוותה כלום.
  const filtered = useMemo(() => {
    if (!topics) return [];
    const q = search.trim();
    return topics.filter((t) => {
      if (t.kind !== kind) return false;
      if (category && t.category !== category) return false;
      if (fund) {
        const winner = bestFundKey(t.bestFund);
        if (fund === "undecided" ? winner !== null : winner !== fund) return false;
      }
      if (q) {
        const hay = `${t.topic} ${t.audience} ${t.benefitSummary} ${t.rangeText} ${t.category}`;
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [topics, kind, category, fund, search]);

  // כל שינוי בסינון מחזיר את הרשימה לעמוד הראשון — אחרת מסנן חדש היה יורש
  // את המגבלה של הקודם ומציג "עוד" כשאין עוד.
  const [limit, setLimit] = useState(PAGE_SIZE);
  useEffect(() => setLimit(PAGE_SIZE), [kind, category, fund, search]);

  const visible = filtered.slice(0, limit);
  const hasMore = filtered.length > limit;

  // הרחבה אוטומטית כשמגיעים לתחתית. הכפתור נשאר גם הוא — משתמש מקלדת
  // וקורא מסך אינם "גוללים לתוך התצוגה".
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hasMore || !sentinel.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setLimit((n) => n + PAGE_SIZE);
        }
      },
      { rootMargin: "600px" },
    );
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [hasMore, filtered.length]);

  const counts = meta
    ? { fund: meta.fundCount, gov: meta.govCount, ngo: meta.ngoCount }
    : { fund: 0, gov: 0, ngo: 0 };

  // מי מוביל, ובכמה נושאים — נספר מהנתונים עצמם, לא מוקלד בקוד.
  const leaderboard = useMemo(() => {
    const tally: Record<string, number> = {};
    let undecided = 0;
    for (const t of topics ?? []) {
      if (t.kind !== "fund") continue;
      const k = bestFundKey(t.bestFund);
      if (k) tally[k] = (tally[k] ?? 0) + 1;
      else undecided += 1;
    }
    const rows = (meta?.funds ?? [])
      .map((f) => ({ ...f, count: tally[f.key] ?? 0 }))
      .sort((a, b) => b.count - a.count);
    return { rows, undecided };
  }, [topics, meta]);

  function switchKind(k: Kind) {
    setKind(k);
    setCategory("");
    setFund("");
  }

  // דוח מודפס/PDF של הנושאים המסוננים כרגע — אותה שיטה כמו מחירון
  // (window.print() בדפדפן, בלי ספריית PDF). API_BASE מוסיף את קידומת
  // ה-mount בפרודקשן (/kupot) כדי שהבקשה לא תחמוק לפורטל.
  function openReport() {
    const p = new URLSearchParams();
    p.set("kind", kind);
    if (category) p.set("category", category);
    if (fund) p.set("fund", fund);
    if (search) p.set("search", search);
    p.set("print", "1");
    window.open(`${API_BASE}/api/hf/report?${p.toString()}`, "_blank");
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Hero */}
      <header className="border-b border-border bg-gradient-to-l from-primary/10 via-primary/[0.04] to-transparent">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
          {/* כפתור הכניסה המשותף של more30 יושב `fixed` בפינה השמאלית העליונה
              (הקצה האינליין-סופי ב-RTL, ‎inset-inline-end:16px / top:12px‎) —
              בדיוק על קישור "מחירון" כאן, שיושב בקצה השני של `justify-between`
              במסך צר (עד `sm`, ‎py-10‎ מביא את השורה ל-y‎~40px‎, בתוך טווח
              הכדור). `--more30-auth-inset` הוא הרוחב שהכדור מפרסם בפועל. */}
          <div
            className="flex items-start justify-between gap-3"
            style={{
              paddingInlineEnd:
                "max(1rem, calc(var(--more30-auth-inset, 124px) - max(0px, (100vw - 1024px) / 2)))",
            }}
          >
            <div className="flex items-center gap-3">
              <BrandLogo className="h-11 w-11 text-primary" />
              <div>
                <h1
                  className="text-xl font-extrabold text-foreground sm:text-2xl"
                  data-testid="text-site-title"
                >
                  {meta?.title ?? "השוואת קופות חולים"}
                </h1>
                <p className="text-sm text-muted-foreground">מבית בקלות</p>
              </div>
            </div>
            <a
              href="/subscribe?app=kupot"
              className="shrink-0 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover-elevate"
              data-testid="link-pricing"
            >
              מחירון
            </a>
          </div>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                מידע ברור ומכובד על זכויות והטבות בקופות החולים בישראל, לצד זכויות
                ממשלה וסיוע מעמותות. ניתן לסנן לפי נושא, קטגוריה וקופה, להיעזר ביועץ
                חכם להתאמת קופה, ולהשאיר פרטים לבדיקת מעבר.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Stat icon={<FundTrackIcon className="h-4 w-4 text-primary" />} value={counts.fund} label="נושאי קופות חולים" />
                <Stat icon={<GovTrackIcon className="h-4 w-4 text-primary" />} value={counts.gov} label="זכויות ממשלה" />
                <Stat icon={<NgoTrackIcon className="h-4 w-4 text-primary" />} value={counts.ngo} label="עמותות וסיוע" />
              </div>
            </div>
            {/* דקורטיבי בלבד, גודל קבוע — לא תלוי בנתונים אסינכרוניים, ולכן
                אינו מוסיף CLS למקטעים שכבר נמדדו בקפידה בעמוד הזה. מוסתר
                מתחת ל-sm כדי לא לדחוק את הטקסט במסך צר. */}
            <HeroCompareIllustration className="hidden h-28 w-36 shrink-0 text-primary sm:block" />
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-5xl px-4 py-6">
        {/* Track tabs */}
        <div className="mb-5 flex flex-wrap gap-2">
          {(["fund", "gov", "ngo"] as Kind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => switchKind(k)}
              aria-pressed={kind === k}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                kind === k
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover-elevate"
              }`}
              data-testid={`tab-${k}`}
            >
              {KIND_LABELS[k]}
              {/* ⚠️ המספר מתחיל ב-0 ונעשה 435 כשה-meta חוזר. רוחב הכפתור
                  משתנה, ושתי הלשוניות שלידו זזות — layout shift שקורה
                  **בתוך המסך הראשון**, ולכן הוא נספר במלואו. תיבה ברוחב
                  קבוע ב-ch מונעת את התזוזה בלי לשנות מה שנראה. */}
              {/* ‎opacity-80‎ ירד: לבן ב-80% שקיפות על ‎--primary‎ נותן 3.68:1
                  בגודל 12px. ‎opacity‎ ברמת האלמנט אינה נראית ב-‎color‎
                  המחושב, ולכן הבודק שלנו פספס אותה ו-axe תפס. */}
              <span className="mr-1.5 inline-block min-w-[5ch] text-center text-xs tabular-nums">
                ({counts[k]})
              </span>
            </button>
          ))}
        </div>

        {/*
          ⚠️ שמירת מקום למקטע ההשוואה — הוא מופיע רק כשהנתונים חוזרים, וכל
          מה שמתחתיו קפץ למטה ברגע ההגעה. זה אחד ממקורות ה-CLS.

          הגבהים אינם ניחוש: הם נמדדו בפרודקשן על המקטע המלא —
          394px ברוחב מובייל (412 ו-390 נותנים אותו דבר) ו-241px בדסקטופ.
          הניסיון הראשון הזמין 188px, כלומר פחות מחצי, וה-CLS **עלה**.
          אותו ‎min-height‎ מוחל גם על התיבה הריקה וגם על המקטע האמיתי, ולכן
          אין הפרש בין המצבים.
        */}
        {/* ⚠️ התנאי הוא "המקטע עדיין אינו מוכן", ולא ‎isLoading‎. הם אינם אותו
            דבר: ‎isLoading‎ שייך לשאילתת הנושאים בלבד, והמקטע דורש **גם** את
            ה-meta. כששאילתת הנושאים חזרה ראשונה, התיבה השמורה נעלמה בעוד
            שהמקטע עוד לא היה שם — הרווח קרס, ואז המקטע הופיע ודחף הכול שוב.
            שתי קפיצות במקום אפס, וזו הסיבה שהמקטע עדיין הופיע ברשימת
            ה-layout shifts אחרי שכבר שמרתי לו מקום. */}
        {kind === "fund" && leaderboard.rows.length === 0 && (
          <div
            className="mb-5 min-h-[394px] rounded-xl border border-card-border bg-card sm:min-h-[241px]"
            aria-hidden="true"
          />
        )}

        {/* Comparison band — counted from bestFund, the one comparative field the data really has */}
        {kind === "fund" && leaderboard.rows.length > 0 && (
          <div
            className="mb-5 min-h-[394px] rounded-xl border border-card-border bg-card p-4 sm:min-h-[241px]"
            data-testid="block-leaderboard"
          >
            <h2 className="mb-1 text-sm font-bold text-foreground">
              באילו נושאים כל קופה בולטת
            </h2>
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              נספר מתוך {counts.fund} נושאי השב״ן שבמאגר. לחיצה על קופה מציגה את
              הנושאים שבהם היא הבולטת.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {leaderboard.rows.map((f) => {
                const bg = fundColor(f.key, meta);
                const active = fund === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFund(active ? "" : f.key)}
                    aria-pressed={active}
                    className={`hover-elevate rounded-lg border p-3 text-right ${
                      active ? "border-primary" : "border-card-border"
                    }`}
                    data-testid={`button-leader-${f.key}`}
                  >
                    <span
                      className="inline-block rounded px-2 py-0.5 text-xs font-semibold"
                      style={{ backgroundColor: bg, color: readableText(bg) }}
                    >
                      {f.name}
                    </span>
                    <div className="mt-2 text-2xl font-extrabold text-foreground">
                      {f.count}
                    </div>
                    <div className="text-xs text-muted-foreground">נושאים</div>
                  </button>
                );
              })}
            </div>
            {leaderboard.undecided > 0 && (
              <button
                type="button"
                onClick={() =>
                  setFund(fund === "undecided" ? "" : "undecided")
                }
                aria-pressed={fund === "undecided"}
                className="hover-elevate mt-2 w-full rounded-lg border border-dashed border-border px-3 py-2 text-right text-xs leading-relaxed text-muted-foreground"
                data-testid="button-leader-undecided"
              >
                בעוד {leaderboard.undecided} נושאים המקורות הציבוריים אינם
                מספיקים כדי לקבוע קופה בולטת, והם מסומנים „טעון השוואה
                פרטנית”. להצגתם →
              </button>
            )}
          </div>
        )}

        {/* Filters bar */}
        <div className="mb-4 space-y-3 rounded-xl border border-card-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              {/* שדה החיפוש זוהה חזותית רק לפי אייקון הזכוכית, ושמו היחיד היה
                  ה-placeholder — שם שנעלם ברגע שמתחילים להקליד. aria-label ולא
                  <label> גלוי, כדי לא לשנות את שורת הסינון. */}
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="חיפוש נושא, קהל יעד או הטבה"
                placeholder="חיפוש נושא, קהל יעד או הטבה..."
                className="pr-9"
                type="search"
                data-testid="input-search"
              />
            </div>
            {kind === "fund" && (
              <div className="sm:w-56">
                <Select
                  value={fund || "all"}
                  onValueChange={(v) => setFund(v === "all" ? "" : v)}
                >
                  {/* Radix מרנדר כאן ‎<button role="combobox">‎, וה-placeholder
                      אינו שם נגיש — קורא מסך הכריז "תיבה משולבת" בלבד, וזה
                      ה-‎button-name‎ שנכשל ב-Lighthouse. */}
                  <SelectTrigger aria-label="סינון לפי הקופה הבולטת" data-testid="select-fund-filter">
                    <SlidersHorizontal className="ml-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="הקופה הבולטת" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הנושאים</SelectItem>
                    {meta?.funds.map((f) => (
                      <SelectItem key={f.key} value={f.key}>
                        בולטת: {f.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="undecided">
                      טעון השוואה פרטנית
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/*
            שורת הקטגוריות עברה לשורה אחת נגללת במובייל.

            למה: כשהיא עוטפת, גובהה תלוי בנתונים — לפני שה-meta חוזר יש בה
            שבב אחד (~34px) ואחריו חמישה-עשר (**186px ב-412 ו-218px ב-390**,
            נמדד). ההפרש הזה דוחף את כל התוצאות למטה ברגע ההגעה, וזה מקור CLS
            שאי אפשר לשמור לו מקום בלי להשאיר חור לבן ברוחב אחד או באחר.
            שורה אחת נגללת היא בגובה קבוע בכל מצב — וגם תבנית מובייל טובה
            יותר מקיר של חמישה-עשר שבבים. בדסקטופ, שם הכול נכנס בשורה-שתיים,
            ההתנהגות נשארת עטיפה.
          */}
          <div className="-mx-1 flex snap-x gap-1.5 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
            <CategoryChip
              active={category === ""}
              onClick={() => setCategory("")}
              testid="chip-category-all"
            >
              הכול
            </CategoryChip>
            {categories.map((c) => (
              <CategoryChip
                key={c}
                active={category === c}
                onClick={() => setCategory(category === c ? "" : c)}
                testid="chip-category"
              >
                {c}
              </CategoryChip>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-muted-foreground" data-testid="text-result-count">
            {isLoading
              ? "טוען..."
              : hasMore
                ? `מוצגים ${visible.length} מתוך ${filtered.length} תוצאות`
                : `${filtered.length} תוצאות`}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openReport}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
              data-testid="button-report"
            >
              <FileDown className="h-3.5 w-3.5" />
              הורדת דוח PDF
            </button>
            {(search || category || fund) && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCategory("");
                  setFund("");
                }}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
                data-testid="button-clear-filters"
              >
                <X className="h-3.5 w-3.5" />
                ניקוי סינון
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {/* מספר השלדים וגובהם תואמים למה שבאמת מגיע: ‎PAGE_SIZE‎ כרטיסים,
              80px כל אחד (נמדד בפרודקשן). קודם היו שישה בגובה 64px, כלומר
              444px שהוחלפו ב-2,483px — והכול מתחתם נדחף. */}
          {isLoading &&
            Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}

          {!isLoading && filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-border py-14 text-center">
              <Heart className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                לא נמצאו תוצאות התואמות לסינון. נא לנסות מונח חיפוש אחר.
              </p>
            </div>
          )}

          {/* בלי ‎motion.div‎ לכל שורה: זו הייתה אנימציה אחת לכל נושא, 435
              במקביל, כל אחת עם השהיה משלה. הן לא נראו — הן רק חסמו. */}
          {!isLoading && visible.map((t) => <TopicCard key={t.id} topic={t} meta={meta} />)}

          {hasMore && (
            <>
              <div ref={sentinel} aria-hidden="true" className="h-px" />
              <button
                type="button"
                onClick={() => setLimit((n) => n + PAGE_SIZE)}
                className="hover-elevate w-full rounded-xl border border-card-border bg-card px-4 py-3 text-sm font-semibold text-foreground"
                data-testid="button-load-more"
              >
                הצגת {Math.min(PAGE_SIZE, filtered.length - limit)} נושאים נוספים
                <span className="mr-1.5 text-xs font-normal text-muted-foreground">
                  (נותרו {filtered.length - limit})
                </span>
              </button>
            </>
          )}
        </div>
      </main>

      <footer className="mt-8 border-t border-border py-6 text-center text-xs text-muted-foreground">
        השוואת קופות חולים · מבית בקלות · המידע כללי ומבוסס על מקורות ציבוריים;
        לפרטים מדויקים יש לפנות לקופה.
      </footer>
    </div>
  );
}

function Stat({
  value,
  label,
  icon,
}: {
  value: number;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-card-border bg-card px-3 py-2">
      {icon}
      <div>
        {/* אותו טעם כמו בלשוניות: 0 → 435 משנה רוחב ומזיז את שתי הפסקאות שלידו. */}
        <span className="inline-block min-w-[3.5ch] text-lg font-extrabold tabular-nums text-primary">
          {value}
        </span>
        <span className="mr-1.5 text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  children,
  testid,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  testid: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 snap-start whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "bg-primary text-primary-foreground"
          : "border border-border bg-background text-muted-foreground hover-elevate"
      }`}
      data-testid={testid}
    >
      {children}
    </button>
  );
}
