import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { BookOpen, Droplets, Flower2, Newspaper, UtensilsCrossed } from "lucide-react";
import { RootLayout } from "@/components/layout/RootLayout";
import { ScrollToHash } from "@/components/layout/ScrollToHash";
import { Home } from "@/pages/Home";
import { SynagoguesDirectory } from "@/pages/SynagoguesDirectory";
import { AskRav } from "@/pages/AskRav";
import { Contact } from "@/pages/Contact";
import { Gemachim } from "@/pages/Gemachim";
import { ContentPage } from "@/pages/ContentPage";
import { Placeholder } from "@/pages/Placeholder";

// Code-split the standalone synagogue site and the admin/gabai portals so public
// visitors never download the management bundles.
const SynagogueSite = lazy(() => import("@/pages/SynagogueSite").then((m) => ({ default: m.SynagogueSite })));
const AdminLogin = lazy(() => import("@/pages/admin/AdminLogin").then((m) => ({ default: m.AdminLogin })));
const ResetPassword = lazy(() => import("@/pages/auth/ResetPassword").then((m) => ({ default: m.ResetPassword })));
const AdminLayout = lazy(() => import("@/pages/admin/AdminLayout").then((m) => ({ default: m.AdminLayout })));
const AdminOverview = lazy(() => import("@/pages/admin/AdminOverview").then((m) => ({ default: m.AdminOverview })));
const AdminSynagogues = lazy(() => import("@/pages/admin/AdminSynagogues").then((m) => ({ default: m.AdminSynagogues })));
const AdminLessons = lazy(() => import("@/pages/admin/AdminLessons").then((m) => ({ default: m.AdminLessons })));
const AdminServices = lazy(() => import("@/pages/admin/AdminServices").then((m) => ({ default: m.AdminServices })));
const AdminInbox = lazy(() => import("@/pages/admin/AdminInbox").then((m) => ({ default: m.AdminInbox })));
const GabaiLayout = lazy(() => import("@/pages/gabai/GabaiLayout").then((m) => ({ default: m.GabaiLayout })));
const GabaiDetails = lazy(() => import("@/pages/gabai/GabaiDetails").then((m) => ({ default: m.GabaiDetails })));
const GabaiPrayers = lazy(() => import("@/pages/gabai/GabaiPrayers").then((m) => ({ default: m.GabaiPrayers })));
const GabaiLessons = lazy(() => import("@/pages/gabai/GabaiLessons").then((m) => ({ default: m.GabaiLessons })));
const GabaiAnnouncements = lazy(() => import("@/pages/gabai/GabaiAnnouncements").then((m) => ({ default: m.GabaiAnnouncements })));
const GabaiInbox = lazy(() => import("@/pages/gabai/GabaiInbox").then((m) => ({ default: m.GabaiInbox })));

function RouteFallback() {
  return <div className="grid min-h-[50vh] place-items-center text-muted-foreground">טוען…</div>;
}

/**
 * Served from more30.com/chatzor, so the router has to know its prefix. Vite
 * fills BASE_URL from the build-time base ("/" in dev, "/chatzor/" in
 * production) — without it every in-app link would drop the prefix and land on
 * the portal instead.
 *
 * ⚠️ הסלאש הסופי יורד מה-basename. `BASE_URL` הוא "/chatzor/", אבל הכתובת
 * שהפורטל מנתב אליה היא "/chatzor" בלי סלאש — ו-react-router לא מתאים אף
 * מסלול כשה-basename ארוך מהנתיב. התוצאה הייתה עמוד שנטען ונשאר **ריק**,
 * בלי שגיאה בקונסולה. בלי סלאש שתי הצורות עובדות.
 */
const BASENAME = import.meta.env.BASE_URL.replace(/\/+$/, "") || "/";

