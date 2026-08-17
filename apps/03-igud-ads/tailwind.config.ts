import type { Config } from "tailwindcss";

const rgb = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  // הערכים עצמם ב-app/globals.css; המחלקה נכתבת לפני הציור ב-app/layout.tsx.
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          // דיו — מתבהר בחושך. המשטחים למטה קבועים, כי הם צבע מותג.
          blue: rgb("--c-brand-blue"),
          bluesurface: "#1A2E5A",
          gold: rgb("--c-brand-gold"),
          goldsurface: "#C9A84C",
          cream: rgb("--c-cream"),
          dark: rgb("--c-brand-dark"),
          darksurface: "#0E1B36",
        },
        // `bg-white` הפך ל-`bg-surface`; `text-white` נשאר מילולי, כי הוא
        // יושב על הכחול ועל הזהב ואלה אינם זזים.
        surface: rgb("--c-surface"),
        gray: {
          50: rgb("--c-n-50"), 100: rgb("--c-n-100"), 200: rgb("--c-n-200"),
          300: rgb("--c-n-300"), 400: rgb("--c-n-400"), 500: rgb("--c-n-500"),
          600: rgb("--c-n-600"), 700: rgb("--c-n-700"), 800: rgb("--c-n-800"),
          900: rgb("--c-n-900"),
        },
        slate: {
          50: rgb("--c-n-50"), 100: rgb("--c-n-100"), 200: rgb("--c-n-200"),
          300: rgb("--c-n-300"), 400: rgb("--c-n-400"), 500: rgb("--c-n-500"),
          600: rgb("--c-n-600"), 700: rgb("--c-n-700"), 800: rgb("--c-n-800"),
          900: rgb("--c-n-900"),
        },
        red: {
          50: rgb("--c-red-50"), 100: rgb("--c-red-100"), 200: rgb("--c-red-200"),
          600: rgb("--c-red-600"), 700: rgb("--c-red-700"), 800: rgb("--c-red-800"),
        },
        green: {
          50: rgb("--c-green-50"), 100: rgb("--c-green-100"),
          700: rgb("--c-green-700"), 800: rgb("--c-green-800"),
        },
        yellow: { 50: rgb("--c-amber-50"), 100: rgb("--c-amber-100"),
          700: rgb("--c-amber-700"), 800: rgb("--c-amber-800") },
        amber: { 50: rgb("--c-amber-50"), 100: rgb("--c-amber-100"),
          700: rgb("--c-amber-700"), 800: rgb("--c-amber-800") },
        blue: {
          50: rgb("--c-blue-50"), 100: rgb("--c-blue-100"),
          700: rgb("--c-blue-700"), 800: rgb("--c-blue-800"),
        },
        emerald: {
          50: rgb("--c-green-50"), 100: rgb("--c-green-100"),
          700: rgb("--c-green-700"), 800: rgb("--c-green-800"),
        },
      },
      fontFamily: {
        serif: ["var(--font-noto-serif-hebrew)", "serif"],
        sans: ["var(--font-rubik)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
