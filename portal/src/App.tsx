import { useCallback, useEffect, useState } from "react";
import { DEPARTMENTS } from "@more30/config";
import { createBrowserClient } from "@more30/db";
import { SpecWizard } from "./SpecWizard";

/**
 * more30 — אתר התדמית של עולם הסטארטאפים (מערכת 33).
 *
 * כל מערכת נגישה תחת more30.com/<נושא>; נטפרי חוסמת ‎*.vercel.app‎, ולכן הפורטל
 * מנתב את הנתיב לפריסה שמאחוריו ואף פעם לא חושף את הכתובת האמיתית.
 *
 * ⚠️ אין כאן רשימת מערכות. הרשימה נקראת חיה מ-`more30_public_systems`, והתצוגה
 * הזו כבר מחזיקה את כללי החשיפה (public_visible, יש נתיב, לא מוגן, לא למחיקה).
 * המשמעות: שינוי סטטוס במסד — או ב-/admin — מופיע כאן בטעינה הבאה, בלי build
 * ובלי פריסה. רשימה מקובעת בקוד הייתה גרסה שנייה של האמת, שמתפצלת עם הזמן.
 */

type System = {
  number: string;
  path: string | null;
  title: string;
  tagline: string | null;
  what_it_does: string | null;
  department: string;
  live: boolean;
  is_deployed: boolean;
  live_url: string | null;
  stage: string | null;
  is_protected: boolean;
  public_visible: boolean;
  replaced_by: string | null;
};

const supa = (() => { try { return createBrowserClient("public"); } catch { return null; } })();

type Load =
  | { state: "loading" }
  | { state: "ready"; rows: System[] }
  | { state: "failed" };

function useReveal(dep?: unknown) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal:not(.in)"));
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }), { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [dep]);
}

/** מוכנה לכניסה = נפרסה, וכתובתה החיה היא באמת תחת more30.com. */
const enterable = (r: System) =>
  r.is_deployed && !!r.live_url && r.live_url.includes("more30.com");

/**
 * למה המערכת עדיין לא נפתחת — משפט אחד, נגזר מהמרשם ולא מנוסח מראש.
 *
 * ⚠️ העמוד מציג **את כל** המערכות, גם את אלה שאינן מוכנות. מערכת שנעלמת
 * מהתצוגה נראית כאילו אינה קיימת, וזה הרושם ההפוך מהנכון: היא קיימת, היא
 * פשוט בשלב מוקדם. לכן במקום להסתיר — אומרים באיזה שלב היא נמצאת עכשיו.
 */
function stageNote(r: System): string {
  if (r.is_protected) return "מערכת פנימית — פועלת, ואינה נפתחת לציבור.";
  if (!r.is_deployed) return "בפיתוח — טרם נפרסה לאוויר.";
  if (!r.path) return "נפרסה, וטרם שויכה לכתובת תחת more30.com.";
  if (!enterable(r)) return "נפרסה, והכתובת הציבורית שלה עדיין בהקמה.";
  if (!r.live) return "נפרסה ובבדיקות — נפתחת עם סיום הבדיקה.";
  if (!r.public_visible) return "פעילה, וממתינה לאישור איכות לפני פתיחה לציבור.";
  return "פעילה.";
}

/**
 * הכתובת שאליה הכפתור מוביל.
 * ⚠️ לא כל מערכת יושבת תחת נתיב: מערכת 33 היא האתר הזה עצמו, וה-`path` שלה
 * ריק. בלי הבדיקה הזו נוצר קישור ל-`/null`.
 */
const entryHref = (r: System): string | null =>
  r.path ? `/${r.path}` : r.live_url || null;

/** מוצגת עם כפתור כניסה = פעילה, איכותית, ובאמת נגישה תחת more30.com. */
const openToPublic = (r: System) =>
  enterable(r) && r.live && r.public_visible && !r.is_protected && !!entryHref(r);

/**
 * משפט ההטבה שמעל השם. המקור הוא `tagline` שנוסח ב-core.projects; אם מערכת
 * עדיין בלי ניסוח, נופלים לתיאור העובדתי (`what_it_does`) במקום להמציא משפט.
 */
const blurb = (r: System) => {
  const t = (r.tagline || "").trim();
  if (t) return t;
  const w = (r.what_it_does || "").trim();
  return w ? (w.split(/(?<=[.!?])\s/)[0] || w).trim() : "";
};

