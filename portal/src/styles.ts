import { tokens } from "@more30/ui";
import type { CSSProperties } from "react";

/** Portal styles from the shared @more30/ui tokens (RTL, Hebrew). */
const t = tokens;

export const styles: Record<string, CSSProperties> = {
  page: {
    fontFamily: t.font.sans,
    color: t.color.fg,
    background: t.color.bg,
    direction: t.dir,
    minHeight: "100vh",
    padding: t.space.lg,
    maxWidth: 1100,
    margin: "0 auto",
  },
  brand: { margin: 0, fontSize: 30, letterSpacing: "-0.02em" },
  tagline: { color: t.color.muted, marginTop: 4 },
  summaryRow: { display: "flex", gap: t.space.md, flexWrap: "wrap", marginTop: t.space.md },
  stat: {
    padding: "10px 14px",
    borderRadius: t.radius.md,
    border: `1px solid ${t.color.border}`,
    background: "#f8fafc",
    fontSize: 13,
  },
  controls: { display: "flex", gap: t.space.sm, flexWrap: "wrap", alignItems: "center", margin: `${t.space.lg} 0` },
  search: {
    flex: "1 1 240px",
    padding: "10px 14px",
    borderRadius: t.radius.full,
    border: `1px solid ${t.color.border}`,
    fontFamily: t.font.sans,
    fontSize: 14,
  },
  chip: {
    padding: "6px 12px",
    borderRadius: t.radius.full,
    border: `1px solid ${t.color.border}`,
    background: "#fff",
    fontSize: 13,
    cursor: "pointer",
    color: t.color.fg,
  },
  chipActive: {
    padding: "6px 12px",
    borderRadius: t.radius.full,
    border: `1px solid ${t.color.primary}`,
    background: t.color.primary,
    color: t.color.primaryFg,
    fontSize: 13,
    cursor: "pointer",
  },
  sectionH: { borderBottom: `2px solid ${t.color.border}`, paddingBottom: 6, marginTop: t.space.xl, fontSize: 18 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: t.space.md, marginTop: t.space.md },
  card: {
    display: "block",
    padding: t.space.md,
    borderRadius: t.radius.md,
    border: `1px solid ${t.color.border}`,
    textDecoration: "none",
    color: t.color.fg,
    background: "#fff",
  },
  cardNum: { fontSize: 12, color: t.color.muted },
  cardName: { fontWeight: 600, marginTop: 2 },
  live: { color: t.color.success, fontSize: 12, marginTop: 8 },
  wip: { color: t.color.warning, fontSize: 12, marginTop: 8 },
  backLink: { color: t.color.primary, textDecoration: "none", fontSize: 14, cursor: "pointer", background: "none", border: "none", padding: 0, fontFamily: t.font.sans },
  detailCard: {
    marginTop: t.space.lg,
    padding: t.space.xl,
    borderRadius: t.radius.lg,
    border: `1px solid ${t.color.border}`,
    background: "#fff",
  },
  kv: { display: "grid", gridTemplateColumns: "160px 1fr", gap: "8px 16px", marginTop: t.space.lg, fontSize: 14 },
  kvKey: { color: t.color.muted },
  badge: { display: "inline-block", fontSize: 12, padding: "2px 10px", borderRadius: t.radius.full, border: `1px solid ${t.color.border}` },
  note: { marginTop: t.space.lg, padding: t.space.md, borderRadius: t.radius.md, background: "#f8fafc", border: `1px solid ${t.color.border}`, fontSize: 13, color: t.color.muted },
};

export { tokens };
