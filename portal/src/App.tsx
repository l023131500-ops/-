import { REGISTRY, activeProjects, basePathFor, type Category, type ProjectEntry } from "@more30/config";

/**
 * more30 portal — lists every system by category with links.
 *
 * Source of truth is the registry (mirrors core.projects). Protected systems are
 * shown but not linked into the unified routing. Links use the basePath
 * convention more30.com/<NN>/.
 */
const CATEGORY_LABELS: Record<Category, string> = {
  hub: "מרכז (HUB)",
  transcription: "תמלול",
  advertising: "פרסום ומודעות",
  torah: "תורני",
  finance: "פיננסי",
  health: "קופות חולים ובריאות",
  commerce: "מסחר",
  rights: "זכויות",
  marketing: "שיווק ועיצוב",
  realestate: "נדל\"ן",
  events: "אירועים ושמחות",
  crm: "CRM",
  other: "נוסף",
};

const CATEGORY_ORDER: Category[] = [
  "hub", "transcription", "health", "torah", "advertising",
  "finance", "commerce", "rights", "realestate", "events", "marketing", "crm", "other",
];

export function App() {
  const byCat = new Map<Category, ProjectEntry[]>();
  for (const p of activeProjects()) {
    const arr = byCat.get(p.category) ?? [];
    arr.push(p);
    byCat.set(p.category, arr);
  }

  return (
    <main style={{ fontFamily: "Assistant, system-ui, sans-serif", padding: 24, direction: "rtl", maxWidth: 1100, margin: "0 auto" }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>more30</h1>
        <p style={{ color: "#64748b" }}>פורטל מאוחד — כל המערכות במקום אחד. {REGISTRY.length} מערכות רשומות.</p>
      </header>

      {CATEGORY_ORDER.filter((c) => byCat.has(c)).map((cat) => (
        <section key={cat} style={{ marginBottom: 28 }}>
          <h2 style={{ borderBottom: "2px solid #e2e8f0", paddingBottom: 6 }}>{CATEGORY_LABELS[cat]}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            {byCat.get(cat)!.map((p) => (
              <a key={p.number} href={basePathFor(p.slug)} style={card}>
                <div style={{ fontSize: 12, color: "#64748b" }}>#{p.number}</div>
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>
                  {p.live ? <span style={{ color: "#16a34a" }}>● חי</span> : <span style={{ color: "#d97706" }}>● בפיתוח</span>}
                </div>
              </a>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}

const card: React.CSSProperties = {
  display: "block",
  padding: 14,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  textDecoration: "none",
  color: "#0f172a",
  background: "#fff",
};
