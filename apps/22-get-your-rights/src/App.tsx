import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MotionConfig } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";

/*
  ארבעת מסכי הניהול היו מיובאים ישירות, ולכן ישבו באותו קובץ עם עמוד הנחיתה:
  חבילה אחת של 1,802KB לכל מי שפתח את more30.com/zchuyot. בפנים נסעו גם
  `xlsx` (ייצוא לאקסל במסך הלידים), `recharts`, `jspdf` ו-`html2canvas` —
  ספריות שאין להן שום קשר לעמוד שהמבקר רואה. זה מה שהחזיק את הביצועים על 36.

  React.lazy על כל מה שאינו עמוד הנחיתה. `NotFound` נשאר ישיר: הוא קטן,
  והוא בדיוק המסלול שבו הבאה של קובץ נוסף היא הדבר הגרוע ביותר.
*/
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminLeads = lazy(() => import("./pages/AdminLeads"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const AdminRightsReference = lazy(() => import("./pages/AdminRightsReference"));
const AuthReset = lazy(() => import("./pages/AuthReset"));
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AdminFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
    טוען את מסך הניהול…
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    {/* reducedMotion="user" makes every motion.* below jump straight to its
        end state (no repeat: Infinity loops in HeroSection/RightsCategories/
        AnimatedLogo/Footer) when the OS-level prefers-reduced-motion is on,
        complementing the more targeted useDecorativeMotion() gate already
        used by FloatingElements. */}
    <MotionConfig reducedMotion="user">
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {/*
        ⚠️ הבייסניים חייב לבוא מה-build ולא להיכתב ביד. הוא היה מקובע ל-"/rights"
        בעוד שהאתר מוגש תחת more30.com/zchuyot — ו-react-router מחזיר null בשקט
        כשה-pathname לא מתחיל בבייסניים, בלי שגיאה ובלי אזהרה. התוצאה הייתה
        דף לבן לגמרי ב-HTTP 200: הנכסים נטענו, האפליקציה עלתה, ופשוט לא צוירה.
        `BASE_URL` הוא מה שהועבר ל-`vite build --base`, כלומר תמיד הנתיב האמיתי.
        חייבים להסיר את הסלאש הסוגר: BASE_URL הוא "/zchuyot/" והכתובת היא
        "/zchuyot" בלי סלאש, ואי-ההתאמה הזו לבדה מספיקה כדי לרוקן את הדף.
      */}
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/+$/, "")}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route
            path="/admin/login"
            element={<Suspense fallback={<AdminFallback />}><AdminLogin /></Suspense>}
          />
          <Route
            path="/admin/leads"
            element={<Suspense fallback={<AdminFallback />}><AdminLeads /></Suspense>}
          />
          <Route
            path="/admin/settings"
            element={<Suspense fallback={<AdminFallback />}><AdminSettings /></Suspense>}
          />
          <Route
            path="/admin/rights"
            element={<Suspense fallback={<AdminFallback />}><AdminRightsReference /></Suspense>}
          />
          {/*
            היעד של קישור איפוס הסיסמה מהמייל (core.issues #201). בלי המסלול
            הזה הקישור נופל על ה-catch-all ומציג 404 — עם טוקן חי בכתובת.
          */}
          <Route
            path="/auth/reset"
            element={<Suspense fallback={<AdminFallback />}><AuthReset /></Suspense>}
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </MotionConfig>
  </QueryClientProvider>
);

export default App;
