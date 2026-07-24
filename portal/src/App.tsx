import { useState } from "react";
import { DEPARTMENTS, activeProjects, type ProjectEntry } from "@more30/config";
import { createBrowserClient } from "@more30/db";

/**
 * more30 — public portal (MOR1 brand: clean, light, RTL, emoji iconography).
 * System cards come from the build-time registry (mirrors core.projects).
 * The startup-idea form submits via the anon RPC `submit_startup_idea`.
 */

const DEPT_EMOJI: Record<string, string> = {
  torah: "📚", finance: "💰", realestate: "🏠", health: "🏥",
  rights: "⚖️", community: "🤝", bkalut: "🎫", misc: "✨",
};
// Per-department accent color — gives each section a distinct, coherent identity.
const DEPT_ACCENT: Record<string, string> = {
  torah: "#7c3aed", finance: "#0ea5e9", realestate: "#0d9488", health: "#e11d48",
  rights: "#d97706", community: "#4f46e5", bkalut: "#64748b", misc: "#db2777",
};

const SERVICES = [
  { icon: "💻", title: "מערכות מוכנות", text: "עשרות מערכות SaaS פעילות — כולן במקום אחד." },
  { icon: "🧭", title: "ליווי מקצה לקצה", text: "מרעיון ועד מוצר חי, עם צוות שמבין סטארטאפים." },
  { icon: "🤝", title: "שותפויות", text: "חיבור ליזמים, שותפים ומשקיעים באקוסיסטם." },
  { icon: "📊", title: "נתונים ושליטה", text: "לוח בקרה מרכזי לכל המערכות והנתונים." },
];
const SERVICE_OPTIONS = ["בניית מערכת", "עיצוב ומיתוג", "שיווק ופרסום", "ליווי עסקי", "גיוס השקעה", "אוטומציות", "תמיכה טכנית"];

let sb: ReturnType<typeof createBrowserClient> | null = null;
try { sb = createBrowserClient("public"); } catch { sb = null; }

function statusPill(p: ProjectEntry) {
  if (p.live) return <span style={{ ...pill, background: "#dcfce7", color: "#15803d" }}>● חי</span>;
  if (p.stage === "beta") return <span style={{ ...pill, background: "#fef3c7", color: "#b45309" }}>● בטא</span>;
  return <span style={{ ...pill, background: "#e0e7ff", color: "#4338ca" }}>● בקרוב</span>;
}

