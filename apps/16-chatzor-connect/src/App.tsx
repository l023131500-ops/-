import { BrowserRouter, Route, Routes } from "react-router-dom";
import { RootLayout } from "@/components/layout/RootLayout";
import { Home } from "@/pages/Home";
import { Placeholder } from "@/pages/Placeholder";

export function App() {
  return (
    <BrowserRouter>
      <RootLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/k/:slug"
            element={
              <Placeholder
                phase="שלב 3"
                title="אתר בית הכנסת"
                description="כאן ייבנה הדף החי של כל בית כנסת — עם הלוגו והעיצוב שלו, זמני התפילות, השיעורים, המודעות והפעילויות. זהו הקישור שהגבאי מפיץ למתפללים."
              />
            }
          />
          <Route
            path="/gabai"
            element={
              <Placeholder
                phase="שלב 5"
                title="פורטל גבאים"
                description="אזור ניהול לגבאים לעדכון זמני תפילה, שיעורים, מודעות ופעילויות של בית הכנסת שלהם. יתווסף עם אימות Supabase אמיתי."
              />
            }
          />
          <Route
            path="/admin"
            element={
              <Placeholder
                phase="שלב 4"
                title="ניהול מועצה דתית"
                description="אזור מנהל-על ליצירת בתי כנסת וחשבונות גבאים, וניהול כל התוכן הכללי של המועצה הדתית."
              />
            }
          />
          <Route
            path="*"
            element={
              <Placeholder
                phase="404"
                title="הדף לא נמצא"
                description="הכתובת שחיפשת אינה קיימת. נשמח לכוון אותך חזרה לעמוד הראשי."
              />
            }
          />
        </Routes>
      </RootLayout>
    </BrowserRouter>
  );
}
