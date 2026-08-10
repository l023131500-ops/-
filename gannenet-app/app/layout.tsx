import "./globals.css";
import type { Metadata, Viewport } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import RegisterSW from "@/components/RegisterSW";

export const metadata: Metadata = {
  title: "גננת בקליק — כל התוכן לגן במקום אחד",
  description: "פלטפורמת תוכן פדגוגי ו-AI לגננת בגן החרדי · גילאי 1–6 · מערכים, דפי משימה, דפי קשר, לוח שנה עברי — מוכן בקליק.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "גננת בקליק", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#2b4a8b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <RegisterSW />
        <Nav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
