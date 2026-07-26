import { useEffect, useState } from "react";
import { DEPARTMENTS, REGISTRY, TOPIC_ROUTES } from "@more30/config";
import { createBrowserClient } from "@more30/db";
import { SpecWizard } from "./SpecWizard";

/**
 * more30 — public portal ("מור מערכות תוכנה" / MOR1).
 * Every system is reachable at more30.com/<topic>. NetFree blocks *.vercel.app,
 * so the portal proxies the topic path to each deployment and never exposes the
 * underlying URL. Data is read live from `more30_project_overview` (anon), with a
 * build-time fallback to the config registry so the page always renders.
 */

type Row = {
  number: string; path: string | null; name: string; name_he: string | null;
  what_it_does: string | null; functions: string | null; department: string;
  stage: string; live: boolean; is_deployed: boolean; live_url: string | null;
  is_protected: boolean; to_delete: boolean;
};

const DEPT_EMOJI: Record<string, string> = {
  torah: "📚", finance: "💰", realestate: "🏙️", health: "🏥",
  rights: "⚖️", community: "🤝", bkalut: "🎫", misc: "✨",
};
const DEPT_ACCENT: Record<string, string> = {
  torah: "#7c3aed", finance: "#0ea5e9", realestate: "#0d9488", health: "#e11d48",
  rights: "#d97706", community: "#4f46e5", bkalut: "#64748b", misc: "#db2777",
};
const SYS_GLYPH: Record<string, string> = {
  torah: "📖", tamlul: "🎙️", modaot: "📣", imud: "📐", financial: "📈",
  briut: "🩺", zol: "🏷️", bkalot: "🤲", smel: "🏠", smachot: "🎉",
  egod: "🕎", chatzor: "🏘️", chizukim: "🎧", orech: "✍️", shiurim: "🎬",
  igud: "🚪", mthbram: "🗂️", zchuyot: "🧭", galil: "⛰️", studio: "🎨",
  mechiron: "🧮", kupot: "🏥", crm: "📇", gesher: "🌉", nadlan: "🏙️",
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

function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }), { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  });
}

const enterable = (r: Row) => !!r.live_url && r.live_url.includes("more30.com");

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

  // Single-topic coming-soon view: someone hit more30.com/<topic> that isn't proxied yet.
  const seg = typeof window !== "undefined" ? window.location.pathname.replace(/^\/+/, "").split("/")[0] : "";
  const topicRow = seg && rows.find((r) => r.path === seg);
  if (topicRow && !enterable(topicRow)) return <ComingSoon row={topicRow} />;

  return <Portal rows={rows} />;
}

function ComingSoon({ row }: { row: Row }) {
  const glyph = (row.path && SYS_GLYPH[row.path]) || "🚀";
  return (
    <div className="soon-page">
      <div>
        <div className="glyph">{glyph}</div>
        <h1>{row.name_he || row.name}</h1>
        <p>{row.what_it_does || "המערכת בהקמה ותעלה לאוויר בקרוב תחת more30.com."}</p>
        <p style={{ opacity: 0.7, fontSize: 15 }}>בקרוב תחת <b>more30.com/{row.path}</b></p>
        <a className="btn btn-light" href="/">חזרה לעולם המערכות ←</a>
      </div>
    </div>
  );
}

const SERVICES = [
  { ic: "💡", h: "מרעיון למוצר חי", p: "לוקחים רעיון גולמי ומוציאים ממנו מערכת עובדת — אפיון, פיתוח והשקה, בלי דילוגים." },
  { ic: "🛠️", h: "מערכות מוכנות לעבודה", p: "עשרות מערכות שכבר רצות בשטח — נדל\"ן, תמלול, זכויות, קהילה ועוד — במקום אחד." },
  { ic: "🔗", h: "הכול מחובר", p: "משתמש אחד, נתונים משותפים, לוח בקרה מרכזי. המערכות מדברות זו עם זו." },
  { ic: "🤝", h: "ליווי אמיתי", p: "לא נעלמים אחרי ההשקה — ממשיכים איתכם לתחזוקה, שיפור וגדילה." },
];

