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
        navy: 'var(--c-navy)',
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
        ink: 'var(--c-ink)',
        muted: 'var(--c-muted)',
        line: 'var(--c-line)',
        bgsoft: 'var(--c-bgsoft)',
        // `bg-white` היה המשטח של כל כרטיס במערכת. הוא הועבר ל-`bg-surface`
        // כדי שהמשטח יוכל להתהפך בלי לגעת ב-`text-white`, שיושב על נייבי
        // ועל זהב וחייב להישאר לבן בשתי הערכות.
        surface: 'var(--c-surface)',
        slate: {
          50: 'var(--c-slate-50)',
          100: 'var(--c-slate-100)',
          200: 'var(--c-slate-200)',
          300: 'var(--c-slate-300)',
          400: 'var(--c-slate-400)',
          500: 'var(--c-slate-500)',
          600: 'var(--c-slate-600)',
          700: 'var(--c-slate-700)',
        },
      },
      fontFamily: {
        heebo: ['Heebo', 'Assistant', 'Arial', 'sans-serif'],
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
