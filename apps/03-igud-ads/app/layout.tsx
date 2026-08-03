import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "יוצר מודעות לשיעורי תורה — מבית איגוד השיעורים",
  description:
    "פלטפורמת AI ליצירת מודעות מקצועיות לשיעורי תורה, גמ\"ח, בית כנסת ואירועים — בעברית מלאה.",
  icons: { icon: "/favicon.svg" },
};

/**
 * מצב כהה (DESIGN_STANDARD §3) — שכבת המשטחים ב-`app/globals.css`.
 *
 * חייב לרוץ בתוך ה-`<head>` ולפני הציור הראשון. Next מגיש כאן HTML מוכן
 * מהשרת, ולכן החלה מתוך `useEffect` הייתה מגיעה רק אחרי שהדפדפן כבר צייר
 * את העמוד לבן. הוא כותב מחלקה על `<html>` בלבד, שאינו חלק מהעץ ש-React
 * מנהל, ולכן אינו יוצר אי-התאמת הידרציה.
 */
const THEME_BOOT = `(function(){var m=window.matchMedia("(prefers-color-scheme: dark)");var a=function(d){document.documentElement.classList.toggle("dark",d)};a(m.matches);m.addEventListener?m.addEventListener("change",function(e){a(e.matches)}):m.addListener(function(e){a(e.matches)})})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <meta name="color-scheme" content="light dark" />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+Hebrew:wght@500;700;900&family=Rubik:wght@300;400;500;700&display=swap"
        />
      </head>
      <body>
        {children}
        {/* כפתור הכניסה המשותף של more30 (DESIGN_STANDARD §9). ‎/modaot‎ הייתה
            המערכת האחרונה בלעדיו — `scripts/qa/authbutton-overlap.mjs` דיווח
            "no pill" בשני הרוחבים. הוא נדחה עד עכשיו כי זו מערכת עם סליקה
            חיה, ולא בגלל השינוי עצמו: זו שורת ‎<script>‎ אחת שאינה נוגעת
            במסד, ב-‎lib/nedarim.ts‎ ולא במסלולי ‎/api/payments/*‎. */}
        <script src="https://more30.com/auth-button.js" defer />
      </body>
    </html>
  );
}
