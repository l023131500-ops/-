import { useEffect, useState } from "react";
import { REGISTRY, type ProjectEntry } from "@more30/config";
import { createCoreClient } from "@more30/db";

/**
 * more30 admin — reads the project registry.
 *
 * Static fallback: the build-time REGISTRY from @more30/config (always works).
 * Live overlay: open bug/task counts from `core.project_overview` when Supabase
 * env vars are present. If the core schema is not applied yet, the static view
 * still renders.
 */
interface LiveCounts {
  number: string;
  open_bugs: number;
  open_tasks: number;
  live: boolean;
  stage: string;
}

export function App() {
  const [live, setLive] = useState<Record<string, LiveCounts>>({});
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createCoreClient();
        const { data, error } = await supabase
          .from("project_overview")
          .select("number, open_bugs, open_tasks, live, stage");
        if (error) throw error;
        const map: Record<string, LiveCounts> = {};
        for (const row of (data ?? []) as LiveCounts[]) map[row.number] = row;
        setLive(map);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  return (
    <main style={{ fontFamily: "Assistant, system-ui, sans-serif", padding: 24, direction: "rtl" }}>
      <h1>more30 · אדמין מרכזי</h1>
      <p style={{ color: "#64748b" }}>
        מרשם הפרויקטים (core.projects). {err ? `מצב סטטי (ללא חיבור חי): ${err}` : "כולל נתונים חיים מ-core."}
      </p>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            {["מס'", "מערכת", "קטגוריה", "שלב", "חי", "באגים", "משימות", "פריסה"].map((h) => (
              <th key={h} style={th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {REGISTRY.map((p: ProjectEntry) => {
            const l = live[p.number];
            return (
              <tr key={p.number} style={{ opacity: p.protected ? 0.55 : 1 }}>
                <td style={td}>{p.number}</td>
                <td style={td}>{p.name}{p.protected ? " 🔒" : ""}</td>
                <td style={td}>{p.category}</td>
                <td style={td}>{l?.stage ?? p.stage}</td>
                <td style={td}>{(l?.live ?? p.live) ? "✅" : "—"}</td>
                <td style={td}>{l?.open_bugs ?? (p.note?.toLowerCase().includes("bug") ? "?" : 0)}</td>
                <td style={td}>{l?.open_tasks ?? 0}</td>
                <td style={td}>{p.deployTarget}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}

const th: React.CSSProperties = { textAlign: "right", borderBottom: "2px solid #e2e8f0", padding: "8px 10px", fontSize: 14 };
const td: React.CSSProperties = { borderBottom: "1px solid #e2e8f0", padding: "8px 10px", fontSize: 14 };