export function App() {
  return (
    <BrowserRouter basename={BASENAME}>
      <ScrollToHash />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Standalone branded synagogue mini-site (its own chrome) */}
          <Route path="/k/:slug" element={<SynagogueSite />} />

          {/* היעד של קישור איפוס הסיסמה מהמייל. מחוץ ל-RootLayout: זה מסך של
              זרימת אימות, ובאותו לבוש של מסכי הכניסה. */}
          <Route path="/auth/reset" element={<ResetPassword />} />

          {/* Council admin portal (guarded, own chrome) */}
          <Route path="/admin/login" element={<AdminLogin target="/admin" title="כניסת מנהל המועצה" />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminOverview />} />
            <Route path="synagogues" element={<AdminSynagogues />} />
            <Route path="lessons" element={<AdminLessons />} />
            <Route path="services" element={<AdminServices />} />
            <Route path="inbox" element={<AdminInbox />} />
          </Route>

          {/* Gabai portal (guarded, own chrome) */}
          <Route path="/gabai/login" element={<AdminLogin target="/gabai" title="כניסת גבאי" />} />
          <Route path="/gabai" element={<GabaiLayout />}>
            <Route index element={<GabaiDetails />} />
            <Route path="prayers" element={<GabaiPrayers />} />
            <Route path="lessons" element={<GabaiLessons />} />
            <Route path="announcements" element={<GabaiAnnouncements />} />
            <Route path="inbox" element={<GabaiInbox />} />
          </Route>

          {/* Platform routes share the global header/footer */}
          <Route element={<RootLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/batei-knesset" element={<SynagoguesDirectory />} />
            <Route path="/ask-rav" element={<AskRav />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/gemachim" element={<Gemachim />} />

            <Route path="/halacha" element={
              <ContentPage eyebrow="הלכה יומית" title="הלכה יומית" icon={BookOpen}
                subtitle="הלכה יומית קצרה מטעם רבני המועצה הדתית."
                emptyTitle="ההלכה היומית תעודכן בקרוב"
                emptyDescription="התוכן מנוהל על ידי המועצה הדתית ויעלה לאוויר עם השקת אזור הניהול." />
            } />
            <Route path="/kashrut" element={
              <ContentPage eyebrow="כשרות" title="כשרות בחצור הגלילית" icon={UtensilsCrossed}
                subtitle="רשימת בתי העסק והמוסדות בהשגחת המועצה הדתית."
                emptyTitle="רשימת הכשרות תעודכן בקרוב"
                emptyDescription="נתוני הכשרות מנוהלים על ידי המועצה הדתית." />
            } />
            <Route path="/mikvaot" element={
              <ContentPage eyebrow="מקוואות" title="מקוואות" icon={Droplets}
                subtitle="מיקומים, שעות פעילות ופרטי מקוואות היישוב."
                emptyTitle="פרטי המקוואות יעודכנו בקרוב"
                emptyDescription="הנתונים מנוהלים על ידי המועצה הדתית." />
            } />
            <Route path="/avelut" element={
              <ContentPage eyebrow="מדריך אבלות" title="מדריך אבלות וניחום" icon={Flower2}
                subtitle="מידע וליווי בעת אבל, ופרטי חברה קדישא."
                emptyTitle="מדריך האבלות יעודכן בקרוב"
                emptyDescription="התוכן מנוהל על ידי המועצה הדתית." />
            } />
            <Route path="/newsletter" element={
              <ContentPage eyebrow="עלון קהילתי" title="העלון הקהילתי" icon={Newspaper}
                subtitle="עלון הקהילה השבועי של חצור הגלילית."
                emptyTitle="העלון יעלה בקרוב"
                emptyDescription="גיליונות העלון מנוהלים על ידי המועצה הדתית." />
            } />

            <Route path="*" element={
              <Placeholder phase="404" title="הדף לא נמצא"
                description="הכתובת שחיפשת אינה קיימת. נשמח לכוון אותך חזרה לעמוד הראשי." />
            } />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
