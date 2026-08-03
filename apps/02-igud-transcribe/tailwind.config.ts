import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  // מצב כהה נדלק ממחלקה על <html>, שנכתבת בסקריפט לפני הציור הראשון
  // (app/layout.tsx). הערכים עצמם יושבים ב-app/globals.css.
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // איגוד השיעורים — כחול ראשי / זהב.
        //
        // `brand` הוא **דיו** — הוא הצבע של 36 כותרות בעמוד, ולכן הוא
        // מתבהר בחושך. הכחול כמשטח (הפוטר, כפתורי הפעולה) הוא
        // `brandsurface` והוא קבוע, כי הוא צבע מותג ולא שכבת תצוגה.
        // בלי ההפרדה הזו `bg-brand text-white` היה הופך ללבן-על-לבן.
        brand: {
          DEFAULT: "rgb(var(--c-brand) / <alpha-value>)",
          dark: "#0F1D3D",
          light: "#2E4581"
        },
        brandsurface: {
          DEFAULT: "#1A2E5A",
          dark: "#0F1D3D"
        },
        accent: {
          DEFAULT: "rgb(var(--c-accent) / <alpha-value>)",
          light: "#F2D678",
          dark: "#A88937"
        },
        ink: {
          DEFAULT: "rgb(var(--c-ink) / <alpha-value>)",
          muted: "rgb(var(--c-ink-muted) / <alpha-value>)"
        },
        paper: "rgb(var(--c-paper) / <alpha-value>)",
        sand: "rgb(var(--c-sand) / <alpha-value>)",
        // `bg-white` הפך ל-`bg-surface` כדי שהמשטח יתהפך בלי לגעת ב-
        // `text-white`, שיושב על הכחול ועל הזהב ונשאר לבן בשתי הערכות.
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        // הסקאלה משמשת לשני דברים הפוכים: 50–300 הם משטחים וגבולות,
        // 400–700 הם טקסט. לכן בחושך היא מתהפכת בשני קצותיה.
        slate: {
          50: "rgb(var(--c-slate-50) / <alpha-value>)",
          100: "rgb(var(--c-slate-100) / <alpha-value>)",
          200: "rgb(var(--c-slate-200) / <alpha-value>)",
          300: "rgb(var(--c-slate-300) / <alpha-value>)",
          400: "rgb(var(--c-slate-400) / <alpha-value>)",
          500: "rgb(var(--c-slate-500) / <alpha-value>)",
          600: "rgb(var(--c-slate-600) / <alpha-value>)",
          700: "rgb(var(--c-slate-700) / <alpha-value>)"
        },
        stone: {
          200: "rgb(var(--c-slate-200) / <alpha-value>)",
          300: "rgb(var(--c-slate-300) / <alpha-value>)"
        },
        gray: {
          200: "rgb(var(--c-slate-200) / <alpha-value>)",
          600: "rgb(var(--c-slate-600) / <alpha-value>)"
        }
      },
      fontFamily: {
        serif: ['"Noto Serif Hebrew"', "Frank Ruhl Libre", "serif"],
        sans: ["Rubik", "Heebo", "system-ui", "sans-serif"]
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,30,60,0.04), 0 4px 16px rgba(20,30,60,0.06)"
      }
    }
  },
  plugins: []
} satisfies Config;
