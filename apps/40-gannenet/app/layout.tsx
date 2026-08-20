import "./globals.css";
import type { Metadata, Viewport } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import RegisterSW from "@/components/RegisterSW";
import { withBase } from "@/lib/base";

export const metadata: Metadata = {
  title: "גננת בקליק — כל התוכן לגן במקום אחד",
  description: "פלטפורמת תוכן פדגוגי ו-AI לגננת בגן החרדי · גילאי 1–6 · מערכים, דפי משימה, דפי קשר, לוח שנה עברי — מוכן בקליק.",
  // Next's `basePath` prefixes /_next assets and next/link hrefs, but NOT the
  // URLs in `metadata` — under /gannenet these would resolve to the portal root
  // and serve the portal's manifest and icon instead of this app's.
  manifest: withBase("/manifest.webmanifest"),
  appleWebApp: { capable: true, title: "גננת בקליק", statusBarStyle: "default" },
  icons: { icon: withBase("/icon.svg"), apple: withBase("/icon.svg") },
};

export const viewport: Viewport = {
  themeColor: "#2b4a8b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <RegisterSW />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-white"
        >
          דלג לתוכן הראשי
        </a>
        <Nav />
        <main id="main">{children}</main>
        <Footer />
        {/* כפתור הכניסה המשותף. נמדד ב-12/08 על 26 הכתובות החיות: 25 מהן
            מגישות את הסקריפט הזה, וגן-קליק הייתה היחידה בלעדיו — כלומר
            למבקר כאן לא הייתה שום דרך להתחבר, ולכן גם לא להיות לקוח של
            המערכת הזו (‎core.app_memberships‎ החזיקה לה שורה אחת, וזו נכתבה
            בסקריפט ולא בדפדפן). הכתובת מלאה ולא ‎/auth-button.js‎ כי האפליקציה
            מוגשת תחת ‎basePath‎ ‏‎/gannenet‎.
            הסקריפט מפרסם ‎--more30-auth-inset‎, ו-Nav מפנה לו מקום דרכו. */}
        <script src="https://more30.com/auth-button.js" defer></script>
      </body>
    </html>
  );
}
