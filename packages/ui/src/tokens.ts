/**
 * @more30/ui — design tokens ONLY.
 *
 * This is the clean token foundation. Final visual polish for systems born in
 * Lovable (egod / torah-platform) is done IN Lovable against the same Supabase
 * connections — do not rewrite existing visual design here. RTL-first (Hebrew).
 */
export const tokens = {
  color: {
    bg: "#ffffff",
    fg: "#0f172a",
    muted: "#64748b",
    primary: "#1d4ed8",
    primaryFg: "#ffffff",
    accent: "#0ea5e9",
    border: "#e2e8f0",
    success: "#16a34a",
    warning: "#d97706",
    danger: "#dc2626",
  },
  radius: { sm: "6px", md: "10px", lg: "16px", full: "9999px" },
  space: { xs: "4px", sm: "8px", md: "16px", lg: "24px", xl: "40px" },
  font: {
    sans: "'Assistant', 'Rubik', system-ui, sans-serif",
    mono: "ui-monospace, SFMono-Regular, monospace",
  },
  dir: "rtl" as const,
} as const;

export type Tokens = typeof tokens;
