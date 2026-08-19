import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  // מצב כהה נדלק ממחלקה על <html>, שנכתבת בסקריפט לפני הציור הראשון
  // (app/layout.tsx). לא media: המשתמש צריך שהאתר יעקוב אחרי מערכת ההפעלה
  // שלו, אבל הטוקנים חייבים להיות ניתנים להחלפה גם ידנית בהמשך.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // `navy` הוא **דיו** — הוא מתבהר בחושך כמו כל כותרת. הנייבי כמשטח
        // (ה-hero, כפתורי הפעולה הכהים) הוא `navysurface` והוא קבוע, כי הוא
        // צבע מותג ולא שכבת תצוגה. ההפרדה הזו היא מה שמאפשר ל-147 מופעי
        // `text-navy` להתהפך בלי לשבור אף אחד מ-23 מופעי הרקע.
        navy: 'rgb(var(--c-navy) / <alpha-value>)',
        navysurface: '#0d1b3e',
        navy2: '#122a5e',
        indigo: '#1e3a8a',
        // White on the old #0ea5a4 measured 3.03:1 — below AA, on the primary
        // call-to-action and 38 other places. Rather than special-casing each
        // one, `teal` is now the darker tone that was already in the palette as
        // `tealD` (4.95:1), so every existing bg-teal passes untouched and the
        // brand does not shift. `tealD` moves down to keep a distinct hover.
        teal: '#0b7d7c',
        tealD: '#0e6e6c',
        gold: '#c8a24a',
        goldL: '#e6c988',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        bgsoft: 'rgb(var(--c-bgsoft) / <alpha-value>)',
        // `bg-white` היה המשטח של כל כרטיס במערכת. הוא הועבר ל-`bg-surface`
        // כדי שהמשטח יוכל להתהפך בלי לגעת ב-`text-white`, שיושב על נייבי
        // ועל זהב וחייב להישאר לבן בשתי הערכות.
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        slate: {
          50: 'rgb(var(--c-slate-50) / <alpha-value>)',
          100: 'rgb(var(--c-slate-100) / <alpha-value>)',
          200: 'rgb(var(--c-slate-200) / <alpha-value>)',
          300: 'rgb(var(--c-slate-300) / <alpha-value>)',
          400: 'rgb(var(--c-slate-400) / <alpha-value>)',
          500: 'rgb(var(--c-slate-500) / <alpha-value>)',
          600: 'rgb(var(--c-slate-600) / <alpha-value>)',
          700: 'rgb(var(--c-slate-700) / <alpha-value>)',
        },
      },
      fontFamily: {
        heebo: ['var(--font-heebo)', 'var(--font-assistant)', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 12px rgba(13,27,62,0.06)',
        lift: '0 18px 40px rgba(13,27,62,0.18)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};

export default config;
