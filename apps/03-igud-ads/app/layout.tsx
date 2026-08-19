import "./globals.css";
import type { Metadata } from "next";
import { Noto_Serif_Hebrew, Rubik } from "next/font/google";

// היה <link rel="stylesheet" href="fonts.googleapis.com/..."> ב-<head> — שרשרת
// חסימה (HTML → CSS של Google → WOFF2 של gstatic) לפני הציור הראשון
// (render-blocking-insight מדד חיסכון של 880ms, כמו ב-02 תמלול/32 נדל"ן).
// next/font מטמיע את הגופנים בבנייה עצמה: אין בקשת רשת לגוגל בזמן ריצה.
const notoSerifHebrew = Noto_Serif_Hebrew({
  subsets: ["hebrew"],
  weight: ["500", "700", "900"],
  variable: "--font-noto-serif-hebrew",
  display: "swap",
});
const rubik = Rubik({
  subsets: ["hebrew"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-rubik",
  display: "swap",
});

export const metadata: Metadata = {
  title: "יוצר מודעות לשיעורי תורה — מבית איגוד השיעורים",
  description:
    "פלטפורמת AI ליצירת מודעות מקצועיות לשיעורי תורה, גמ\"ח, בית כנסת ואירועים — בעברית מלאה.",
  /**
   * הנתיב נושא את ה-`basePath` במפורש. `metadata.icons` הוא המקום היחיד ב-Next
   * שאינו מקבל את `basePath` אוטומטית (בניגוד ל-`<Image>`, ל-`<Link>` ולנכסי
   * `app/icon.*`), ולכן "/favicon.svg" נפתר אל השורש של more30.com ולא אל המונט:
   * הלשונית ציירה את הסמל של הפורטל (806b) בשעה ש-`public/favicon.svg` של המערכת
   * (383b) יושב ב-/modaot/favicon.svg ואיש לא ביקש אותו.
   */
  icons: { icon: "/modaot/favicon.svg" },
};

/**
 * מצב כהה (DESIGN_STANDARD §3) — שכבת המשטחים ב-`app/globals.css`.
 *
 * חייב לרוץ בתוך ה-`<head>` ולפני הציור הראשון. Next מגיש כאן HTML מוכן
 * מהשרת, ולכן החלה מתוך `useEffect` הייתה מגיעה רק אחרי שהדפדפן כבר צייר
 * את העמוד לבן. הוא כותב מחלקה על `<html>` בלבד, שאינו חלק מהעץ ש-React
 * מנהל, ולכן אינו יוצר אי-התאמת הידרציה.
 */
const THEME_BOOT = `(function(){var KEY="modaot-theme";var m=window.matchMedia("(prefers-color-scheme: dark)");var a=function(d){document.documentElement.classList.toggle("dark",d)};var stored=null;try{stored=localStorage.getItem(KEY)}catch(e){}a(stored?stored==="dark":m.matches);var onChange=function(e){var current=null;try{current=localStorage.getItem(KEY)}catch(err){}if(!current)a(e.matches)};m.addEventListener?m.addEventListener("change",onChange):m.addListener(onChange)})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${notoSerifHebrew.variable} ${rubik.variable}`}>
      <head>
        <meta name="color-scheme" content="light dark" />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
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