export function App() {
  const projects = activeProjects();
  const depts = Object.keys(DEPARTMENTS).filter((d) => d !== "bkalut" && projects.some((p) => p.department === d));
  const liveCount = projects.filter((p) => p.live).length;
  const stats = [
    { n: projects.length, label: "מערכות" },
    { n: liveCount, label: "חיות עכשיו" },
    { n: depts.length, label: "תחומים" },
    { n: "1", label: "קורת גג" },
  ];

  return (
    <div style={{ fontFamily: "Assistant, 'Segoe UI', system-ui, sans-serif", direction: "rtl", color: "#0f172a", background: "#f6f7fb" }}>
      {/* Sticky nav */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.85)", backdropFilter: "blur(10px)", borderBottom: "1px solid #eef0f6" }}>
        <div style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px" }}>
          <div style={{ fontFamily: "Rubik, sans-serif", fontWeight: 900, fontSize: 22, letterSpacing: 0.5 }}>
            MOR<span style={{ color: "#7c3aed" }}>1</span>
            <span style={{ color: "#94a3b8", fontWeight: 500, fontSize: 15, marginInlineStart: 8 }}>· more30</span>
          </div>
          <div style={{ display: "flex", gap: 22, alignItems: "center", fontSize: 15, fontWeight: 600 }}>
            <a href="#systems" style={navLink}>המערכות</a>
            <a href="#services" style={navLink}>מה אנחנו נותנים</a>
            <a href="#intake" style={{ ...btn, background: "#4f46e5", color: "#fff", padding: "9px 18px", fontSize: 14 }}>ספרו לנו רעיון</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header style={{ position: "relative", overflow: "hidden", background: "linear-gradient(135deg,#4f46e5 0%,#7c3aed 55%,#9333ea 100%)", color: "#fff", padding: "72px 20px 0" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 80% -10%, rgba(255,255,255,0.18), transparent 45%)", pointerEvents: "none" }} />
        <div style={{ ...wrap, position: "relative" }}>
          <span style={heroTag}>🚀 מור מערכות תוכנה · אקוסיסטם אחד</span>
          <h1 style={{ fontFamily: "Rubik, sans-serif", fontSize: "clamp(32px, 5vw, 50px)", margin: "18px 0 12px", lineHeight: 1.12, fontWeight: 900 }}>
            עולם החלומות של<br />הסטארטאפים, בקליק
          </h1>
          <p style={{ fontSize: 19, opacity: 0.92, maxWidth: 600, lineHeight: 1.6 }}>
            עשרות מערכות פעילות, ליווי מלא מרעיון למוצר, והכול תחת קורת גג אחת — more30.com.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
            <a href="#intake" style={{ ...btn, background: "#fff", color: "#4f46e5", boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}>מגשימים את החלום ←</a>
            <a href="#systems" style={{ ...btn, background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.45)" }}>צפו במערכות</a>
          </div>
          {/* Stat band */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 14, margin: "48px 0 -36px", background: "#fff", borderRadius: 18, padding: "22px 16px", boxShadow: "0 20px 50px rgba(30,27,75,0.28)" }}>
            {stats.map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "Rubik, sans-serif", fontSize: 34, fontWeight: 900, color: "#4f46e5", lineHeight: 1 }}>{s.n}</div>
                <div style={{ color: "#64748b", fontSize: 14, marginTop: 6, fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Services */}
      <section id="services" style={{ ...wrap, padding: "72px 20px 8px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
          {SERVICES.map((s) => (
            <div key={s.title} style={{ ...cardBox, transition: "transform .18s, box-shadow .18s" }}>
              <div style={{ fontSize: 34 }}>{s.icon}</div>
              <div style={{ fontWeight: 700, margin: "10px 0 4px", fontSize: 17 }}>{s.title}</div>
              <div style={{ color: "#64748b", fontSize: 14, lineHeight: 1.55 }}>{s.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Systems */}
      <section id="systems" style={{ ...wrap, padding: "48px 20px" }}>
        <h2 style={{ fontFamily: "Rubik, sans-serif", fontSize: 30, textAlign: "center", marginBottom: 6, fontWeight: 900 }}>המערכות שלנו</h2>
        <p style={{ textAlign: "center", color: "#64748b", marginTop: 0, fontSize: 16 }}>{projects.length} מערכות · {liveCount} כבר חיות · והרשימה גדלה</p>
        {depts.map((dep) => {
          const list = projects.filter((p) => p.department === dep);
          const accent = DEPT_ACCENT[dep];
          return (
            <div key={dep} style={{ marginTop: 34 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 22 }}>{DEPT_EMOJI[dep]}</span>
                <h3 style={{ fontSize: 20, color: "#1e293b", margin: 0, fontWeight: 700 }}>{DEPARTMENTS[dep]}</h3>
                <span style={{ ...pill, background: "#eef2ff", color: accent }}>{list.length}</span>
                <span style={{ flex: 1, height: 1, background: "#e9ecf4" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: 14 }}>
                {list.map((p) => {
                  const href = p.liveUrl ?? undefined;
                  const desc = p.note?.split(/[.·]/)[0]?.trim();
                  const Inner = (
                    <>
                      <span style={{ position: "absolute", insetInlineStart: 0, top: 14, bottom: 14, width: 4, borderRadius: 4, background: accent }} />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 16 }}>{p.name}</span>{statusPill(p)}
                      </div>
                      {desc && <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 8, lineHeight: 1.5, minHeight: 34 }}>{desc}</div>}
                      <div style={{ color: href ? accent : "#94a3b8", fontSize: 13, marginTop: 10, fontWeight: 600 }}>
                        {href ? "כניסה למערכת ↗" : "בקרוב תחת more30.com"}
                      </div>
                    </>
                  );
                  const boxStyle: React.CSSProperties = { ...cardBox, position: "relative", paddingInlineStart: 22, textDecoration: "none", color: "#0f172a" };
                  return href
                    ? <a key={p.number} href={href} target="_blank" rel="noreferrer" style={boxStyle}>{Inner}</a>
                    : <div key={p.number} style={{ ...boxStyle, opacity: 0.9 }}>{Inner}</div>;
                })}
              </div>
            </div>
          );
        })}
      </section>

      {/* Intake */}
      <section id="intake" style={{ background: "linear-gradient(180deg,#fff 0%,#f3f0ff 100%)", borderTop: "1px solid #e2e8f0", padding: "64px 20px" }}>
        <div style={{ ...wrap, maxWidth: 760 }}>
          <h2 style={{ fontFamily: "Rubik, sans-serif", fontSize: 30, textAlign: "center", fontWeight: 900, margin: 0 }}>יש לכם רעיון? ספרו לנו 💡</h2>
          <p style={{ textAlign: "center", color: "#64748b", fontSize: 16 }}>מלאו את השאלון ונחזור אליכם. כל השדות מלבד השם — רשות.</p>
          <IntakeForm />
        </div>
      </section>

      <footer style={{ textAlign: "center", padding: "32px 20px", color: "#94a3b8", fontSize: 13, background: "#0f172a" }}>
        <div style={{ fontFamily: "Rubik, sans-serif", fontWeight: 900, fontSize: 18, color: "#e2e8f0", marginBottom: 6 }}>MOR<span style={{ color: "#a78bfa" }}>1</span> · more30.com</div>
        © {2026} מור מערכות תוכנה — עולם הסטארטאפים. כל המערכות תחת קורת גג אחת.
      </footer>
    </div>
  );
}

function IntakeForm() {
  const [f, setF] = useState<Record<string, string>>({});
  const [svc, setSvc] = useState<string[]>([]);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [err, setErr] = useState("");
  const up = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function submit() {
    if (!f.full_name || !f.full_name.trim()) { setErr("שם מלא הוא שדה חובה."); return; }
    if (!sb) { setErr("החיבור לשרת אינו זמין כרגע."); return; }
    setState("sending"); setErr("");
    const payload = { ...f, services_wanted: svc,
      needs_partners: f.needs_partners === "כן", seeking_investment: f.seeking_investment === "כן", has_existing_product: f.has_existing_product === "כן" };
    const { error } = await sb.rpc("submit_startup_idea", { payload });
    if (error) { setState("error"); setErr(error.message); return; }
    setState("done");
  }

  if (state === "done") return <div style={{ ...cardBox, textAlign: "center", borderColor: "#86efac", marginTop: 24 }}>✅ קיבלנו! תודה — נחזור אליכם בהקדם.</div>;

  return (
    <div style={{ display: "grid", gap: 12, marginTop: 24, background: "#fff", padding: 24, borderRadius: 18, boxShadow: "0 10px 40px rgba(79,70,229,0.10)", border: "1px solid #ece9fb" }}>
      <div style={row2}>
        <Field label="שם מלא *" onChange={up("full_name")} />
        <Field label="טלפון" onChange={up("phone")} />
      </div>
      <div style={row2}>
        <Field label="אימייל" onChange={up("email")} />
        <Field label="עיר" onChange={up("city")} />
      </div>
      <Field label="שם הפרויקט/הרעיון" onChange={up("project_name")} />
      <Field label="תיאור קצר במשפט" onChange={up("short_description")} />
      <Area label="איזו בעיה אתם פותרים?" onChange={up("problem")} />
      <Area label="מה הפתרון שלכם?" onChange={up("solution")} />
      <div style={row2}>
        <Field label="קהל היעד" onChange={up("target_customer")} />
        <Field label="מודל הכנסה" onChange={up("revenue_model")} />
      </div>
      <div style={row2}>
        <Field label="מתחרים" onChange={up("competitors")} />
        <Field label="הבידול שלכם" onChange={up("differentiation")} />
      </div>
      <div style={row2}>
        <Select label="בשלב איזה?" opts={["רעיון", "אבטיפוס", "מוצר חי", "צומח"]} onChange={up("stage")} />
        <Select label="מחפשים השקעה?" opts={["לא", "כן"]} onChange={up("seeking_investment")} />
      </div>
      <div style={row2}>
        <Field label="כמה גיוס דרוש?" onChange={up("funding_needed")} />
        <Field label="לו״ז להשקה" onChange={up("launch_timeline")} />
      </div>
      <div>
        <label style={lbl}>אילו שירותים תרצו מ-more30?</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
          {SERVICE_OPTIONS.map((o) => (
            <label key={o} style={{ ...pill, background: svc.includes(o) ? "#4f46e5" : "#f1f5f9", color: svc.includes(o) ? "#fff" : "#334155", cursor: "pointer" }}>
              <input type="checkbox" style={{ display: "none" }} checked={svc.includes(o)}
                onChange={() => setSvc(svc.includes(o) ? svc.filter((x) => x !== o) : [...svc, o])} />{o}
            </label>
          ))}
        </div>
      </div>
      <Area label="ספרו לנו על החלום שלכם (חופשי)" onChange={up("dream_free_text")} />
      {err && <div style={{ color: "#dc2626", fontSize: 13 }}>{err}</div>}
      <button onClick={submit} disabled={state === "sending"} style={{ ...btn, background: "#4f46e5", color: "#fff", justifySelf: "start" }}>
        {state === "sending" ? "שולח…" : "שליחת הרעיון ←"}
      </button>
    </div>
  );
}

const Field = ({ label, onChange }: { label: string; onChange: React.ChangeEventHandler<HTMLInputElement> }) => (
  <div style={{ flex: 1 }}><label style={lbl}>{label}</label><input style={inp} onChange={onChange} /></div>
);
const Area = ({ label, onChange }: { label: string; onChange: React.ChangeEventHandler<HTMLTextAreaElement> }) => (
  <div><label style={lbl}>{label}</label><textarea rows={2} style={{ ...inp, resize: "vertical" }} onChange={onChange} /></div>
);
const Select = ({ label, opts, onChange }: { label: string; opts: string[]; onChange: React.ChangeEventHandler<HTMLSelectElement> }) => (
  <div style={{ flex: 1 }}><label style={lbl}>{label}</label><select style={inp} onChange={onChange}><option value=""></option>{opts.map((o) => <option key={o}>{o}</option>)}</select></div>
);

const wrap: React.CSSProperties = { maxWidth: 1080, margin: "0 auto" };
const btn: React.CSSProperties = { padding: "12px 22px", borderRadius: 12, fontWeight: 700, textDecoration: "none", border: "none", cursor: "pointer", fontSize: 15, display: "inline-block" };
const navLink: React.CSSProperties = { color: "#475569", textDecoration: "none" };
const heroTag: React.CSSProperties = { display: "inline-block", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 999, padding: "6px 14px", fontSize: 14, fontWeight: 600 };
const cardBox: React.CSSProperties = { background: "#fff", border: "1px solid #eaecf3", borderRadius: 16, padding: 18, boxShadow: "0 1px 3px rgba(16,24,40,0.05)" };
const pill: React.CSSProperties = { fontSize: 12, padding: "3px 10px", borderRadius: 999, fontWeight: 700, whiteSpace: "nowrap" };
const row2: React.CSSProperties = { display: "flex", gap: 12, flexWrap: "wrap" };
const lbl: React.CSSProperties = { fontSize: 13, color: "#475569", fontWeight: 600 };
const inp: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: 8, padding: "9px 11px", fontSize: 14, marginTop: 4, fontFamily: "inherit" };
