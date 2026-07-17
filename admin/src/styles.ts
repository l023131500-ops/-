import { tokens } from "@more30/ui";
import type { CSSProperties } from "react";

/** Admin console styles, derived from the shared @more30/ui tokens (RTL, Hebrew). */
const t = tokens;

export const styles: Record<string, CSSProperties> = {
  page: {
    fontFamily: t.font.sans,
    color: t.color.fg,
    background: t.color.bg,
    direction: t.dir,
    minHeight: "100vh",
    padding: t.space.lg,
    maxWidth: 1200,
    margin: "0 auto",
  },
  h1: { margin: 0, fontSize: 24 },
  muted: { color: t.color.muted, fontSize: 14 },
  banner: {
    marginTop: t.space.md,
    padding: t.space.md,
    borderRadius: t.radius.md,
    border: `1px solid ${t.color.border}`,
    background: "#f8fafc",
    fontSize: 13,
    color: t.color.muted,
  },
  card: {
    padding: t.space.lg,
    borderRadius: t.radius.lg,
    border: `1px solid ${t.color.border}`,
    background: "#fff",
    maxWidth: 420,
  },
  input: {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    marginTop: 6,
    borderRadius: t.radius.sm,
    border: `1px solid ${t.color.border}`,
    fontFamily: t.font.sans,
    fontSize: 14,
  },
  btn: {
    padding: "9px 16px",
    borderRadius: t.radius.sm,
    border: "none",
    background: t.color.primary,
    color: t.color.primaryFg,
    fontFamily: t.font.sans,
    fontSize: 14,
    cursor: "pointer",
  },
  btnGhost: {
    padding: "6px 10px",
    borderRadius: t.radius.sm,
    border: `1px solid ${t.color.border}`,
    background: "#fff",
    color: t.color.fg,
    fontFamily: t.font.sans,
    fontSize: 12,
    cursor: "pointer",
  },
  table: { borderCollapse: "collapse", width: "100%", marginTop: t.space.md },
  th: { textAlign: "right", borderBottom: `2px solid ${t.color.border}`, padding: "8px 10px", fontSize: 13, color: t.color.muted },
  td: { borderBottom: `1px solid ${t.color.border}`, padding: "8px 10px", fontSize: 14 },
  rowBtn: { cursor: "pointer" },
  panel: {
    marginTop: t.space.lg,
    padding: t.space.lg,
    borderRadius: t.radius.lg,
    border: `1px solid ${t.color.border}`,
    background: "#fff",
  },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: t.space.lg },
  itemRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: t.space.sm,
    padding: "8px 0",
    borderBottom: `1px solid ${t.color.border}`,
  },
  chip: { fontSize: 11, padding: "2px 8px", borderRadius: t.radius.full, border: `1px solid ${t.color.border}` },
  error: { color: t.color.danger, fontSize: 13, marginTop: t.space.sm },
};

export { tokens };
