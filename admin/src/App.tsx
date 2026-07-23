import { useEffect, useMemo, useState } from "react";
import { REGISTRY, DEPARTMENTS, type ProjectEntry } from "@more30/config";
import { createBrowserClient, type SupabaseClient } from "@more30/db";

/**
 * more30 · לוח שליטה מרכזי ("הקישור האחד").
 *
 * READ: public.more30_project_overview / more30_tasks / more30_tokens (anon-safe
 * views on the `core` registry — no core schema exposure needed).
 * WRITE: RPCs public.more30_add_task / set_task_status / set_delete, gated to a
 * signed-in super admin. Without a session the board is read-only.
 *
 * If Supabase env vars are absent the static REGISTRY still renders (offline mode).
 */

interface Overview {
  number: string; name: string; department: string; category: string;
  stage: string; live: boolean; is_deployed: boolean; deploy_target: string | null;
  live_url: string | null; admin_url: string | null; is_protected: boolean;
  to_delete: boolean; supabase_project: string | null; supabase_schema: string | null;
  note: string | null; open_bugs: number; open_tasks: number; missing_tokens: number;
}
interface Task { id: string; project_num: string; title: string; status: string; author: string; }
interface Token { id: string; project_num: string; env_var: string; purpose: string | null; obtain_url: string | null; paste_location: string | null; status: string; }

let sb: SupabaseClient | null = null;
try { sb = createBrowserClient("public"); } catch { sb = null; }

const DEPT_KEYS = Object.keys(DEPARTMENTS);

