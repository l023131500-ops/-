import { useEffect, useState } from "react";
import { DEPARTMENTS, REGISTRY, TOPIC_ROUTES } from "@more30/config";
import { createBrowserClient } from "@more30/db";
import { SpecWizard } from "./SpecWizard";

/**
 * more30 — אתר התדמית של מור מערכות תוכנה (מערכת 33).
 *
 * כל מערכת נגישה תחת more30.com/<נושא>; נטפרי חוסמת ‎*.vercel.app‎, ולכן הפורטל
 * מנתב את הנתיב לפריסה שמאחוריו ואף פעם לא חושף את הכתובת האמיתית.
 *
 * השמות והתיאורים נקראים חיים מ-`more30_project_overview` (anon) — הם מנוסחים
 * ב-core.projects ולא כאן, כדי שלא ייווצרו שתי גרסאות של אותו טקסט. יש נפילה
 * למרשם שב-config כדי שהעמוד ייטען גם אם המסד לא זמין.
 */

type Row = {
  number: string; path: string | null; name: string; name_he: string | null;
  what_it_does: string | null; functions: string | null; department: string;
  stage: string; live: boolean; is_deployed: boolean; live_url: string | null;
  is_protected: boolean; to_delete: boolean;
};

const supa = (() => { try { return createBrowserClient("public"); } catch { return null; } })();

/** Rows from the config registry, used as an offline fallback. */
function fallbackRows(): Row[] {
  return REGISTRY.filter((p) => !p.protected && TOPIC_ROUTES[p.number]).map((p) => ({
    number: p.number, path: TOPIC_ROUTES[p.number]!, name: p.name, name_he: p.name,
    what_it_does: p.note ?? null, functions: null, department: p.department,
    stage: p.stage, live: p.live, is_deployed: !!p.isDeployed, live_url: null,
    is_protected: false, to_delete: false,
  }));
}

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

const enterable = (r: Row) => !!r.live_url && r.live_url.includes("more30.com");

/** התיאור מ-core הוא לרוב משפט אחד; אם יש יותר — לוקחים את הראשון לכרטיס. */
const blurb = (r: Row) => {
  const t = (r.what_it_does || "").trim();
  if (!t) return "";
  return (t.split(/(?<=[.!?])\s/)[0] || t).trim();
};

export function App() {
  const [rows, setRows] = useState<Row[]>(fallbackRows());

  useEffect(() => {
    if (!supa) return;
    supa.from("more30_project_overview")
      .select("number,path,name,name_he,what_it_does,functions,department,stage,live,is_deployed,live_url,is_protected,to_delete")
      .then(({ data }) => {
        if (data && data.length) {
          setRows((data as Row[]).filter((r) => r.path && !r.is_protected && !r.to_delete));
        }
      });
  }, []);

  // מישהו הגיע ל-more30.com/<נושא> שעדיין לא מנותב — עמוד ממותג במקום 404.
  const seg = typeof window !== "undefined" ? window.location.pathname.replace(/^\/+/, "").split("/")[0] : "";
  const topicRow = seg && rows.find((r) => r.path === seg);
  if (topicRow && !enterable(topicRow)) return <ComingSoon row={topicRow} />;

  return <Portal rows={rows} />;
}

function ComingSoon({ row }: { row: Row }) {
  return (
    <div className="soon" dir="rtl">
      <div className="soon-in">
        <div className="eyebrow">מור מערכות תוכנה</div>
        <h1 className="display soon-title">{row.name_he || row.name}</h1>
        <p className="serif soon-desc">{row.what_it_does || "המערכת בהקמה ותעלה לאוויר תחת more30.com."}</p>
        <div className="rule" />
        <p className="soon-note">בקרוב · more30.com/{row.path}</p>
        <a className="btn" href="/">חזרה לעולם הסטארטאפים</a>
      </div>
    </div>
  );
}

