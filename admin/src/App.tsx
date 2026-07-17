import { useCallback, useEffect, useMemo, useState } from "react";
import { REGISTRY, type ProjectEntry } from "@more30/config";
import {
  createCoreClient,
  listProjectOverview,
  listBugs,
  listTasks,
  createBug,
  createTask,
  setBugStatus,
  setTaskStatus,
  produceFixFromBug,
  BUG_SEVERITIES,
  type ProjectOverviewRow,
  type BugRow,
  type TaskRow,
  type BugStatus,
  type TaskStatus,
  type BugSeverity,
} from "@more30/db";
import { getSessionUser, isPlatformAdmin, signInWithEmail, signOut, type SessionUser } from "@more30/auth";
import { styles as s, tokens } from "./styles.js";

/**
 * more30 · central admin console.
 *
 * One system to manage them all: it maps bugs, tracks tasks, and produces fixes
 * across every registered system — over the SAME Supabase `core` schema, no new
 * connections. The build-time REGISTRY (@more30/config) is the always-available
 * fallback; live bug/task data overlays it when the `core` schema is reachable
 * and the user is authenticated. Writes require a super admin (enforced by RLS).
 */

const SEV_COLOR: Record<BugSeverity, string> = {
  low: tokens.color.muted,
  medium: tokens.color.warning,
  high: "#ea580c",
  critical: tokens.color.danger,
};

const NEXT_BUG: Record<BugStatus, BugStatus> = { open: "in_progress", in_progress: "closed", closed: "open" };
const NEXT_TASK: Record<TaskStatus, TaskStatus> = { todo: "doing", doing: "done", done: "todo" };

