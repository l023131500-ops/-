import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "תמלול מבית איגוד השיעורים",
  description:
    "מערכת תמלול מקצועית בעברית לשיעורי תורה — תמלול אוטומטי, עריכה לפי מסלולי סגנון, יצוא Word.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000")
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
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