const PILLARS = [
  { h: "מרעיון למוצר חי", p: "אפיון, פיתוח והשקה — עד שהמערכת עומדת בשטח ומשרתת משתמשים אמיתיים." },
  { h: "מערכות שכבר עובדות", p: "נדל\"ן, תמלול, זכויות, בריאות וקהילה — כולן פעילות היום, לא מצגת." },
  { h: "כתובת אחת", p: "כל המערכות חיות תחת more30.com. משתמש אחד, נתונים משותפים, מקום אחד לחזור אליו." },
  { h: "ליווי שנשאר", p: "אחרי ההשקה מתחילה העבודה האמיתית — תחזוקה, שיפור והתאמה למה שהשטח מחזיר." },
];

function Portal({ rows }: { rows: Row[] }) {
  useReveal(rows.length);
  const depts = Object.keys(DEPARTMENTS).filter((d) => rows.some((r) => r.department === d));
  const liveCount = rows.filter((r) => r.live).length;

  return (
    <div dir="rtl">
      <nav className="nav">
        <div className="nav-in">
          <a className="wordmark" href="#top">מור מערכות תוכנה</a>
          <div className="nav-links">
            <a href="#systems">המערכות</a>
            <a href="#about">מה אנחנו עושים</a>
            <a className="nav-cta" href="#intake">ספרו לנו רעיון</a>
          </div>
        </div>
      </nav>

      {/* פתיחה — השם הראשי, הרבה אוויר, שום דבר מעבר */}
      <header className="hero" id="top">
        <div className="hero-in">
          <div className="eyebrow">מור מערכות תוכנה</div>
          <h1 className="display hero-title">עולם הסטארטאפים</h1>
          <p className="serif hero-lead">
            עשרות מערכות שנבנו כאן, עובדות היום בשטח, וחיות כולן תחת כתובת אחת.
          </p>
          <div className="hero-actions">
            <a className="btn" href="#systems">לכל המערכות</a>
            <a className="btn btn-quiet" href="#intake">יש לי רעיון</a>
          </div>
        </div>
        <div className="hero-meta">
          <div><b>{rows.length}</b><span>מערכות</span></div>
          <div><b>{liveCount}</b><span>חיות בשטח</span></div>
          <div><b>{depts.length}</b><span>תחומים</span></div>
          <div><b>more30.com</b><span>כתובת אחת</span></div>
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

      {/* המערכות */}
      <section id="systems" className="section section-systems">
        <div className="wrap">
          <div className="sec-head reveal">
            <div className="eyebrow">האקוסיסטם</div>
            <h2 className="display sec-title">המערכות שלנו</h2>
            <p className="serif sec-sub">{rows.length} מערכות · {liveCount} כבר חיות · והרשימה ממשיכה לגדול</p>
          </div>

          {depts.map((dep) => {
            const list = rows.filter((r) => r.department === dep)
              .sort((a, b) => a.number.localeCompare(b.number));
            return (
              <div className="dept" key={dep}>
                <div className="dept-head reveal">
                  <h3>{DEPARTMENTS[dep]}</h3>
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

      <footer className="footer">
        <div className="wrap footer-in">
          <div className="display footer-mark">עולם הסטארטאפים</div>
          <div className="footer-note">מור מערכות תוכנה · more30.com</div>
          <div className="footer-note muted">© 2026 כל המערכות תחת קורת גג אחת.</div>
        </div>
      </footer>
    </div>
  );
}

/**
 * כרטיס מערכת: תיאור קצר בסריף מעל, השם העברי בגדול, וכפתור כניסה.
 * מערכת שעדיין לא מנותבת תחת more30.com מקבלת אותו כרטיס במצב שקט — כך אין
 * דליפה של כתובת vercel.app ואין כפתור שמוביל לשום מקום.
 */
function SystemCard({ r }: { r: Row }) {
  const on = enterable(r);
  const desc = blurb(r);
  const title = r.name_he || r.name;

  return (
    <div className={`card reveal ${on ? "" : "card-soon"}`}>
      {desc && <p className="serif card-desc">{desc}</p>}
      <h4 className="card-name">{title}</h4>
      <div className="card-foot">
        {on
          ? <a className="btn btn-card" href={`/${r.path}`}>כניסה למערכת</a>
          : <span className="card-soon-tag">בהכנה</span>}
      </div>
    </div>
  );
}
