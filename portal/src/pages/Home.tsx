import { useMemo, useState } from "react";
import { REGISTRY, activeProjects, basePathFor, type Category, type ProjectEntry } from "@more30/config";
import { styles as s } from "../styles.js";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "../labels.js";

/**
 * Portal home — every system by category, with search + category filter. Source
 * of truth is the build-time REGISTRY (always available; no auth needed).
 * Protected systems are listed but not linked into the unified routing.
 */
export function Home({ navigate }: { navigate: (to: string) => void }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "all">("all");

  const all = activeProjects();
  const liveCount = REGISTRY.filter((p) => p.live).length;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all.filter((p) => {
      if (cat !== "all" && p.category !== cat) return false;
      if (!needle) return true;
      return (
        p.name.toLowerCase().includes(needle) ||
        p.slug.toLowerCase().includes(needle) ||
        p.number.includes(needle)
      );
    });
  }, [all, q, cat]);

  const byCat = new Map<Category, ProjectEntry[]>();
  for (const p of filtered) {
    const arr = byCat.get(p.category) ?? [];
    arr.push(p);
    byCat.set(p.category, arr);
  }

  const presentCats = CATEGORY_ORDER.filter((c) => byCat.has(c));

  const open = (e: React.MouseEvent, slug: string) => {
    e.preventDefault();
    navigate(basePathFor(slug));
  };

  return (
    <>
      <header>
        <h1 style={s.brand}>more30</h1>
        <p style={s.tagline}>פורטל מאוחד — כל המערכות במקום אחד.</p>
        <div style={s.summaryRow}>
          <span style={s.stat}>{REGISTRY.length} מערכות רשומות</span>
          <span style={s.stat}>{liveCount} חיות</span>
          <span style={s.stat}>{REGISTRY.length - liveCount} בפיתוח</span>
        </div>
      </header>

      <div style={s.controls}>
        <input
          style={s.search}
          placeholder="חיפוש לפי שם / מספר…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="חיפוש מערכת"
        />
        <button style={cat === "all" ? s.chipActive : s.chip} onClick={() => setCat("all")}>הכל</button>
        {CATEGORY_ORDER.map((c) => (
          <button key={c} style={cat === c ? s.chipActive : s.chip} onClick={() => setCat(c)}>
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {filtered.length === 0 && <p style={s.tagline}>לא נמצאו מערכות תואמות.</p>}

      {presentCats.map((c) => (
        <section key={c}>
          <h2 style={s.sectionH}>{CATEGORY_LABELS[c]}</h2>
          <div style={s.grid}>
            {byCat.get(c)!.map((p) => (
              <a
                key={p.number}
                href={basePathFor(p.slug)}
                onClick={(e) => open(e, p.slug)}
                style={s.card}
                className="m30-card"
              >
                <div style={s.cardNum}>#{p.number}</div>
                <div style={s.cardName}>{p.name}</div>
                <div style={p.live ? s.live : s.wip}>{p.live ? "● חי" : "● בפיתוח"}</div>
              </a>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