export function App() {
  const [rows, setRows] = useState<Overview[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [email, setEmail] = useState("");
  const [session, setSession] = useState<unknown>(null);
  const [msg, setMsg] = useState<string | null>(sb ? null : "מצב לא-מקוון: אין חיבור Supabase (חסרים VITE_SUPABASE_URL/ANON_KEY). מוצג המרשם הסטטי.");
  const [fDept, setFDept] = useState("");
  const [fStage, setFStage] = useState("");
  const [fLive, setFLive] = useState(false);
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});

  async function load() {
    if (!sb) return;
    const [ov, tk, tok] = await Promise.all([
      sb.from("more30_project_overview").select("*"),
      sb.from("more30_tasks").select("*"),
      sb.from("more30_tokens").select("*"),
    ]);
    if (ov.error) { setMsg("שגיאת קריאה: " + ov.error.message); return; }
    setRows((ov.data ?? []) as Overview[]);
    setTasks((tk.data ?? []) as Task[]);
    setTokens((tok.data ?? []) as Token[]);
  }

  useEffect(() => {
    if (!sb) return;
    load();
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const isAuthed = !!session;

  async function signIn() {
    if (!sb || !email) return;
    const { error } = await sb.auth.signInWithOtp({ email });
    setMsg(error ? "שגיאת התחברות: " + error.message : "נשלח קישור התחברות למייל.");
  }
  async function signOut() { if (sb) { await sb.auth.signOut(); setSession(null); } }

  async function addTask(num: string) {
    const title = (draft[num] ?? "").trim();
    if (!sb || !title) return;
    const { error } = await sb.rpc("more30_add_task", { p_num: num, p_title: title, p_author: "user" });
    if (error) { setMsg("צריך התחברות אדמין כדי להוסיף משימה. " + error.message); return; }
    setDraft({ ...draft, [num]: "" }); load();
  }
  async function toggleTask(t: Task) {
    if (!sb) return;
    const next = t.status === "done" ? "todo" : "done";
    const { error } = await sb.rpc("more30_set_task_status", { p_id: t.id, p_status: next });
    if (error) { setMsg("צריך התחברות אדמין. " + error.message); return; }
    load();
  }
  async function toggleDelete(num: string, flag: boolean) {
    if (!sb) return;
    const { error } = await sb.rpc("more30_set_delete", { p_num: num, p_flag: flag });
    if (error) { setMsg("צריך התחברות אדמין. " + error.message); return; }
    load();
  }

  // Merge live rows over static registry so it always shows all 32.
  const merged: Overview[] = useMemo(() => {
    if (rows.length) return rows;
    return REGISTRY.map((p: ProjectEntry) => ({
      number: p.number, name: p.name, department: p.department, category: p.category,
      stage: p.stage, live: p.live, is_deployed: !!p.isDeployed, deploy_target: p.deployTarget,
      live_url: p.liveUrl ?? null, admin_url: p.adminUrl ?? null, is_protected: p.protected,
      to_delete: false, supabase_project: p.supabaseProject ?? null, supabase_schema: p.supabaseSchema,
      note: p.note ?? null, open_bugs: 0, open_tasks: 0, missing_tokens: 0,
    }));
  }, [rows]);

  const filtered = merged.filter((r) =>
    (!fDept || r.department === fDept) &&
    (!fStage || r.stage === fStage) &&
    (!fLive || r.live) &&
    (!q || (r.name + r.number + (r.note ?? "")).toLowerCase().includes(q.toLowerCase()))
  );

  const byDept: Record<string, Overview[]> = {};
  for (const r of filtered) (byDept[r.department] ??= []).push(r);

  const stats = {
    total: merged.length,
    live: merged.filter((r) => r.live).length,
    deployed: merged.filter((r) => r.is_deployed).length,
    protectedN: merged.filter((r) => r.is_protected).length,
    tokens: tokens.length,
  };

  return (
    <main style={{ fontFamily: "Assistant, system-ui, sans-serif", padding: 20, direction: "rtl", background: "#f8fafc", minHeight: "100vh" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26 }}>more30 · לוח שליטה מרכזי</h1>
          <p style={{ color: "#64748b", margin: "4px 0" }}>הקישור האחד — כל {stats.total} המערכות במקום אחד.</p>
        </div>
        <div style={{ textAlign: "left", fontSize: 13 }}>
          {isAuthed ? (
            <span>מחובר · <button onClick={signOut} style={btn}>התנתק</button></span>
          ) : (
            <span>
              <input placeholder="מייל אדמין" value={email} onChange={(e) => setEmail(e.target.value)} style={inp} />
              <button onClick={signIn} style={btn}>שלח קישור</button>
            </span>
          )}
        </div>
      </header>

      {msg && <div style={{ background: "#fef9c3", border: "1px solid #fde68a", padding: "8px 12px", borderRadius: 8, margin: "8px 0", fontSize: 13 }}>{msg}</div>}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "12px 0" }}>
        {[["סה\"כ", stats.total], ["חי", stats.live], ["פרוס", stats.deployed], ["מוגן", stats.protectedN], ["טוקנים חסרים", stats.tokens]].map(([k, v]) => (
          <div key={k as string} style={chip}><b style={{ fontSize: 18 }}>{v as number}</b><div style={{ fontSize: 12, color: "#64748b" }}>{k as string}</div></div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0 16px" }}>
        <select value={fDept} onChange={(e) => setFDept(e.target.value)} style={inp}>
          <option value="">כל המחלקות</option>
          {DEPT_KEYS.map((d) => <option key={d} value={d}>{DEPARTMENTS[d]}</option>)}
        </select>
        <select value={fStage} onChange={(e) => setFStage(e.target.value)} style={inp}>
          <option value="">כל השלבים</option>
          {["live", "beta", "wip", "protected", "archived"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <label style={{ fontSize: 13, alignSelf: "center" }}><input type="checkbox" checked={fLive} onChange={(e) => setFLive(e.target.checked)} /> חי בלבד</label>
        <input placeholder="חיפוש…" value={q} onChange={(e) => setQ(e.target.value)} style={{ ...inp, flex: 1, minWidth: 160 }} />
      </div>

      {DEPT_KEYS.filter((d) => byDept[d]?.length).map((dep) => (
        <section key={dep} style={{ marginBottom: 22 }}>
          <h2 style={{ fontSize: 18, borderBottom: "2px solid #e2e8f0", paddingBottom: 6 }}>{DEPARTMENTS[dep]} <span style={{ color: "#94a3b8", fontSize: 14 }}>({byDept[dep].length})</span></h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
            {byDept[dep].sort((a, b) => a.number.localeCompare(b.number)).map((r) => {
              const myTasks = tasks.filter((t) => t.project_num === r.number);
              const myTokens = tokens.filter((t) => t.project_num === r.number);
              return (
                <div key={r.number} style={{ ...card, opacity: r.is_protected ? 0.7 : 1, borderColor: r.to_delete ? "#fca5a5" : "#e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <b>{r.number} · {r.name}{r.is_protected ? " 🔒" : ""}</b>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>{r.category}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "6px 0" }}>
                    <Badge on={r.live} label={r.live ? "חי" : "לא חי"} color={r.live ? "#16a34a" : "#94a3b8"} />
                    <Badge on label={r.stage} color="#6366f1" />
                    <Badge on={r.is_deployed} label={r.is_deployed ? "פרוס" : "לא פרוס"} color={r.is_deployed ? "#0891b2" : "#94a3b8"} />
                    {r.deploy_target && r.deploy_target !== "unknown" && <Badge on label={r.deploy_target} color="#334155" />}
                    {r.missing_tokens > 0 && <Badge on label={`${r.missing_tokens} טוקנים חסרים`} color="#dc2626" />}
                  </div>
                  <div style={{ fontSize: 12, color: "#475569" }}>
                    DB: {r.supabase_project ? `${r.supabase_project.slice(0, 8)}… / ${r.supabase_schema ?? "?"}` : "—"}
                  </div>
                  {r.note && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{r.note}</div>}

                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    {r.live_url && <a href={r.live_url} target="_blank" rel="noreferrer" style={linkBtn}>אתר חי ↗</a>}
                    {(() => {
                      if (!r.admin_url) return <span style={{ ...linkBtn, opacity: 0.5 }}>אין admin_url</span>;
                      const abs = r.admin_url.startsWith("http");
                      const href = abs ? r.admin_url : (r.live_url ? r.live_url.replace(/\/$/, "") + r.admin_url : null);
                      return href
                        ? <a href={href} target="_blank" rel="noreferrer" style={linkBtn}>כניסת אדמין ↗</a>
                        : <span style={{ ...linkBtn, opacity: 0.7 }} title="נתיב יחסי — צריך live_url">אדמין: {r.admin_url}</span>;
                    })()}
                  </div>

                  {myTokens.length > 0 && (
                    <details style={{ marginTop: 8 }}>
                      <summary style={{ fontSize: 12, color: "#dc2626", cursor: "pointer" }}>טוקנים חסרים ({myTokens.length})</summary>
                      <ul style={{ fontSize: 12, margin: "4px 0", paddingInlineStart: 18 }}>
                        {myTokens.map((t) => (
                          <li key={t.id}><code>{t.env_var}</code> — {t.purpose}{t.obtain_url ? <> · <a href={t.obtain_url} target="_blank" rel="noreferrer">השג</a></> : null}</li>
                        ))}
                      </ul>
                    </details>
                  )}

                  <details style={{ marginTop: 8 }} open={myTasks.length > 0}>
                    <summary style={{ fontSize: 12, cursor: "pointer" }}>משימות ({myTasks.filter((t) => t.status !== "done").length})</summary>
                    <ul style={{ listStyle: "none", padding: 0, margin: "6px 0" }}>
                      {myTasks.map((t) => (
                        <li key={t.id} style={{ fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}>
                          <input type="checkbox" checked={t.status === "done"} onChange={() => toggleTask(t)} />
                          <span style={{ textDecoration: t.status === "done" ? "line-through" : "none", color: t.author === "user" ? "#0f172a" : "#475569" }}>
                            {t.title} <em style={{ color: "#94a3b8" }}>({t.author})</em>
                          </span>
                        </li>
                      ))}
                    </ul>
                    {!r.is_protected && (
                      <div style={{ display: "flex", gap: 4 }}>
                        <input placeholder="משימה חדשה…" value={draft[r.number] ?? ""} onChange={(e) => setDraft({ ...draft, [r.number]: e.target.value })} style={{ ...inp, flex: 1, fontSize: 12 }} />
                        <button onClick={() => addTask(r.number)} style={btn}>＋</button>
                      </div>
                    )}
                  </details>

                  {!r.is_protected && (
                    <label style={{ fontSize: 12, color: "#dc2626", display: "block", marginTop: 8 }}>
                      <input type="checkbox" checked={r.to_delete} onChange={(e) => toggleDelete(r.number, e.target.checked)} /> סמן למחיקה
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}

function Badge({ on, label, color }: { on: boolean; label: string; color: string }) {
  if (!on) return <span style={{ ...badge, background: "#f1f5f9", color: "#94a3b8" }}>{label}</span>;
  return <span style={{ ...badge, background: color + "22", color }}>{label}</span>;
}

const card: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" };
const badge: React.CSSProperties = { fontSize: 11, padding: "2px 8px", borderRadius: 999, fontWeight: 600 };
const chip: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 16px", textAlign: "center", minWidth: 80 };
const btn: React.CSSProperties = { border: "1px solid #cbd5e1", background: "#fff", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 13 };
const linkBtn: React.CSSProperties = { border: "1px solid #cbd5e1", background: "#f8fafc", borderRadius: 8, padding: "4px 10px", fontSize: 12, textDecoration: "none", color: "#0f172a" };
const inp: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 8, padding: "5px 10px", fontSize: 13 };
