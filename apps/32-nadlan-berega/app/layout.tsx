import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'נדל"ן ברגע — תעודת זהות דיגיטלית לכל נכס',
  description:
    'מנוע אגרגציה שמאחד מקורות מידע ממשלתיים ומסחריים לכדי תעודת זהות דיגיטלית לכל נכס בישראל. מבית מור מערכות תוכנה.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className="font-heebo">
        <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur print:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
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
        <footer className="mt-16 bg-navy py-8 text-sm text-[#cdd6ea] print:hidden">
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