/**
 * ההסבר המפורט שבגוף הכרטיס — הנחיית משתמש (20/08, core.projects#33, פריט 2):
 * "כרטיס... עם הסבר מפורט מה המערכת עושה". עד עכשיו הכרטיס הציג משפט אחד
 * בלבד; ההסבר המלא (`what_it_does`, מנוסח ב-core.projects) נשאר במסד ולא
 * הגיע לעמוד.
 *
 * ⚠️ כשאין tagline, ‏blurb כבר מציג את משפט הפתיחה של `what_it_does` — ולכן
 * כאן מוצג רק ההמשך, אחרת המשפט הראשון היה מודפס פעמיים באותו כרטיס.
 * (blurb הוא תמיד רישא של הטקסט במקרה הזה, כך שחיתוך לפי אורך בטוח.)
 */
const cardDetail = (r: System): string => {
  const w = (r.what_it_does || "").trim();
  if (!w) return "";
  const rest = (r.tagline || "").trim() ? w : w.slice(blurb(r).length).trim();
  // ‏tagline שהוא בדיוק what_it_does — קורה כשמערכת נוסחה פעם אחת בלבד —
  // היה מודפס פעמיים, פעם בזהב ופעם בגוף.
  return rest === blurb(r) ? "" : rest;
};

/** שם התחום לתצוגה. מפתח שאין לו תרגום מוצג כמו שהוא ולא נעלם מהעמוד. */
const deptLabel = (key: string) => (DEPARTMENTS as Record<string, string>)[key] ?? key;

export function App() {
  const [load, setLoad] = useState<Load>({ state: "loading" });

  const fetchSystems = useCallback(() => {
    if (!supa) { setLoad({ state: "failed" }); return; }
    setLoad({ state: "loading" });
    supa.from("more30_public_systems")
      // ⚠️ מחרוזת אחת ולא שרשור: supabase-js גוזר את הטיפוס מהליטרל עצמו,
      // ושרשור הופך אותו ל-string רגיל ומפיל את ההסקה.
      .select("number,path,title,tagline,what_it_does,department,live,is_deployed,live_url,stage,is_protected,public_visible,replaced_by")
      .order("number")
      .then(({ data, error }) => {
        if (error || !data) { setLoad({ state: "failed" }); return; }
        setLoad({ state: "ready", rows: data as System[] });
      });
  }, []);

  useEffect(fetchSystems, [fetchSystems]);

  const rows = load.state === "ready" ? load.rows : [];

  // מישהו הגיע ל-more30.com/<נושא> שעדיין לא מנותב — עמוד ממותג במקום 404.
  const seg = typeof window !== "undefined"
    ? window.location.pathname.replace(/^\/+/, "").split("/")[0]
    : "";
  const topicRow = seg ? rows.find((r) => r.path === seg) : undefined;
  if (topicRow && !enterable(topicRow)) return <ComingSoon row={topicRow} />;

  /**
   * כתובת שאין מאחוריה מערכת (באג #119).
   *
   * ⚠️ בייצור הענף הזה כבר אינו נדרש: ה-catch-all `/(.*) → /index.html` הוסר
   * מ-portal/vercel.dist.json, וכתובת שלא נתפסה באף rewrite מקבלת את
   * portal/public/404.html — אותו עמוד בדיוק, בסטטוס 404 אמיתי ולא 200.
   * הוא נשאר כאן בשביל שני מצבים שבהם אין vercel.json: `vite preview` המקומי,
   * ורגרסיה שתחזיר catch-all. עדיף שיאמר "לא נמצא" מאשר שיצייר את דף הבית.
   *
   * ⚠️ רק אחרי `ready`. ב-loading הרשימה ריקה, וב-failed היא ריקה מטעות רשת —
   * לומר "לא נמצא" באחד מהשניים היה הופך תקלה זמנית לעמוד שגיאה על מערכת חיה.
   */
  if (load.state === "ready" && seg && !topicRow && !PORTAL_PATHS.has(seg)) {
    return <NotFound seg={seg} />;
  }

  return <Portal load={load} retry={fetchSystems} />;
}

