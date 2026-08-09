import "./globals.css";
import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "גננת בקליק — כל התוכן לגן במקום אחד",
  description: "פלטפורמת תוכן פדגוגי ו-AI לגננת בגן החרדי · גילאי 1–6 · מערכים, דפי משימה, דפי קשר, לוח שנה עברי — מוכן בקליק.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <Nav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
