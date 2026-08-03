import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "יוצר מודעות לשיעורי תורה — מבית איגוד השיעורים",
  description:
    "פלטפורמת AI ליצירת מודעות מקצועיות לשיעורי תורה, גמ\"ח, בית כנסת ואירועים — בעברית מלאה.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+Hebrew:wght@500;700;900&family=Rubik:wght@300;400;500;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
