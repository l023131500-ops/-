import { useEffect, useMemo, useState } from "react";
import { REGISTRY, DEPARTMENTS, TOPIC_ROUTES, type ProjectEntry } from "@more30/config";
import { createBrowserClient, type SupabaseClient } from "@more30/db";

/**
 * more30 · לוח שליטה מרכזי — שני מסכים: מערכות + רעיונות נכנסים.
 * READ systems: public.more30_project_overview / _tasks / _tokens / _bugs (anon-safe).
 * READ ideas (PII): RPC more30_intake_list (admin only). WRITE: gated RPCs.
 */
interface Overview {
  number: string; name: string; name_he?: string | null; path?: string | null;
  what_it_does?: string | null; functions?: string | null;
  fixed_notes?: string | null; changed_notes?: string | null;
  department: string; category: string; stage: string;
  live: boolean; is_deployed: boolean; deploy_target: string | null; live_url: string | null;
  admin_url: string | null; is_protected: boolean; to_delete: boolean;
  supabase_project: string | null; supabase_schema: string | null; note: string | null;
  open_bugs: number; open_tasks: number; missing_tokens: number;
}
const routedOnDomain = (r: Overview) => !!r.live_url && r.live_url.includes("more30.com");
interface Task { id: string; project_num: string; title: string; status: string; author: string; }
interface Token { id: string; project_num: string; env_var: string; purpose: string | null; obtain_url: string | null; paste_location: string | null; status: string; }
interface Bug { id: string; project_num: string; title: string; severity: string; status: string; }
interface Idea { id: string; full_name: string; phone: string | null; email: string | null; city: string | null;
  project_name: string | null; stage: string | null; short_description: string | null; problem: string | null;
  solution: string | null; target_customer: string | null; revenue_model: string | null; competitors: string | null;
  differentiation: string | null; funding_needed: string | null; launch_timeline: string | null;
  services_wanted: string[] | null; dream_free_text: string | null; status: string; created_at: string;
  converted_project_num: string | null; }

/** אפיון מהשאלון החכם (מערכת 33). התשובות דינמיות ולכן נשמרות כ-jsonb. */
interface Spec {
  id: string; created_at: string;
  full_name: string; phone: string | null; email: string | null; city: string | null;
  project_name: string | null; track: string | null;
  answers: Record<string, string | string[]>;
  questions: { key: string; label: string; step: string }[];
  services_wanted: string[] | null;
  status: string;
  ai_status: string; ai_model: string | null; ai_analysis: string | null; ai_error: string | null;
  ai_completed_at: string | null;
}

let sb: SupabaseClient | null = null;
try { sb = createBrowserClient("public"); } catch { sb = null; }
const DEPT_KEYS = Object.keys(DEPARTMENTS);
const IDEA_STATUS = ["new", "reviewing", "approved", "rejected"];
const IDEA_STATUS_HE: Record<string, string> = { new: "חדש", reviewing: "בבדיקה", approved: "אושר", rejected: "נדחה" };
const SPEC_STATUS = ["new", "reviewing", "analyzed", "converted", "rejected"];
const SPEC_STATUS_HE: Record<string, string> = { new: "חדש", reviewing: "בבדיקה", analyzed: "נותח", converted: "הפך לפרויקט", rejected: "נדחה" };

/**
 * הניהול מוגש תחת more30.com/nihul, והפונקציה שמריצה את ניתוח ה-AI יושבת
 * באותו origin (הפורטל) ב-/api/spec-analyze. בפיתוח מקומי אין פונקציה —
 * ואז אפשר להצביע לפרודקשן דרך VITE_API_BASE.
 */
const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? "";

