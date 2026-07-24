import { useState } from "react";
import { DEPARTMENTS, activeProjects, type ProjectEntry } from "@more30/config";
import { createBrowserClient } from "@more30/db";

/**
 * more30 — public portal (MOR1 brand style: clean, light, RTL, emoji iconography).
 * System cards come from the build-time registry (mirrors core.projects).
 * The startup-idea form submits via the anon RPC `submit_startup_idea`.
 */

const DEPT_EMOJI: Record<string, string> = {
  torah: "📚", finance: "💰", realestate: "🏠", health: "🏥",
  rights: "⚖️", community: "🤝", bkalut: "🎫", misc: "✨",
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

  return (
    <div style={{ fontFamily: "Assistant, 'Segoe UI', system-ui, sans-serif", direction: "rtl", color: "#0f172a", background: "#f8fafc" }}>
      {/* Hero */}
      <header style={{ background: "linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)", color: "#fff", padding: "64px 20px 72px" }}>
        <div style={wrap}>
          <div style={{ fontWeight: 800, fontSize: 30, letterSpacing: 1 }}>MOR<span style={{ color: "#c7d2fe" }}>1</span> · more30</div>
          <h1 style={{ fontSize: 44, margin: "20px 0 10px", lineHeight: 1.15 }}>עולם החלומות של הסטארטאפים, בקליק</h1>
          <p style={{ fontSize: 18, opacity: 0.9, maxWidth: 620 }}>
            עשרות מערכות פעילות, ליווי מלא מרעיון למוצר, והכול תחת קורת גג אחת — more30.com.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 26, flexWrap: "wrap" }}>
            <a href="#intake" style={{ ...btn, background: "#fff", color: "#4f46e5" }}>מגשימים את החלום ←</a>
            <a href="#systems" style={{ ...btn, background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.4)" }}>צפו במערכות</a>
          </div>
        </div>
      </header>

      {/* Services */}
      <section style={{ ...wrap, padding: "48px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
          {SERVICES.map((s) => (
            <div key={s.title} style={cardBox}>
              <div style={{ fontSize: 34 }}>{s.icon}</div>
              <div style={{ fontWeight: 700, margin: "8px 0 4px" }}>{s.title}</div>
              <div style={{ color: "#64748b", fontSize: 14 }}>{s.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Systems */}
      <section id="systems" style={{ ...wrap, padding: "8px 20px 48px" }}>
        <h2 style={{ fontSize: 28, textAlign: "center", marginBottom: 6 }}>המערכות שלנו</h2>
        <p style={{ textAlign: "center", color: "#64748b", marginTop: 0 }}>{projects.length} מערכות פעילות ובפיתוח</p>
        {depts.map((dep) => (
          <div key={dep} style={{ marginTop: 28 }}>
            <h3 style={{ fontSize: 18, color: "#334155" }}>{DEPT_EMOJI[dep]} {DEPARTMENTS[dep]}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 14 }}>
              {projects.filter((p) => p.department === dep).map((p) => {
                const href = p.liveUrl ?? undefined;
                const Inner = (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 700 }}>{p.name}</span>{statusPill(p)}
                    </div>
                    <div style={{ color: "#64748b", fontSize: 13, marginTop: 8 }}>
                      {href ? "כניסה למערכת ↗" : "בקרוב תחת more30.com"}
                    </div>
                  </>
                );
                return href
                  ? <a key={p.number} href={href} target="_blank" rel="noreferrer" style={{ ...cardBox, textDecoration: "none", color: "#0f172a" }}>{Inner}</a>
                  : <div key={p.number} style={{ ...cardBox, opacity: 0.85 }}>{Inner}</div>;
              })}
            </div>
          </div>
        ))}
      </section>

      {/* Intake */}
      <section id="intake" style={{ background: "#fff", borderTop: "1px solid #e2e8f0", padding: "48px 20px" }}>
        <div style={{ ...wrap, maxWidth: 760 }}>
          <h2 style={{ fontSize: 28, textAlign: "center" }}>יש לכם רעיון? ספרו לנו 💡</h2>
          <p style={{ textAlign: "center", color: "#64748b" }}>מלאו את השאלון ונחזור אליכם. כל השדות מלבד השם — רשות.</p>
          <IntakeForm />
        </div>
      </section>

      <footer style={{ textAlign: "center", padding: 24, color: "#94a3b8", fontSize: 13 }}>
        © MOR1 · more30.com — עולם הסטארטאפים
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

  if (state === "done") return <div style={{ ...cardBox, textAlign: "center", borderColor: "#86efac" }}>✅ קיבלנו! תודה — נחזור אליכם בהקדם.</div>;

  return (
    <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
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
const btn: React.CSSProperties = { padding: "12px 22px", borderRadius: 10, fontWeight: 700, textDecoration: "none", border: "none", cursor: "pointer", fontSize: 15 };
const cardBox: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 18, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" };
const pill: React.CSSProperties = { fontSize: 12, padding: "3px 10px", borderRadius: 999, fontWeight: 600 };
const row2: React.CSSProperties = { display: "flex", gap: 12, flexWrap: "wrap" };
const lbl: React.CSSProperties = { fontSize: 13, color: "#475569", fontWeight: 600 };
const inp: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 10px", fontSize: 14, marginTop: 4 };