function Portal({ rows }: { rows: Row[] }) {
  useReveal();
  const depts = Object.keys(DEPARTMENTS).filter((d) => d !== "bkalut" && rows.some((r) => r.department === d));
  const liveCount = rows.filter((r) => r.live).length;
  const stats = [
    { n: rows.length, l: "מערכות באקוסיסטם" },
    { n: liveCount, l: "כבר חיות בשטח" },
    { n: depts.length, l: "תחומים" },
    { n: "1", l: "קורת גג אחת" },
  ];

  return (
    <div dir="rtl">
      <nav className="nav">
        <div className="nav-in">
          <div className="brand">MOR<span className="dot">1</span><small>· מור מערכות תוכנה</small></div>
          <div className="nav-links">
            <a className="link" href="#systems">המערכות</a>
            <a className="link" href="#about">מה אנחנו עושים</a>
            <a className="btn btn-primary" href="#intake" style={{ padding: "9px 18px", fontSize: 14 }}>ספרו לנו רעיון</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="hero">
        <div className="hero-grid" />
        <div className="hero-in">
          <span className="tag">🚀 עולם הסטארטאפים של מור מערכות תוכנה</span>
          <h1>כל המערכות שלנו,<br /><span className="grad">תחת קורת גג אחת</span></h1>
          <p className="lead">
            אנחנו בונים מערכות שעובדות באמת — ומחברים את כולן למקום אחד: more30.com.
            נדל"ן, תמלול, זכויות, בריאות וקהילה. הכול נגיש בכתובת אחת פשוטה.
          </p>
          <div className="hero-cta">
            <a className="btn btn-light" href="#intake">יש לי רעיון — בואו נדבר ←</a>
            <a className="btn btn-ghost" href="#systems">לכל המערכות</a>
          </div>
          <div className="statband reveal">
            {stats.map((s) => (
              <div className="stat" key={s.l}><div className="n">{s.n}</div><div className="l">{s.l}</div></div>
            ))}
          </div>
        </div>
      </header>

      {/* About / services */}
      <section id="about" className="section">
        <div className="wrap">
          <div className="eyebrow reveal">מה אנחנו נותנים</div>
          <h2 className="h2 reveal">בית אחד לכל השלבים</h2>
          <p className="sub reveal">מהרעיון הראשון ועד מערכת חיה עם משתמשים — אנחנו איתכם בכל צעד.</p>
          <div className="svc-grid">
            {SERVICES.map((s) => (
              <div className="svc reveal" key={s.h}>
                <div className="ic">{s.ic}</div>
                <h3>{s.h}</h3><p>{s.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Systems */}
      <section id="systems" className="section">
        <div className="wrap">
          <div className="eyebrow reveal">האקוסיסטם</div>
          <h2 className="h2 reveal">המערכות שלנו</h2>
          <p className="sub reveal">{rows.length} מערכות · {liveCount} כבר חיות · והרשימה ממשיכה לגדול</p>
          {depts.map((dep) => {
            const list = rows.filter((r) => r.department === dep).sort((a, b) => a.number.localeCompare(b.number));
            const accent = DEPT_ACCENT[dep] ?? DEPT_ACCENT.misc!;
            return (
              <div className="dept" key={dep}>
                <div className="dept-head reveal">
                  <span className="dept-emoji" style={{ background: accent }}>{DEPT_EMOJI[dep]}</span>
                  <h3>{DEPARTMENTS[dep]}</h3>
                  <span className="dept-count" style={{ color: accent }}>{list.length}</span>
                  <span className="dept-rule" />
                </div>
                <div className="cards">
                  {list.map((r) => <SystemCard key={r.number} r={r} accent={accent} />)}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Intake wizard */}
      <section id="intake" className="intake">
        <div className="wrap">
          <div className="eyebrow reveal">בואו נבנה משהו</div>
          <h2 className="h2 reveal">שאלון האפיון החכם 💡</h2>
          <p className="sub reveal">
            בוחרים מסלול, ומשם השאלון נבנה לפי מה שאתם עונים — בלי שדות שלא נוגעים לכם.
            רק השם חובה.
          </p>
          <SpecWizard />
        </div>
      </section>

      <footer className="footer">
        <div className="fb">MOR<span style={{ color: "#a78bfa" }}>1</span> · more30.com</div>
        <div className="muted">© 2026 מור מערכות תוכנה — עולם הסטארטאפים. כל המערכות תחת קורת גג אחת.</div>
      </footer>
    </div>
  );
}

function SystemCard({ r, accent }: { r: Row; accent: string }) {
  const on = enterable(r);
  const glyph = (r.path && SYS_GLYPH[r.path]) || "🚀";
  const desc = (r.what_it_does || "").split(/(?<=[.!?])\s/)[0] || r.what_it_does || "";
  const chips = (r.functions || "").split("·").map((s) => s.trim()).filter(Boolean).slice(0, 3);
  const href = `/${r.path}`;
  const pill = r.live
    ? <span className="pill live">● חי</span>
    : r.stage === "beta" ? <span className="pill beta">● בטא</span> : <span className="pill soon">● בקרוב</span>;

  const inner = (
    <>
      <div className="preview">
        <div className="chrome">
          <i style={{ background: "#ff5f57" }} /><i style={{ background: "#febc2e" }} /><i style={{ background: "#28c840" }} />
          <span className="u">more30.com/{r.path}</span>
        </div>
        <div className="preview-canvas" style={{ background: `radial-gradient(120% 120% at 30% 0%, ${accent}, ${accent}22 70%, #0b1020)` }}>
          <span className="glyph">{glyph}</span>
          <span className="wm">{r.name_he || r.name}</span>
        </div>
      </div>
      <div className="card-body">
        <div className="card-title"><h4>{r.name_he || r.name}</h4>{pill}</div>
        {desc && <p className="card-desc">{desc}</p>}
        {chips.length > 0 && <div className="chips">{chips.map((c, i) => <span className="chip" key={i}>{c}</span>)}</div>}
        {on
          ? <span className="card-cta on" style={{ color: accent }}>כניסה למערכת ←</span>
          : <span className="card-cta off">בקרוב · more30.com/{r.path}</span>}
      </div>
    </>
  );

  return on
    ? <a className="card on reveal" href={href}>{inner}</a>
    : <div className="card reveal">{inner}</div>;
}
