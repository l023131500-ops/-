import { REGISTRY } from "@more30/config";
import { styles as s } from "../styles.js";
import { CATEGORY_LABELS, STAGE_LABELS } from "../labels.js";
import type { Category } from "@more30/config";

/**
 * A single system's page — its own address (/NN). Shows the registry metadata
 * (public, already in the repo): category, stage, live status, Supabase project
 * + schema, deploy target, and notes. This is the seed of "each system is its
 * own site"; richer per-system content lands here once hosting is decided.
 */
export function System({ slug, navigate }: { slug: string; navigate: (to: string) => void }) {
  const p = REGISTRY.find((x) => x.slug === slug);

  const back = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate("/");
  };

  if (!p) {
    return (
      <>
        <button style={s.backLink} onClick={back}>← חזרה לפורטל</button>
        <div style={s.detailCard}>
          <h1>מערכת לא נמצאה</h1>
          <p style={s.kvKey}>אין ברישום מערכת בשם <code>{slug}</code>.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <button style={s.backLink} onClick={back}>← חזרה לפורטל</button>
      <div style={s.detailCard}>
        <div style={s.cardNum}>#{p.number} · {p.repo}</div>
        <h1 style={{ margin: "4px 0 0" }}>{p.name} {p.protected && "🔒"}</h1>
        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={s.badge}>{CATEGORY_LABELS[p.category as Category]}</span>
          <span style={s.badge}>{STAGE_LABELS[p.stage] ?? p.stage}</span>
          <span style={{ ...s.badge, color: p.live ? "#16a34a" : "#d97706" }}>{p.live ? "● חי" : "● בפיתוח"}</span>
        </div>

        <div style={s.kv}>
          <span style={s.kvKey}>מספר</span><span>{p.number}</span>
          <span style={s.kvKey}>כתובת (basePath)</span><span><code>/{p.number}</code></span>
          <span style={s.kvKey}>מאגר</span><span><code>l023131500-ops/{p.repo}</code></span>
          <span style={s.kvKey}>קטגוריה</span><span>{CATEGORY_LABELS[p.category as Category]}</span>
          <span style={s.kvKey}>שלב</span><span>{STAGE_LABELS[p.stage] ?? p.stage}</span>
          <span style={s.kvKey}>Supabase project</span><span>{p.supabaseProject ? <code>{p.supabaseProject}</code> : "— (לא אומת)"}</span>
          <span style={s.kvKey}>Supabase schema</span><span>{p.supabaseSchema ? <code>{p.supabaseSchema}</code> : "— (לא אומת)"}</span>
          <span style={s.kvKey}>פריסה</span><span>{p.deployTarget}</span>
          <span style={s.kvKey}>מוגן</span><span>{p.protected ? "כן — לא נוגעים" : "לא"}</span>
        </div>

        {p.note && <div style={s.note}>{p.note}</div>}
        {p.protected && <div style={s.note}>🔒 מערכת מוגנת — הפורטל מציג מידע בלבד ואינו נוגע בה.</div>}
      </div>
    </>
  );
}
