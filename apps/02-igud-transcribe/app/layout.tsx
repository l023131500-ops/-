import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "תמלול מבית איגוד השיעורים",
  description:
    "מערכת תמלול מקצועית בעברית לשיעורי תורה — תמלול אוטומטי, עריכה לפי מסלולי סגנון, יצוא Word.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000")
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
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+Hebrew:wght@500;700;900&family=Rubik:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}
        <script src="https://more30.com/auth-button.js" defer />
      </body>
    </html>
  );
}
