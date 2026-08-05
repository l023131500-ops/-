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

/** שם התחום לתצוגה. מפתח שאין לו תרגום מוצג כמו שהוא ולא נעלם מהעמוד. */
const deptLabel = (key: string) => (DEPARTMENTS as Record<string, string>)[key] ?? key;

type RightsStats = {
  total: number;
  by_source: Record<string, number>;
  labels: Record<string, string>;
};

export function App() {
  const [load, setLoad] = useState<Load>({ state: "loading" });

  const fetchSystems = useCallback(() => {
    if (!supa) { setLoad({ state: "failed" }); return; }
    setLoad({ state: "loading" });
    supa.from("more30_public_systems")
      // ⚠️ מחרוזת אחת ולא שרשור: supabase-js גוזר את הטיפוס מהליטרל עצמו,
      // ושרשור הופך אותו ל-string רגיל ומפיל את ההסקה.
      .select("number,path,title,tagline,what_it_does,department,live,is_deployed,live_url,stage,is_protected,public_visible")
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

  return <Portal load={load} retry={fetchSystems} />;
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

const PILLARS = [
  { h: "מרעיון למוצר חי", p: "אפיון, פיתוח והשקה — עד שהמערכת עומדת בשטח ומשרתת אנשים אמיתיים." },
  { h: "מערכות שכבר עובדות", p: "נדל\"ן, תמלול, זכויות, בריאות וקהילה. לא מצגת — מערכות שרצות היום." },
  { h: "כתובת אחת", p: "הכול חי תחת more30.com. מקום אחד לזכור, מקום אחד לחזור אליו." },
  { h: "ליווי שנשאר", p: "ההשקה היא ההתחלה. משם ממשיכים לתחזק, לשפר ולהתאים למה שהשטח מחזיר." },
];

function Portal({ load, retry }: { load: Load; retry: () => void }) {
  const rows = load.state === "ready" ? load.rows : [];
  useReveal(load.state === "ready" ? rows.length : load.state);

  /**
   * מאגר הזכויות בדף הבית (§5).
   *
   * ספירות בלבד — הקטלוג עצמו חי ב-/bkalot, ושכפול 888 שורות לעמוד שיווקי
   * היה מאט אותו בלי להוסיף מידע. אם הקריאה נכשלת המקטע פשוט לא מוצג:
   * מספר שגוי על מאגר זכויות גרוע ממקטע חסר, ו-0 היה שקר.
   */
  const [rights, setRights] = useState<RightsStats | null>(null);
  useEffect(() => {
    if (!supa) return;
    supa.rpc("more30_rights_stats").then(({ data, error }) => {
      if (!error && data) setRights(data as RightsStats);
    });
  }, []);

  // התחומים נגזרים מהשורות עצמן, לפי סדר ההופעה — תחום חדש במסד מופיע כאן
  // מעצמו, ותחום שהתרוקן נעלם מעצמו.
  // ⚠️ מערכת בלי תחום מקבלת תחום "אחר" ולא נופלת מהרשימה. העמוד מציג את כל
  // המצבת, ולכן קיבוץ שמשמיט שורה הוא באג ולא סידור.
  const depts: string[] = [];
  for (const r of rows) {
    const d = r.department || "other";
    if (!depts.includes(d)) depts.push(d);
  }
  const liveCount = rows.filter((r) => openToPublic(r)).length;

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
            עשרות מערכות נבנו כאן, עובדות היום בשטח, וחיות כולן תחת כתובת אחת.
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
          {/* נתון אמת מ-rights.catalog. אין נתון → לא מוצג, ולא 0. */}
          <div><b>{rights ? rights.total.toLocaleString("he-IL") : "—"}</b><span>זכויות במאגר</span></div>
        </div>
      </header>

      {/* מה אנחנו עושים */}
      <section id="about" className="section">
        <div className="wrap">
          <div className="sec-head reveal">
            <div className="eyebrow">מה אנחנו עושים</div>
            <h2 className="display sec-title">בית אחד לכל השלבים</h2>
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
        מאגר הזכויות (§5). מוצג רק כשיש נתון אמיתי — מקטע שמכריז על מאגר
        זכויות ומראה 0 גרוע ממקטע שלא קיים.
      */}
      {rights && rights.total > 0 && (
        <section id="rights" className="section">
          <div className="wrap">
            <div className="sec-head reveal">
              <div className="eyebrow">מאגר הזכויות</div>
              <h2 className="display sec-title">
                {rights.total.toLocaleString("he-IL")} זכויות והטבות, במקום אחד
              </h2>
              <p className="serif">
                מה שמגיע לך מהמדינה, מקופת החולים ומהעמותות — נאסף, נבדק ומוצג
                בשפה אנושית. החיפוש והסינון המלאים נמצאים במערכת עצמה.
              </p>
            </div>
            <div className="pillars">
              {Object.entries(rights.by_source)
                .sort((a, b) => b[1] - a[1])
                .map(([src, n]) => (
                  <div className="pillar reveal" key={src}>
                    <h3>{n.toLocaleString("he-IL")}</h3>
                    <p className="serif">{rights.labels[src] ?? src}</p>
                  </div>
                ))}
            </div>
            <div className="hero-actions" style={{ marginTop: 22 }}>
              <a className="btn" href="/bkalot">למאגר המלא</a>
            </div>
          </div>
        </section>
      )}

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
            const list = rows.filter((r) => (r.department || "other") === dep);
            return (
              <div className="dept" key={dep}>
                <div className="dept-head reveal">
                  <h3>{deptLabel(dep)}</h3>
                  <span className="dept-rule" />
                  <span className="dept-count">{list.length}</span>
                </div>
                <div className="cards">
                  {list.map((r) => <SystemCard key={r.number} r={r} />)}
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
 * כרטיס מערכת: תיאור קצר בסריף מעל, השם העברי בגדול, וכפתור כניסה.
 * הקישור נבנה מהנתיב — כלומר more30.com/<נתיב> — ולעולם לא מכתובת הפריסה,
 * כדי שלא תדלוף כתובת vercel.app שנטפרי חוסמת.
 */
function SystemCard({ r }: { r: System }) {
  const open = openToPublic(r);
  const desc = blurb(r);

  return (
    <div className={`card reveal ${open ? "" : "card-soon"}`}>
      {desc && <p className="serif card-desc">{desc}</p>}
      <h4 className="card-name">{r.title}</h4>
      {/* מערכת שאינה נפתחת אומרת באיזה שלב היא — ולא נעלמת מהעמוד. */}
      {!open && <p className="card-stage">{stageNote(r)}</p>}
      <div className="card-foot">
        {open
          ? <a className="btn btn-card" href={entryHref(r) ?? "/"}>כניסה למערכת</a>
          : <span className="card-soon-tag">{r.is_protected ? "פנימית" : "בקרוב"}</span>}
        {open && <span className="card-live">● פעילה</span>}
      </div>
    </div>
  );
}