/**
 * נתיבים שהפורטל מגיש בעצמו — יש להם rewrite משלהם ב-portal/vercel.dist.json,
 * ולכן ה-SPA לעולם אינו רואה אותם בייצור. הרשימה כאן היא חגורת ביטחון בלבד:
 * אם rewrite אחד ייפול, עדיף שהמבקר יקבל את דף הבית ולא הכרזה ש-/login אינו קיים.
 */
const PORTAL_PATHS = new Set([
  "login", "me", "subscribe", "showcase", "admin", "nihul", "auth", "api", "assets",
]);

/**
 * הכתובת אינה קיימת. התאום הסטטי שלו — portal/public/404.html — הוא מה שמוגש
 * בייצור, ובסטטוס 404. שניהם מסומנים `noindex`: הסטטוס מספיק לגוגל, אבל לא כל
 * סורק קורא אותו, ובתצוגה המקומית (בלי vercel.json) הסטטוס עדיין 200.
 */
function NotFound({ seg }: { seg: string }) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "הכתובת לא נמצאה · עולם הסטארטאפים";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);
    return () => { document.title = prevTitle; meta.remove(); };
  }, []);

  return (
    <main className="soon" dir="rtl">
      <div className="soon-in">
        <div className="eyebrow">עולם הסטארטאפים</div>
        <h1 className="display soon-title">הכתובת הזו לא נמצאה</h1>
        <p className="serif soon-desc">
          אין מערכת שיושבת תחת more30.com/{seg}. ייתכן שהכתובת הוקלדה אחרת, או שהיא הובילה
          למשהו שכבר אינו באוויר. כל המערכות הפעילות מרוכזות בדף אחד.
        </p>
        <div className="rule" />
        <p className="soon-note">404 · more30.com/{seg}</p>
        <a className="btn" href="/">לרשימת המערכות</a>
      </div>
    </main>
  );
}

function ComingSoon({ row }: { row: System }) {
  return (
    <main className="soon" dir="rtl">
      <div className="soon-in">
        <div className="eyebrow">עולם הסטארטאפים</div>
        <h1 className="display soon-title">{row.title}</h1>
        <p className="serif soon-desc">{row.what_it_does || "המערכת בהקמה ותעלה לאוויר תחת more30.com."}</p>
        <div className="rule" />
        <p className="soon-note">בקרוב · more30.com/{row.path}</p>
        <a className="btn" href="/">חזרה לעולם הסטארטאפים</a>
      </div>
    </main>
  );
}

/**
 * הנחיית משתמש (20/08, core.projects#33, פריט 1): דף הבית ממותג סביב
 * אסטרטגיה, ניתוח ופיתוח לעסקים — לא סביב תחום תוכן של מערכת מסוימת.
 * לכן העמודים כאן מספרים את שלבי העבודה מול לקוח עסקי, והתחומים עצמם
 * (נדל"ן, בריאות, קהילה וכו') מופיעים רק למטה, בכרטיסי המערכות שבאמת קיימות.
 */
const PILLARS = [
  { h: "אסטרטגיה", p: "מתחילים מהעסק, לא מהטכנולוגיה: מה המטרה, מי הלקוח, ומה המהלך שבאמת מזיז את המחט — לפני שנכתבת שורת קוד." },
  { h: "ניתוח ואפיון", p: "שאלון אפיון חכם שממפה את הצורך, ולצידו ניתוח AI פנימי — כך רעיון הופך למסמך עבודה מדויק שאפשר לבנות ממנו." },
  { h: "פיתוח והשקה", p: "מעצבים, בונים ומעלים לאוויר — מערכות, אתרים ואוטומציות שעומדים בשטח ומשרתים אנשים אמיתיים, תחת כתובת אחת." },
  { h: "ליווי שנשאר", p: "ההשקה היא ההתחלה. משם ממשיכים לתחזק, לשפר ולהתאים למה שהשטח מחזיר." },
];