export function App() {
  const [view, setView] = useState<"systems" | "ideas" | "specs">("systems");
  const [rows, setRows] = useState<Overview[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [aiBusy, setAiBusy] = useState<Record<string, boolean>>({});
  const [email, setEmail] = useState("");
  const [session, setSession] = useState<unknown>(null);
  const [msg, setMsg] = useState<string | null>(sb ? null : "מצב לא-מקוון: אין חיבור Supabase.");
  const [fDept, setFDept] = useState(""); const [fStage, setFStage] = useState(""); const [fLive, setFLive] = useState(false); const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [conv, setConv] = useState<Record<string, { slug: string; dept: string; cat: string }>>({});

  async function loadSystems() {
    if (!sb) return;
    const [ov, tk, tok, bg] = await Promise.all([
      sb.from("more30_project_overview").select("*"),
      sb.from("more30_tasks").select("*"),
      sb.from("more30_tokens").select("*"),
      sb.from("more30_bugs").select("*"),
    ]);
    if (ov.error) { setMsg("שגיאת קריאה: " + ov.error.message); return; }
    setRows((ov.data ?? []) as Overview[]); setTasks((tk.data ?? []) as Task[]);
    setTokens((tok.data ?? []) as Token[]); setBugs((bg.data ?? []) as Bug[]);
  }
  async function loadIdeas() {
    if (!sb) return;
    const { data, error } = await sb.rpc("more30_intake_list");
    if (error) { setMsg("רעיונות נכנסים דורשים התחברות אדמין. " + error.message); setIdeas([]); return; }
    setIdeas((data ?? []) as Idea[]);
  }

  async function loadSpecs() {
    if (!sb) return;
    const { data, error } = await sb.rpc("more30_spec_list");
    if (error) { setMsg("אפיונים דורשים התחברות אדמין. " + error.message); setSpecs([]); return; }
    setSpecs((data ?? []) as Spec[]);
  }
  async function setSpecStatus(id: string, s: string) {
    if (!sb) return;
    const { error } = await sb.rpc("more30_spec_set_status", { p_id: id, p_status: s });
    if (error) { setMsg(error.message); return; }
    loadSpecs();
  }

  /**
   * "שלח לניתוח AI": הפונקציה בשרת היא זו שמחזיקה את מפתח ה-AI. אנחנו רק
   * מעבירים לה את ה-JWT של האדמין המחובר — היא מאמתת דרכו הרשאה, מריצה את
   * הניתוח וכותבת אותו למסד.
   *
   * הניתוח לוקח כדקה, ולכן לא מחכים לתשובת ה-fetch כדי לדעת מה קרה: הפונקציה
   * כותבת `ai_status` למסד, ואנחנו עוקבים אחריו בתשאול. כך גם אם החיבור של
   * הדפדפן נופל באמצע — התוצאה עדיין תופיע, ואין כפתור שנתקע ב"מנתח…".
   */
  async function analyzeSpec(id: string) {
    if (!sb || aiBusy[id]) return;

    // getSession מחזיר את הטוקן השמור גם כשפג תוקפו, וטוקן פג = 401 מהפונקציה.
    // refreshSession מבטיח שנשלח טוקן חי; אם הרענון נכשל — אין ממש התחברות.
    let jwt = (await sb.auth.getSession()).data.session?.access_token ?? "";
    const { data: fresh } = await sb.auth.refreshSession();
    if (fresh.session?.access_token) jwt = fresh.session.access_token;
    if (!jwt) { setMsg("צריך התחברות אדמין כדי להריץ ניתוח — התחברו שוב."); return; }

    setAiBusy((b) => ({ ...b, [id]: true }));
    setMsg("שולח לניתוח AI… (בדרך כלל כדקה)");

    let rejected = false;

    // התוצאה נקראת מהמסד בתשאול, אבל דחייה מיידית (401/403/503) לא מגיעה לשם
    // כי ai_status בכלל לא נקבע ל-running — בלי לקרוא את התשובה המסך היה נתקע.
    fetch(`${API_BASE}/api/spec-analyze`, {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ id }),
    })
      .then(async (r) => {
        if (r.ok) return;
        const detail = await r.text().catch(() => "");
        let note = detail.slice(0, 200);
        try { note = JSON.parse(detail).error ?? note; } catch { /* גוף שאינו JSON */ }
        if (r.status === 401) note = "ההתחברות פגה. התחברו שוב ונסו מחדש.";
        if (r.status === 403) note = "אין הרשאת אדמין למשתמש הזה, או שניתוח כבר רץ. " + note;
        rejected = true;
        setAiBusy((b) => ({ ...b, [id]: false }));
        setMsg("הניתוח לא יצא לדרך: " + note);
      })
      .catch(() => { /* נפילת רשת — התשאול עדיין יראה את התוצאה אם הניתוח כן רץ */ });

    // תשאול עד שהניתוח יוצא ממצב running (או עד 3 דקות, כבלם).
    const started = Date.now();
    const poll = window.setInterval(async () => {
      if (!sb) return;
      // הבקשה נדחתה מיד — אין מה לתשאל, וההודעה כבר על המסך.
      if (rejected) { window.clearInterval(poll); return; }
      const { data } = await sb.rpc("more30_spec_list");
      const list = (data ?? []) as Spec[];
      setSpecs(list);
      const row = list.find((x) => x.id === id);
      const timedOut = Date.now() - started > 180_000;
      if (!row || row.ai_status !== "running" || timedOut) {
        window.clearInterval(poll);
        setAiBusy((b) => ({ ...b, [id]: false }));
        if (row?.ai_status === "done") setMsg("הניתוח הושלם ✅");
        else if (row?.ai_status === "error") setMsg("הניתוח נכשל: " + (row.ai_error ?? "לא ידוע"));
        else if (timedOut) setMsg("הניתוח מתמשך — רעננו את הדף כדי לבדוק שוב.");
      }
    }, 4000);
  }

  useEffect(() => { if (!sb) return; loadSystems();
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => { setSession(s); if (s) { loadIdeas(); loadSpecs(); } });
    return () => sub.subscription.unsubscribe();
  }, []);
  useEffect(() => { if (view === "ideas" && session) loadIdeas(); }, [view, session]);
  useEffect(() => { if (view === "specs" && session) loadSpecs(); }, [view, session]);

  /**
   * הניהול מוגש מ-more30.com/nihul. בלי emailRedirectTo קישור ההתחברות חוזר
   * ל-Site URL של פרויקט Supabase (‎*.vercel.app‎ — שנטפרי חוסמת), ואז הסשן
   * נוצר בכתובת אחרת ולא כאן; מכאן ה-401 בלחיצה על "שלח לניתוח AI".
   * החזרה לכתובת הנוכחית מייצרת את הסשן במקום שבו הוא באמת נדרש.
   */
  async function signIn() {
    if (!sb || !email) return;
    const back = typeof window !== "undefined"
      ? window.location.origin + window.location.pathname
      : undefined;
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: back } });
    setMsg(error ? "שגיאה: " + error.message : `נשלח קישור התחברות ל-${email}. פתחו אותו באותו דפדפן.`);
  }
  async function signOut() { if (sb) { await sb.auth.signOut(); setSession(null); } }
  async function addTask(num: string) { const t = (draft[num] ?? "").trim(); if (!sb || !t) return;
    const { error } = await sb.rpc("more30_add_task", { p_num: num, p_title: t, p_author: "user" });
    if (error) { setMsg("צריך התחברות אדמין. " + error.message); return; } setDraft({ ...draft, [num]: "" }); loadSystems(); }
  async function toggleTask(t: Task) { if (!sb) return; const next = t.status === "done" ? "todo" : "done";
    const { error } = await sb.rpc("more30_set_task_status", { p_id: t.id, p_status: next }); if (error) { setMsg("צריך התחברות אדמין. " + error.message); return; } loadSystems(); }
  async function toggleDelete(num: string, flag: boolean) { if (!sb) return;
    const { error } = await sb.rpc("more30_set_delete", { p_num: num, p_flag: flag }); if (error) { setMsg("צריך התחברות אדמין. " + error.message); return; } loadSystems(); }
  async function setIdeaStatus(id: string, s: string) { if (!sb) return;
    const { error } = await sb.rpc("more30_intake_set_status", { p_id: id, p_status: s }); if (error) { setMsg(error.message); return; } loadIdeas(); }
  async function convertIdea(id: string) { if (!sb) return; const c = conv[id] ?? { slug: "", dept: "misc", cat: "other" };
    if (!c.slug.trim()) { setMsg("צריך slug לפרויקט החדש."); return; }
    const { data, error } = await sb.rpc("more30_intake_to_project", { p_id: id, p_slug: c.slug.trim(), p_department: c.dept, p_category: c.cat });
    if (error) { setMsg("המרה נכשלה (צריך אדמין): " + error.message); return; }
    setMsg("נוצר פרויקט חדש #" + data); loadIdeas(); loadSystems(); }

  const isAuthed = !!session;
  const merged: Overview[] = useMemo(() => rows.length ? rows : REGISTRY.map((p: ProjectEntry) => ({
    number: p.number, name: p.name, name_he: p.name, path: TOPIC_ROUTES[p.number] ?? null, department: p.department, category: p.category, stage: p.stage, live: p.live,
    is_deployed: !!p.isDeployed, deploy_target: p.deployTarget, live_url: p.liveUrl ?? null, admin_url: p.adminUrl ?? null,
    is_protected: p.protected, to_delete: false, supabase_project: p.supabaseProject ?? null, supabase_schema: p.supabaseSchema,
    note: p.note ?? null, open_bugs: 0, open_tasks: 0, missing_tokens: 0,
  })), [rows]);
  const filtered = merged.filter((r) => (!fDept || r.department === fDept) && (!fStage || r.stage === fStage) && (!fLive || r.live) &&
    (!q || (r.name + r.number + (r.note ?? "")).toLowerCase().includes(q.toLowerCase())));
  const byDept: Record<string, Overview[]> = {}; for (const r of filtered) (byDept[r.department] ??= []).push(r);

  return (
    <main style={{ fontFamily: "Assistant, system-ui, sans-serif", padding: 20, direction: "rtl", background: "#f8fafc", minHeight: "100vh" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>more30 · לוח שליטה</h1>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={() => setView("systems")} style={{ ...tab, ...(view === "systems" ? tabOn : {}) }}>מערכות ({merged.length})</button>
            <button onClick={() => setView("ideas")} style={{ ...tab, ...(view === "ideas" ? tabOn : {}) }}>רעיונות נכנסים{ideas.length ? ` (${ideas.length})` : ""}</button>
            <button onClick={() => setView("specs")} style={{ ...tab, ...(view === "specs" ? tabOn : {}) }}>אפיונים מהשאלון{specs.length ? ` (${specs.length})` : ""}</button>
          </div>
        </div>
        <div style={{ fontSize: 13 }}>
          {isAuthed ? <span>מחובר · <button onClick={signOut} style={btn}>התנתק</button></span>
            : <span><input placeholder="מייל אדמין" value={email} onChange={(e) => setEmail(e.target.value)} style={inp} /><button onClick={signIn} style={btn}>שלח קישור</button></span>}
        </div>
      </header>
      {msg && <div style={{ background: "#fef9c3", border: "1px solid #fde68a", padding: "8px 12px", borderRadius: 8, margin: "10px 0", fontSize: 13 }}>{msg}</div>}

      {view === "systems" ? (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0 16px" }}>
            <select value={fDept} onChange={(e) => setFDept(e.target.value)} style={inp}><option value="">כל המחלקות</option>{DEPT_KEYS.map((d) => <option key={d} value={d}>{DEPARTMENTS[d]}</option>)}</select>
            <select value={fStage} onChange={(e) => setFStage(e.target.value)} style={inp}><option value="">כל השלבים</option>{["live", "beta", "wip", "idea", "protected"].map((s) => <option key={s} value={s}>{s}</option>)}</select>
            <label style={{ fontSize: 13, alignSelf: "center" }}><input type="checkbox" checked={fLive} onChange={(e) => setFLive(e.target.checked)} /> חי בלבד</label>
            <input placeholder="חיפוש…" value={q} onChange={(e) => setQ(e.target.value)} style={{ ...inp, flex: 1, minWidth: 160 }} />
          </div>
          {DEPT_KEYS.map((dep) => ({ dep, list: byDept[dep] ?? [] })).filter((g) => g.list.length).map(({ dep, list }) => (
            <section key={dep} style={{ marginBottom: 22 }}>
              <h2 style={{ fontSize: 18, borderBottom: "2px solid #e2e8f0", paddingBottom: 6 }}>{DEPARTMENTS[dep]} <span style={{ color: "#94a3b8", fontSize: 14 }}>({list.length})</span></h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
                {list.sort((a, b) => a.number.localeCompare(b.number)).map((r) => {
                  const myTasks = tasks.filter((t) => t.project_num === r.number);
                  const myTokens = tokens.filter((t) => t.project_num === r.number);
                  const myBugs = bugs.filter((b) => b.project_num === r.number && b.status !== "closed");
                  return (
                    <div key={r.number} style={{ ...card, opacity: r.is_protected ? 0.7 : 1, borderColor: r.to_delete ? "#fca5a5" : "#e2e8f0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <b>{r.number} · {r.name_he || r.name}{r.is_protected ? " 🔒" : ""}</b><span style={{ fontSize: 11, color: "#94a3b8" }}>{r.category}</span>
                      </div>
                      {r.path && <div style={{ fontSize: 12, marginTop: 2, direction: "ltr", textAlign: "right" }}>
                        {routedOnDomain(r)
                          ? <a href={`https://more30.com/${r.path}`} target="_blank" rel="noreferrer" style={{ color: "#16a34a", fontWeight: 700 }}>● more30.com/{r.path} ↗</a>
                          : <span style={{ color: "#94a3b8" }}>◦ more30.com/{r.path} · בהכנה</span>}
                      </div>}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "6px 0" }}>
                        <Badge on={r.live} label={r.live ? "חי" : "לא חי"} color={r.live ? "#16a34a" : "#94a3b8"} />
                        <Badge on label={r.stage} color="#6366f1" />
                        <Badge on={r.is_deployed} label={r.is_deployed ? "פרוס" : "לא פרוס"} color={r.is_deployed ? "#0891b2" : "#94a3b8"} />
                        {r.deploy_target && r.deploy_target !== "unknown" && <Badge on label={r.deploy_target} color="#334155" />}
                        {r.missing_tokens > 0 && <Badge on label={`${r.missing_tokens} טוקנים`} color="#dc2626" />}
                        {myBugs.length > 0 && <Badge on label={`${myBugs.length} באגים`} color="#ea580c" />}
                      </div>
                      <div style={{ fontSize: 12, color: "#475569" }}>DB: {r.supabase_project ? `${r.supabase_project.slice(0, 8)}… / ${r.supabase_schema ?? "?"}` : "—"}</div>
                      {r.note && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{r.note}</div>}
                      <details style={{ marginTop: 8 }}>
                        <summary style={{ fontSize: 12, cursor: "pointer", fontWeight: 700, color: "#4f46e5" }}>דו״ח מערכת 📋</summary>
                        <div style={{ fontSize: 12, color: "#334155", display: "grid", gap: 5, marginTop: 6, lineHeight: 1.5 }}>
                          {r.what_it_does && <div><b>מה עושה:</b> {r.what_it_does}</div>}
                          {r.functions && <div><b>פונקציות:</b> {r.functions}</div>}
                          {r.fixed_notes && <div style={{ background: "#f0fdf4", padding: "5px 8px", borderRadius: 6 }}><b>🔧 מה תוקן:</b> {r.fixed_notes}</div>}
                          {r.changed_notes && <div style={{ background: "#eff6ff", padding: "5px 8px", borderRadius: 6 }}><b>🔄 מה השתנה:</b> {r.changed_notes}</div>}
                        </div>
                      </details>
                      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                        {r.live_url && <a href={r.live_url} target="_blank" rel="noreferrer" style={linkBtn}>אתר חי ↗</a>}
                        {(() => { if (!r.admin_url) return null; const abs = r.admin_url.startsWith("http"); const href = abs ? r.admin_url : (r.live_url ? r.live_url.replace(/\/$/, "") + r.admin_url : null);
                          return href ? <a href={href} target="_blank" rel="noreferrer" style={linkBtn}>כניסת אדמין ↗</a> : <span style={{ ...linkBtn, opacity: 0.7 }}>אדמין: {r.admin_url}</span>; })()}
                      </div>
                      {myBugs.length > 0 && <details style={{ marginTop: 8 }}><summary style={{ fontSize: 12, color: "#ea580c", cursor: "pointer" }}>באגים ({myBugs.length})</summary>
                        <ul style={{ fontSize: 12, margin: "4px 0", paddingInlineStart: 18 }}>{myBugs.map((b) => <li key={b.id}>{b.title} <em style={{ color: "#94a3b8" }}>({b.severity})</em></li>)}</ul></details>}
                      {myTokens.length > 0 && <details style={{ marginTop: 8 }}><summary style={{ fontSize: 12, color: "#dc2626", cursor: "pointer" }}>מפתחות חסרים ({myTokens.length})</summary>
                        <ul style={{ fontSize: 12, margin: "4px 0", paddingInlineStart: 18 }}>{myTokens.map((t) => <li key={t.id}><code>{t.env_var}</code>{t.obtain_url ? <> · <a href={t.obtain_url} target="_blank" rel="noreferrer">השג</a></> : null}</li>)}</ul></details>}
                      <details style={{ marginTop: 8 }} open={myTasks.length > 0}>
                        <summary style={{ fontSize: 12, cursor: "pointer" }}>משימות ({myTasks.filter((t) => t.status !== "done").length})</summary>
                        <ul style={{ listStyle: "none", padding: 0, margin: "6px 0" }}>{myTasks.map((t) => (
                          <li key={t.id} style={{ fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}>
                            <input type="checkbox" checked={t.status === "done"} onChange={() => toggleTask(t)} />
                            <span style={{ textDecoration: t.status === "done" ? "line-through" : "none" }}>{t.title} <em style={{ color: "#94a3b8" }}>({t.author})</em></span>
                          </li>))}</ul>
                        {!r.is_protected && <div style={{ display: "flex", gap: 4 }}>
                          <input placeholder="משימה חדשה…" value={draft[r.number] ?? ""} onChange={(e) => setDraft({ ...draft, [r.number]: e.target.value })} style={{ ...inp, flex: 1, fontSize: 12 }} />
                          <button onClick={() => addTask(r.number)} style={btn}>＋</button></div>}
                      </details>
                      {!r.is_protected && <label style={{ fontSize: 12, color: "#dc2626", display: "block", marginTop: 8 }}>
                        <input type="checkbox" checked={r.to_delete} onChange={(e) => toggleDelete(r.number, e.target.checked)} /> סמן למחיקה</label>}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </>
      ) : view === "ideas" ? (
        <section>
          {!isAuthed && <div style={{ ...card, textAlign: "center" }}>🔒 רעיונות נכנסים מכילים מידע אישי — יש להתחבר כאדמין כדי לצפות.</div>}
          {ideas.map((i) => {
            const c = conv[i.id] ?? { slug: "", dept: "misc", cat: "other" };
            return (
              <div key={i.id} style={{ ...card, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <b>{i.project_name || "(ללא שם פרויקט)"} — {i.full_name}</b>
                  <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {IDEA_STATUS.map((s) => <button key={s} onClick={() => setIdeaStatus(i.id, s)}
                      style={{ ...pillBtn, background: i.status === s ? "#4f46e5" : "#f1f5f9", color: i.status === s ? "#fff" : "#334155" }}>{IDEA_STATUS_HE[s]}</button>)}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{new Date(i.created_at).toLocaleDateString("he-IL")} · {i.phone} · {i.email} · {i.city}</div>
                <div style={{ fontSize: 13, marginTop: 8, display: "grid", gap: 4 }}>
                  {i.short_description && <div><b>תיאור:</b> {i.short_description}</div>}
                  {i.problem && <div><b>בעיה:</b> {i.problem}</div>}
                  {i.solution && <div><b>פתרון:</b> {i.solution}</div>}
                  {i.target_customer && <div><b>קהל:</b> {i.target_customer}</div>}
                  {i.revenue_model && <div><b>מודל הכנסה:</b> {i.revenue_model}</div>}
                  {i.differentiation && <div><b>בידול:</b> {i.differentiation}</div>}
                  {i.funding_needed && <div><b>גיוס דרוש:</b> {i.funding_needed} · <b>לו״ז:</b> {i.launch_timeline}</div>}
                  {i.services_wanted?.length ? <div><b>שירותים:</b> {i.services_wanted.join(", ")}</div> : null}
                  {i.dream_free_text && <div><b>החלום:</b> {i.dream_free_text}</div>}
                </div>
                {i.converted_project_num
                  ? <div style={{ marginTop: 8, color: "#16a34a", fontSize: 13 }}>✅ הומר לפרויקט #{i.converted_project_num}</div>
                  : <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <input placeholder="slug לפרויקט" value={c.slug} onChange={(e) => setConv({ ...conv, [i.id]: { ...c, slug: e.target.value } })} style={{ ...inp, fontSize: 12 }} />
                      <select value={c.dept} onChange={(e) => setConv({ ...conv, [i.id]: { ...c, dept: e.target.value } })} style={{ ...inp, fontSize: 12 }}>{DEPT_KEYS.map((d) => <option key={d} value={d}>{DEPARTMENTS[d]}</option>)}</select>
                      <button onClick={() => convertIdea(i.id)} style={{ ...btn, background: "#4f46e5", color: "#fff", border: "none" }}>הפוך לפרויקט →</button>
                    </div>}
              </div>
            );
          })}
          {isAuthed && ideas.length === 0 && <div style={{ ...card, textAlign: "center", color: "#64748b" }}>אין רעיונות נכנסים עדיין.</div>}
        </section>
      ) : (
        <section>
          {!isAuthed && <div style={{ ...card, textAlign: "center" }}>🔒 אפיונים מכילים מידע אישי — יש להתחבר כאדמין כדי לצפות.</div>}
          {specs.map((sp) => {
            const busy = !!aiBusy[sp.id] || sp.ai_status === "running";
            return (
              <div key={sp.id} style={{ ...card, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <b>{sp.project_name || "(ללא שם פרויקט)"} — {sp.full_name}</b>
                  <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {SPEC_STATUS.map((s) => <button key={s} onClick={() => setSpecStatus(sp.id, s)}
                      style={{ ...pillBtn, background: sp.status === s ? "#4f46e5" : "#f1f5f9", color: sp.status === s ? "#fff" : "#334155" }}>{SPEC_STATUS_HE[s]}</button>)}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  {new Date(sp.created_at).toLocaleString("he-IL")}
                  {sp.track ? ` · מסלול: ${sp.track}` : ""}
                  {sp.phone ? ` · ${sp.phone}` : ""}{sp.email ? ` · ${sp.email}` : ""}{sp.city ? ` · ${sp.city}` : ""}
                </div>
                {sp.services_wanted?.length ? <div style={{ fontSize: 13, marginTop: 6 }}><b>שירותים:</b> {sp.services_wanted.join(", ")}</div> : null}

                {/* התשובות מוצגות עם נוסח השאלה שהוצג בפועל — השאלון דינמי. */}
                <details style={{ marginTop: 8 }} open>
                  <summary style={{ fontSize: 12, cursor: "pointer", fontWeight: 700, color: "#4f46e5" }}>
                    התשובות ({sp.questions?.length ?? 0})
                  </summary>
                  <div style={{ fontSize: 13, marginTop: 6, display: "grid", gap: 4 }}>
                    {(sp.questions ?? []).map((q) => {
                      const v = sp.answers?.[q.key];
                      if (v === undefined || v === null || (Array.isArray(v) ? !v.length : !String(v).trim())) return null;
                      return <div key={q.key}><b>{q.label}:</b> {Array.isArray(v) ? v.join(", ") : String(v)}</div>;
                    })}
                  </div>
                </details>

                <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <button onClick={() => analyzeSpec(sp.id)} disabled={busy || !isAuthed}
                    style={{ ...btn, background: busy ? "#c7d2fe" : "#4f46e5", color: "#fff", border: "none", cursor: busy ? "wait" : "pointer", fontWeight: 700 }}>
                    {busy ? "מנתח…" : sp.ai_analysis ? "🤖 נתח מחדש" : "🤖 שלח לניתוח AI"}
                  </button>
                  <span style={{ fontSize: 12, color: sp.ai_status === "error" ? "#dc2626" : "#64748b" }}>
                    {sp.ai_status === "done" && sp.ai_completed_at ? `נותח ${new Date(sp.ai_completed_at).toLocaleString("he-IL")}${sp.ai_model ? ` · ${sp.ai_model}` : ""}` : null}
                    {sp.ai_status === "pending" ? "עוד לא נותח" : null}
                    {sp.ai_status === "running" ? "ניתוח בעיבוד…" : null}
                    {sp.ai_status === "error" ? `שגיאה: ${sp.ai_error ?? "לא ידוע"}` : null}
                  </span>
                </div>

                {sp.ai_analysis && (
                  <div style={{ marginTop: 10, background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#5b21b6", marginBottom: 6 }}>🤖 ניתוח AI</div>
                    <div style={{ fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 1.6, color: "#1e1b4b" }}>{sp.ai_analysis}</div>
                  </div>
                )}
              </div>
            );
          })}
          {isAuthed && specs.length === 0 && <div style={{ ...card, textAlign: "center", color: "#64748b" }}>אין אפיונים עדיין. השאלון חי ב-more30.com (מקטע "שאלון האפיון החכם").</div>}
        </section>
      )}
    </main>
  );
}

function Badge({ on, label, color }: { on: boolean; label: string; color: string }) {
  return <span style={{ ...badge, background: on ? color + "22" : "#f1f5f9", color: on ? color : "#94a3b8" }}>{label}</span>;
}
const card: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" };
const badge: React.CSSProperties = { fontSize: 11, padding: "2px 8px", borderRadius: 999, fontWeight: 600 };
const btn: React.CSSProperties = { border: "1px solid #cbd5e1", background: "#fff", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 13 };
const pillBtn: React.CSSProperties = { border: "none", borderRadius: 999, padding: "3px 10px", cursor: "pointer", fontSize: 12 };
const linkBtn: React.CSSProperties = { border: "1px solid #cbd5e1", background: "#f8fafc", borderRadius: 8, padding: "4px 10px", fontSize: 12, textDecoration: "none", color: "#0f172a" };
const inp: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 8, padding: "5px 10px", fontSize: 13 };
const tab: React.CSSProperties = { border: "1px solid #cbd5e1", background: "#fff", borderRadius: 8, padding: "5px 14px", cursor: "pointer", fontSize: 14 };
const tabOn: React.CSSProperties = { background: "#4f46e5", color: "#fff", borderColor: "#4f46e5" };