export function App() {
  const client = useMemo(() => createCoreClient(), []);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [overview, setOverview] = useState<Record<string, ProjectOverviewRow>>({});
  const [liveError, setLiveError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const refreshAuth = useCallback(async () => {
    try {
      setUser(await getSessionUser(client));
    } catch {
      setUser(null);
    } finally {
      setCheckedAuth(true);
    }
  }, [client]);

  const refreshOverview = useCallback(async () => {
    try {
      const rows = await listProjectOverview(client);
      const map: Record<string, ProjectOverviewRow> = {};
      for (const r of rows) map[r.number] = r;
      setOverview(map);
      setLiveError(null);
    } catch (e) {
      setLiveError(e instanceof Error ? e.message : String(e));
      setOverview({});
    }
  }, [client]);

  useEffect(() => {
    void refreshAuth();
  }, [refreshAuth]);

  useEffect(() => {
    if (user) void refreshOverview();
  }, [user, refreshOverview]);

  const canWrite = isPlatformAdmin(user);

  return (
    <main style={s.page}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={s.h1}>more30 · אדמין מרכזי</h1>
          <p style={s.muted}>
            מערכת ניהול אחת לכל המערכות — מיפוי באגים, ניהול משימות, ויצירת תיקונים. מקור אמת:{" "}
            <code>core.projects</code> (אותו Supabase, ללא חיבורים חדשים).
          </p>
        </div>
        {user && (
          <div style={{ textAlign: "left" }}>
            <div style={s.muted}>{user.email}</div>
            <button
              style={s.btnGhost}
              onClick={async () => {
                await signOut(client);
                setUser(null);
                setSelected(null);
              }}
            >
              יציאה
            </button>
          </div>
        )}
      </header>

      {!checkedAuth && <p style={s.muted}>טוען…</p>}

      {checkedAuth && !user && <SignIn client={client} onSignedIn={refreshAuth} />}

      {user && (
        <>
          {liveError && (
            <div style={s.banner}>
              ⚠️ אין כרגע נתונים חיים מ‑<code>core</code> ({liveError}). מוצג הרישום הסטטי מ‑
              <code>@more30/config</code>. ודא שהסכימה <code>core</code> נחשפה ב‑API Settings ושה‑seed הורץ.
            </div>
          )}
          {!canWrite && (
            <div style={s.banner}>
              המשתמש מחובר אך אינו <b>super admin</b> — צפייה בלבד. פעולות כתיבה חסומות ב‑RLS.
            </div>
          )}

          <RegistryTable overview={overview} selected={selected} onSelect={setSelected} />

          {selected && (
            <ProjectDetail
              key={selected}
              client={client}
              project={REGISTRY.find((p) => p.number === selected)!}
              canWrite={canWrite}
              onChanged={refreshOverview}
            />
          )}
        </>
      )}
    </main>
  );
}

function SignIn({ client, onSignedIn }: { client: ReturnType<typeof createCoreClient>; onSignedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      style={{ ...s.card, marginTop: tokens.space.lg }}
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        setBusy(true);
        try {
          const { error } = await signInWithEmail(client, email, password);
          if (error) throw error;
          onSignedIn();
        } catch (e2) {
          setErr(e2 instanceof Error ? e2.message : String(e2));
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 style={{ marginTop: 0, fontSize: 18 }}>כניסת מנהל</h2>
      <p style={s.muted}>התחבר עם משתמש ה‑Supabase שלך (super admin לפעולות כתיבה).</p>
      <label style={s.muted}>
        אימייל
        <input style={s.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
      </label>
      <label style={{ ...s.muted, display: "block", marginTop: 12 }}>
        סיסמה
        <input style={s.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
      </label>
      {err && <div style={s.error}>{err}</div>}
      <button style={{ ...s.btn, marginTop: 16 }} type="submit" disabled={busy}>
        {busy ? "מתחבר…" : "כניסה"}
      </button>
    </form>
  );
}

function RegistryTable({
  overview,
  selected,
  onSelect,
}: {
  overview: Record<string, ProjectOverviewRow>;
  selected: string | null;
  onSelect: (n: string) => void;
}) {
  return (
    <table style={s.table}>
      <thead>
        <tr>
          {["מס'", "מערכת", "קטגוריה", "שלב", "חי", "באגים פתוחים", "משימות פתוחות", "פריסה"].map((h) => (
            <th key={h} style={s.th}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {REGISTRY.map((p: ProjectEntry) => {
          const l = overview[p.number];
          const isSel = selected === p.number;
          return (
            <tr
              key={p.number}
              onClick={() => onSelect(p.number)}
              style={{
                ...s.rowBtn,
                opacity: p.protected ? 0.55 : 1,
                background: isSel ? "#eff6ff" : undefined,
              }}
              title={p.protected ? "מוגן — צפייה בלבד" : "לחץ לניהול"}
            >
              <td style={s.td}>{p.number}</td>
              <td style={s.td}>{p.name}{p.protected ? " 🔒" : ""}</td>
              <td style={s.td}>{p.category}</td>
              <td style={s.td}>{l?.stage ?? p.stage}</td>
              <td style={s.td}>{(l?.live ?? p.live) ? "✅" : "—"}</td>
              <td style={s.td}>{l?.open_bugs ?? "—"}</td>
              <td style={s.td}>{l?.open_tasks ?? "—"}</td>
              <td style={s.td}>{p.deployTarget}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ProjectDetail({
  client,
  project,
  canWrite,
  onChanged,
}: {
  client: ReturnType<typeof createCoreClient>;
  project: ProjectEntry;
  canWrite: boolean;
  onChanged: () => void;
}) {
  const [bugs, setBugs] = useState<BugRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [b, t] = await Promise.all([listBugs(client, project.number), listTasks(client, project.number)]);
      setBugs(b);
      setTasks(t);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, [client, project.number]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const guard = async (fn: () => Promise<unknown>) => {
    setErr(null);
    try {
      await fn();
      await reload();
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <section style={s.panel}>
      <h2 style={{ marginTop: 0 }}>
        #{project.number} · {project.name} {project.protected && "🔒"}
      </h2>
      {project.note && <p style={s.muted}>{project.note}</p>}
      {err && <div style={s.error}>{err}</div>}
      {project.protected && <div style={s.banner}>מערכת מוגנת — לא מבצעים בה שינויים.</div>}

      <div style={s.grid2}>
        <div>
          <h3>באגים</h3>
          {canWrite && !project.protected && (
            <AddBug onAdd={(title, sev) => guard(() => createBug(client, { project_num: project.number, title, severity: sev }))} />
          )}
          {bugs.length === 0 && <p style={s.muted}>אין באגים.</p>}
          {bugs.map((b) => (
            <div key={b.id} style={s.itemRow}>
              <span>
                <span style={{ ...s.chip, borderColor: SEV_COLOR[b.severity], color: SEV_COLOR[b.severity] }}>{b.severity}</span>{" "}
                {b.title}
              </span>
              <span style={{ display: "flex", gap: 6 }}>
                <span style={s.chip}>{b.status}</span>
                {canWrite && !project.protected && (
                  <>
                    <button style={s.btnGhost} onClick={() => guard(() => setBugStatus(client, b.id, NEXT_BUG[b.status]))}>
                      ← {NEXT_BUG[b.status]}
                    </button>
                    {b.status !== "closed" && (
                      <button
                        style={s.btnGhost}
                        title="צור משימת תיקון והעבר את הבאג ל‑in_progress"
                        onClick={() => guard(() => produceFixFromBug(client, b))}
                      >
                        צור תיקון
                      </button>
                    )}
                  </>
                )}
              </span>
            </div>
          ))}
        </div>

        <div>
          <h3>משימות</h3>
          {canWrite && !project.protected && (
            <AddTask onAdd={(title) => guard(() => createTask(client, { project_num: project.number, title }))} />
          )}
          {tasks.length === 0 && <p style={s.muted}>אין משימות.</p>}
          {tasks.map((t) => (
            <div key={t.id} style={s.itemRow}>
              <span>{t.title}</span>
              <span style={{ display: "flex", gap: 6 }}>
                <span style={s.chip}>{t.status}</span>
                {canWrite && !project.protected && (
                  <button style={s.btnGhost} onClick={() => guard(() => setTaskStatus(client, t.id, NEXT_TASK[t.status]))}>
                    ← {NEXT_TASK[t.status]}
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AddBug({ onAdd }: { onAdd: (title: string, sev: BugSeverity) => void }) {
  const [title, setTitle] = useState("");
  const [sev, setSev] = useState<BugSeverity>("medium");
  return (
    <form
      style={{ display: "flex", gap: 6, marginBottom: 10 }}
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onAdd(title.trim(), sev);
        setTitle("");
      }}
    >
      <input style={{ ...s.input, marginTop: 0 }} placeholder="באג חדש…" value={title} onChange={(e) => setTitle(e.target.value)} />
      <select style={{ ...s.input, marginTop: 0, width: "auto" }} value={sev} onChange={(e) => setSev(e.target.value as BugSeverity)}>
        {BUG_SEVERITIES.map((x) => (
          <option key={x} value={x}>{x}</option>
        ))}
      </select>
      <button style={s.btn} type="submit">הוסף</button>
    </form>
  );
}

function AddTask({ onAdd }: { onAdd: (title: string) => void }) {
  const [title, setTitle] = useState("");
  return (
    <form
      style={{ display: "flex", gap: 6, marginBottom: 10 }}
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onAdd(title.trim());
        setTitle("");
      }}
    >
      <input style={{ ...s.input, marginTop: 0 }} placeholder="משימה חדשה…" value={title} onChange={(e) => setTitle(e.target.value)} />
      <button style={s.btn} type="submit">הוסף</button>
    </form>
  );
}