function Portal({ load, retry }: { load: Load; retry: () => void }) {
  const rows = load.state === "ready" ? load.rows : [];
  useReveal(load.state === "ready" ? rows.length : load.state);

  // התחומים נגזרים מהשורות עצמן — תחום חדש במסד מופיע כאן מעצמו, ותחום
  // שהתרוקן נעלם מעצמו.
  // ⚠️ מערכת בלי תחום מקבלת תחום "אחר" ולא נופלת מהרשימה. העמוד מציג את כל
  // המצבת, ולכן קיבוץ שמשמיט שורה הוא באג ולא סידור.
  //
  // סדר התחומים: קודם אלה שיש בהם הכי הרבה מערכות פתוחות לכניסה. דף הבית
  // הוא חלון-הראווה של עולם הסטארטאפים — הוא צריך להוביל במה שכבר עובד
  // בשטח, לא בסדר המספרי של ההקמה (שבו תחום עם מערכת אחת בהקמה יכול לפתוח
  // את העמוד). שובר-שוויון: המספר הנמוך בתחום, כדי שהסדר יציב בין טעינות.
  const deptOpenCount = (d: string) =>
    rows.filter((r) => (r.department || "other") === d && openToPublic(r)).length;
  const deptMinNum = (d: string) =>
    Math.min(...rows.filter((r) => (r.department || "other") === d).map((r) => Number(r.number)));
  const depts: string[] = [];
  for (const r of rows) {
    const d = r.department || "other";
    if (!depts.includes(d)) depts.push(d);
  }
  depts.sort((a, b) => deptOpenCount(b) - deptOpenCount(a) || deptMinNum(a) - deptMinNum(b));
  const liveCount = rows.filter((r) => openToPublic(r)).length;

  // שם התצוגה של כל מערכת, לפי מספרה — כדי שכרטיס מוכפל יוכל לומר "במקומה"
  // ולא רק "מוכפלת" (שם בלי הפניה לא עוזר למבקר למצוא את הגרסה הנכונה).
  const titleByNumber: Record<string, string> = {};
  for (const r of rows) titleByNumber[r.number] = r.title;

  return (
    <div dir="rtl">
      <nav className="nav">
        <div className="nav-in">
          <a className="wordmark" href="#top">עולם הסטארטאפים</a>
          <div className="nav-links">
            <a href="#systems">המערכות</a>
            <a href="#about">מה אנחנו עושים</a>
            <a className="nav-cta" href="#intake">ספרו לנו רעיון</a>
          </div>
        </div>
      </nav>

      {/* ‎<main>‎ אינו קישוט: קורא מסך מציע "דלג לתוכן הראשי" רק כשיש ציון-דרך
          כזה, ובלי זה המשתמש חוצה את כל הנווט בכל טעינה. Lighthouse סימן את
          חסרונו כאן ("Document does not have a main landmark"). */}
      <main>
      {/* פתיחה — השם הראשי, הרבה אוויר, שום דבר מעבר */}
      <header className="hero" id="top">
        <div className="hero-in">
          <div className="eyebrow">עולם הסטארטאפים</div>
          <h1 className="display hero-title">עולם הסטארטאפים</h1>
          <p className="serif hero-lead">
            אסטרטגיה, ניתוח ופיתוח לעסקים — מרעיון ועד מערכת חיה בשטח.
            עשרות מערכות שנבנו כאן עובדות היום, כולן תחת כתובת אחת.
          </p>
          <div className="hero-actions">
            <a className="btn" href="#systems">לכל המערכות</a>
            <a className="btn btn-quiet" href="#intake">יש לי רעיון</a>
          </div>
        </div>
        <div className="hero-meta">
          <div><b>{load.state === "ready" ? rows.length : "—"}</b><span>מערכות</span></div>
          <div><b>{load.state === "ready" ? liveCount : "—"}</b><span>חיות בשטח</span></div>
          <div><b>{load.state === "ready" ? depts.length : "—"}</b><span>תחומים</span></div>
          {/* הנחיית 20/08 פריט 1: הנתון הרביעי היה "זכויות במאגר" — תוכן של
              מערכת אחת על דף הבית של כולן. במקומו נתון אמת מאותה שליפה שכבר
              כאן: כמה מערכות נמצאות עכשיו בעבודה (המצבת פחות הפתוחות לכניסה). */}
          <div><b>{load.state === "ready" ? rows.length - liveCount : "—"}</b><span>בפיתוח עכשיו</span></div>
        </div>
      </header>

      {/* מה אנחנו עושים */}
      <section id="about" className="section">
        <div className="wrap">
          <div className="sec-head reveal">
            <div className="eyebrow">מה אנחנו עושים</div>
            <h2 className="display sec-title">אסטרטגיה, ניתוח ופיתוח לעסקים</h2>
          </div>
          <div className="pillars">
            {PILLARS.map((s) => (
              <div className="pillar reveal" key={s.h}>
                <h3>{s.h}</h3>
                <p className="serif">{s.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/*
        הנחיית משתמש (20/08, core.projects#33, פריט 1): מקטע "מאגר הזכויות"
        שישב כאן הוסר מדף הבית — תוכן של מערכת אחת אינו המסר של האתר הראשי.
        המאגר עצמו לא נגרע: הוא חי ב-/bkalot, וכרטיס המערכת שלו בהמשך העמוד
        הוא הדלת אליו. ה-RPC ‏more30_rights_stats נשאר במסד למסכי הניהול.
      */}

      {/* המערכות */}
      <section id="systems" className="section section-systems">
        <div className="wrap">
          <div className="sec-head reveal">
            <div className="eyebrow">האקוסיסטם</div>
            <h2 className="display sec-title">המערכות שלנו</h2>
            {load.state === "ready" && (
              <p className="serif sec-sub">
                {rows.length} מערכות · {liveCount} פתוחות לכניסה · השאר בדרך, וכתוב באיזה שלב
              </p>
            )}
          </div>

          {load.state === "loading" && <SystemsSkeleton />}
          {load.state === "failed" && <SystemsUnavailable onRetry={retry} />}

          {load.state === "ready" && depts.map((dep) => {
            // בתוך התחום: מערכות פתוחות לכניסה קודם, אחר-כך אלה שעדיין
            // "בקרוב", ואחריהן — למטה מכולן — מערכות מוכפלות (replaced_by),
            // גם אם הן עצמן פתוחות לכניסה. הנחיית משתמש (20/08,
            // core.projects#33): "מערכות מוכפלות/כפולות מופיעות למטה".
            // בלי זה, גרסה ישנה עם מספר נמוך (למשל 12-smel, replaced_by=32)
            // הופיעה *לפני* המערכת שהחליפה אותה בסדר המספרי הרגיל.
            // אף מערכת לא מוסתרת (זה עדיין כל המצבת של התחום), רק מסודרת.
            // שובר-שוויון: מספר המערכת, לסדר יציב בין טעינות.
            const rank = (r: System) => (r.replaced_by ? 2 : openToPublic(r) ? 0 : 1);
            const list = rows
              .filter((r) => (r.department || "other") === dep)
              .sort((a, b) => rank(a) - rank(b) || Number(a.number) - Number(b.number));
            return (
              <div className="dept" key={dep}>
                <div className="dept-head reveal">
                  <h3>{deptLabel(dep)}</h3>
                  <span className="dept-rule" />
                  <span className="dept-count">{list.length}</span>
                </div>
                <div className="cards">
                  {list.map((r) => <SystemCard key={r.number} r={r} titleByNumber={titleByNumber} />)}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* השאלון */}
      <section id="intake" className="section section-intake">
        <div className="wrap">
          <div className="sec-head reveal">
            <div className="eyebrow">בואו נבנה משהו</div>
            <h2 className="display sec-title">שאלון האפיון</h2>
            <p className="serif sec-sub">
              בוחרים מסלול, ומשם השאלון נבנה לפי מה שאתם עונים — בלי שדות שלא נוגעים לכם. רק השם חובה.
            </p>
          </div>
          <SpecWizard />
        </div>
      </section>
      </main>

      <footer className="footer">
        <div className="wrap footer-in">
          <div className="display footer-mark">עולם הסטארטאפים</div>
          <div className="footer-note">עולם הסטארטאפים · more30.com</div>
          <div className="footer-note muted">© 2026 כל המערכות תחת קורת גג אחת.</div>
        </div>
      </footer>
    </div>
  );
}

/** שלד טעינה — מחזיק את מקום הרשימה כדי שהעמוד לא יקפוץ כשהיא מגיעה. */
function SystemsSkeleton() {
  return (
    <div className="cards" aria-hidden>
      {[0, 1, 2, 3, 4, 5].map((i) => <div className="card card-skel" key={i} />)}
    </div>
  );
}

/**
 * ⚠️ בכוונה אין כאן רשימת גיבוי. רשימה מקובעת שנשלפת כשהמסד לא נענה תציג
 * מערכות שאולי כבר הוסתרו, ותיראה בדיוק כמו האמת. עדיף לומר שהרשימה לא
 * נטענה ולתת לנסות שוב.
 */
function SystemsUnavailable({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="notice">
      <p className="serif">לא הצלחנו לטעון כרגע את רשימת המערכות.</p>
      <button className="btn" onClick={onRetry}>נסו שוב</button>
    </div>
  );
}

/**
 * עמוד המסלולים של מערכת אחת — `portal/public/system.html`.
 *
 * ⚠️ העמוד גוזר את מזהה המערכת מ-`location.pathname`, אבל `vercel.dist.json`
 * מרכיב את `/<נתיב>` על הפריסה של המערכת עצמה, ולכן אין לו כתובת נקייה משלו.
 * `?app=` הוא הדרך היחידה להגיע אליו בלי להזיז את הכתובת של מערכת חיה.
 * מזהה המערכת ב-`core.plans.app_key` זהה ל-`path` בכל 19 המערכות המנותבות.
 */
const plansHref = (r: System): string | null =>
  r.path ? `/system.html?app=${encodeURIComponent(r.path)}` : null;

/**
 * כרטיס מערכת: תיאור קצר בסריף מעל, השם העברי בגדול, וכפתור כניסה.
 * הקישור נבנה מהנתיב — כלומר more30.com/<נתיב> — ולעולם לא מכתובת הפריסה,
 * כדי שלא תדלוף כתובת vercel.app שנטפרי חוסמת.
 *
 * לצד הכניסה יושב קישור שקט אל המסלולים (באג #120). עד עכשיו עמוד המסלולים
 * היה יתום: הוא נבנה, הוא מוגש בייצור, ואף עמוד שלקוח פוגש לא הוביל אליו —
 * כלומר הצינור של §8 היה שלם חוץ מהדלת.
 */
function SystemCard({ r, titleByNumber }: { r: System; titleByNumber: Record<string, string> }) {
  const open = openToPublic(r);
  const desc = blurb(r);
  const detail = cardDetail(r);
  const plans = plansHref(r);
  // מערכת מוכפלת (core.projects.replaced_by) עדיין נכנסת — היא עדיין מוצר
  // חי — אבל מסומנת כדי שהמבקר ידע שיש גרסה עדכנית יותר וייכנס אליה במקום.
  const replacement = r.replaced_by ? titleByNumber[r.replaced_by] : null;

  /**
   * מי נכנס לאיזו מערכת (core.projects#33 audit_gaps #2 — "אין מעקב
   * אנליטיקס על מי נכנס לאיזו מערכת"). ירייה-ושכח: לא חוסם את הניווט
   * (ה-href עצמו כבר מוביל את הדפדפן), אינו PII — רק app_key + זמן,
   * ו-user_id רק כשהמבקר כבר מחובר (0127). כשל שקט אם ה-RPC נכשל — כניסה
   * אמיתית לא אמורה להיתקע בגלל אנליטיקס.
   */
  const logEntry = () => {
    if (r.path) supa?.rpc("more30_log_system_entry", { p_app_key: r.path }).then(() => {});
  };

  return (
    <div className={`card reveal ${open ? "" : "card-soon"}`}>
      {desc && <p className="serif card-desc">{desc}</p>}
      <h4 className="card-name">{r.title}</h4>
      {/* ההסבר המפורט (פריט 2 בהנחיית 20/08). קצוץ ב-CSS לגובה אחיד של
          דשבורד — הטקסט המלא ממשיך לחיות במסד, לא בקוד. */}
      {detail && <p className="card-what">{detail}</p>}
      {/* מערכת שאינה נפתחת אומרת באיזה שלב היא — ולא נעלמת מהעמוד. */}
      {!open && <p className="card-stage">{stageNote(r)}</p>}
      {replacement && <p className="card-stage card-replaced">גרסה קודמת — במקומה: {replacement}</p>}
      <div className="card-foot">
        {open
          ? (
            <span className="card-actions">
              <a className="btn btn-card" href={entryHref(r) ?? "/"} onClick={logEntry}>כניסה למערכת</a>
              {plans && <a className="card-plans" href={plans}>מסלולים ומחירים</a>}
            </span>
          )
          : <span className="card-soon-tag">{r.is_protected ? "פנימית" : "בקרוב"}</span>}
        {open && <span className="card-live">● פעילה</span>}
      </div>
    </div>
  );
}
