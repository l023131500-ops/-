import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'נדל"ן ברגע — תעודת זהות דיגיטלית לכל נכס',
  description:
    'מנוע אגרגציה שמאחד מקורות מידע ממשלתיים ומסחריים לכדי תעודת זהות דיגיטלית לכל נכס בישראל. מבית מור מערכות תוכנה.',
};

/**
 * מצב כהה (DESIGN_STANDARD §3) — ראה את שכבת המשטחים ב-`app/globals.css`.
 *
 * חייב לרוץ בתוך ה-`<head>` ולפני הציור הראשון. Next מגיש כאן HTML מוכן,
 * ולכן החלה מתוך `useEffect` הייתה מגיעה רק אחרי שהדפדפן כבר צייר את העמוד
 * לבן — הבזק שנראה כמו תקלה, ובעמוד דוח ארוך גם כואב לעיניים.
 *
 * הוא אינו יוצר אי-התאמת הידרציה: הוא כותב מחלקה על `<html>`, שאינו חלק
 * מהעץ ש-React מנהל.
 */
const THEME_BOOT = `(function(){var m=window.matchMedia("(prefers-color-scheme: dark)");var a=function(d){document.documentElement.classList.toggle("dark",d)};a(m.matches);m.addEventListener?m.addEventListener("change",function(e){a(e.matches)}):m.addListener(function(e){a(e.matches)})})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <meta name="color-scheme" content="light dark" />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className="font-heebo">
        <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur print:hidden">
          {/* כפתור הכניסה המשותף (למטה בקובץ) יושב `fixed` בפינה השמאלית
              העליונה — הקצה האינליין-סופי ב-RTL — ושם בדיוק נגמר הנווט.
              נמדד ב-390px ש"מקורות ותמחור" מכוסה והלחיצה מגיעה לכדור.
              `--more30-auth-inset` הוא הרוחב שהכדור מפרסם בפועל; החיסור
              מקזז את השוליים שה-container כבר נותן במסך רחב. */}
          <div
            className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3"
            style={{
              paddingInlineEnd:
                'max(1.25rem, calc(var(--more30-auth-inset, 124px) - max(0px, (100vw - 1152px) / 2)))',
            }}
          >
            <Link href="/" className="flex items-center gap-2">
              <span className="inline-block h-3.5 w-3.5 rounded-full bg-gold shadow-[0_0_0_4px_rgba(200,162,74,0.25)]" />
              <span className="text-lg font-black text-navy">נדל"ן ברגע</span>
              <span className="text-xs font-medium text-muted">· מבית מור מערכות תוכנה</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm font-semibold text-ink">
              {/* py-1 אינו קישוט: בלעדיו גובה יעד המגע 20px, מתחת ל-24px
                  שהתקן דורש — נמדד ברוחב 390. */}
              <Link href="/" className="inline-block py-1 hover:text-tealD">חיפוש</Link>
              <Link href="/sources" className="inline-block py-1 hover:text-tealD">מקורות ותמחור</Link>
            </nav>
          </div>
        </header>
        <main className="min-h-[70vh]">{children}</main>
        <footer className="mt-16 bg-navysurface py-8 text-sm text-[#cdd6ea] print:hidden">
          <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 px-5">
            <div>
              <span className="font-black text-white">נדל"ן ברגע</span> · מבית מור מערכות תוכנה
              <div className="opacity-70">גרסה 0.1 — MVP · כל נתון מגובה במקור ובתאריך</div>
            </div>
            <div className="text-right opacity-75">
              הערכות שווי אינן מהוות ייעוץ.
              <br />
              נתונים מוצגים רק ממקורות אמיתיים — ללא נתוני דמה.
            </div>
          </div>
        </footer>
        {/* כפתור הכניסה המשותף לכל מערכות הפלטפורמה — קובץ אחד ב-more30.com,
            אותו רכיב ואותו מיקום בכל המערכות. */}
        <script src="https://more30.com/auth-button.js" defer />
      </body>
    </html>
  );
}
