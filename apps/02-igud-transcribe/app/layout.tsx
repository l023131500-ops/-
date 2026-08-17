import type { Metadata } from "next";
import { Noto_Serif_Hebrew, Rubik } from "next/font/google";
import "./globals.css";

// היה <link rel="stylesheet" href="fonts.googleapis.com/..."> ב-<head> — שרשרת
// חסימה (HTML → CSS של Google → WOFF2 של gstatic) לפני הציור הראשון
// (render-blocking-insight מדד חיסכון של 1,510ms). next/font מטמיע את
// הגופנים בבנייה עצמה: אין בקשת רשת לגוגל בזמן ריצה, ואין שרשרת-תלות.
const notoSerifHebrew = Noto_Serif_Hebrew({
  subsets: ["hebrew"],
  weight: ["500", "700", "900"],
  variable: "--font-noto-serif-hebrew",
  display: "swap",
});
const rubik = Rubik({
  subsets: ["hebrew"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-rubik",
  display: "swap",
});

export const metadata: Metadata = {
  title: "תמלול מבית איגוד השיעורים",
  description:
    "מערכת תמלול מקצועית בעברית לשיעורי תורה — תמלול אוטומטי, עריכה לפי מסלולי סגנון, יצוא Word.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  /**
   * בלי השורה הזו לא הוצהר סמל כלל, והדפדפן נפל אל /favicon.ico על ה-origin —
   * כלומר אל הסמל של הפורטל. `public/favicon.svg` (505b) כבר מוגש ב-
   * /tamlul/favicon.svg. הנתיב נושא את ה-`basePath` במפורש כי `metadata.icons`
   * אינו מקבל אותו אוטומטית.
   */
  icons: { icon: "/tamlul/favicon.svg" }
};

/**
 * מצב כהה (DESIGN_STANDARD §3) — שכבת המשטחים ב-`app/globals.css`.
 *
 * חייב לרוץ בתוך ה-`<head>` ולפני הציור הראשון. Next מגיש כאן HTML מוכן
 * מהשרת, ולכן החלה מתוך `useEffect` הייתה מגיעה רק אחרי שהדפדפן כבר צייר
 * את העמוד לבן. הוא כותב מחלקה על `<html>` בלבד, שאינו חלק מהעץ ש-React
 * מנהל, ולכן אינו יוצר אי-התאמת הידרציה.
 */
const THEME_BOOT = `(function(){var KEY="tamlul-theme";var m=window.matchMedia("(prefers-color-scheme: dark)");var a=function(d){document.documentElement.classList.toggle("dark",d)};var stored=null;try{stored=localStorage.getItem(KEY)}catch(e){}a(stored?stored==="dark":m.matches);var onChange=function(e){var current=null;try{current=localStorage.getItem(KEY)}catch(err){}if(!current)a(e.matches)};m.addEventListener?m.addEventListener("change",onChange):m.addListener(onChange)})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${notoSerifHebrew.variable} ${rubik.variable}`}>
      <head>
        <meta name="color-scheme" content="light dark" />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>{children}
        <script src="https://more30.com/auth-button.js" defer />
      </body>
    </html>
  );
}
