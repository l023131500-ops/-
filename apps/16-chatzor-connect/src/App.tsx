import { BrowserRouter, Route, Routes } from "react-router-dom";
import { BookOpen, Droplets, Flower2, Newspaper, UtensilsCrossed } from "lucide-react";
import { RootLayout } from "@/components/layout/RootLayout";
import { ScrollToHash } from "@/components/layout/ScrollToHash";
import { Home } from "@/pages/Home";
import { SynagoguesDirectory } from "@/pages/SynagoguesDirectory";
import { SynagogueSite } from "@/pages/SynagogueSite";
import { AskRav } from "@/pages/AskRav";
import { Contact } from "@/pages/Contact";
import { Gemachim } from "@/pages/Gemachim";
import { ContentPage } from "@/pages/ContentPage";
import { Placeholder } from "@/pages/Placeholder";
import { AdminLogin } from "@/pages/admin/AdminLogin";
import { AdminLayout } from "@/pages/admin/AdminLayout";
import { AdminOverview } from "@/pages/admin/AdminOverview";
import { AdminSynagogues } from "@/pages/admin/AdminSynagogues";
import { AdminLessons } from "@/pages/admin/AdminLessons";
import { AdminServices } from "@/pages/admin/AdminServices";
import { AdminInbox } from "@/pages/admin/AdminInbox";

export function App() {
  return (
    <BrowserRouter>
      <ScrollToHash />
      <Routes>
        {/* Standalone branded synagogue mini-site (its own chrome) */}
        <Route path="/k/:slug" element={<SynagogueSite />} />

        {/* Council admin portal (guarded, own chrome) */}
        <Route path="/admin/login" element={<AdminLogin target="/admin" title="כניסת מנהל המועצה" />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminOverview />} />
          <Route path="synagogues" element={<AdminSynagogues />} />
          <Route path="lessons" element={<AdminLessons />} />
          <Route path="services" element={<AdminServices />} />
          <Route path="inbox" element={<AdminInbox />} />
        </Route>

        {/* Platform routes share the global header/footer */}
        <Route element={<RootLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/batei-knesset" element={<SynagoguesDirectory />} />
          <Route path="/ask-rav" element={<AskRav />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/gemachim" element={<Gemachim />} />

          <Route
            path="/halacha"
            element={
              <ContentPage
                eyebrow="הלכה יומית" title="הלכה יומית" icon={BookOpen}
                subtitle="הלכה יומית קצרה מטעם רבני המועצה הדתית."
                emptyTitle="ההלכה היומית תעודכן בקרוב"
                emptyDescription="התוכן מנוהל על ידי המועצה הדתית ויעלה לאוויר עם השקת אזור הניהול."
              />
            }
          />
          <Route
            path="/kashrut"
            element={
              <ContentPage
                eyebrow="כשרות" title="כשרות בחצור הגלילית" icon={UtensilsCrossed}
                subtitle="רשימת בתי העסק והמוסדות בהשגחת המועצה הדתית."
                emptyTitle="רשימת הכשרות תעודכן בקרוב"
                emptyDescription="נתוני הכשרות מנוהלים על ידי המועצה הדתית."
              />
            }
          />
          <Route
            path="/mikvaot"
            element={
              <ContentPage
                eyebrow="מקוואות" title="מקוואות" icon={Droplets}
                subtitle="מיקומים, שעות פעילות ופרטי מקוואות היישוב."
                emptyTitle="פרטי המקוואות יעודכנו בקרוב"
                emptyDescription="הנתונים מנוהלים על ידי המועצה הדתית."
              />
            }
          />
          <Route
            path="/avelut"
            element={
              <ContentPage
                eyebrow="מדריך אבלות" title="מדריך אבלות וניחום" icon={Flower2}
                subtitle="מידע וליווי בעת אבל, ופרטי חברה קדישא."
                emptyTitle="מדריך האבלות יעודכן בקרוב"
                emptyDescription="התוכן מנוהל על ידי המועצה הדתית."
              />
            }
          />
          <Route
            path="/newsletter"
            element={
              <ContentPage
                eyebrow="עלון קהילתי" title="העלון הקהילתי" icon={Newspaper}
                subtitle="עלון הקהילה השבועי של חצור הגלילית."
                emptyTitle="העלון יעלה בקרוב"
                emptyDescription="גיליונות העלון מנוהלים על ידי המועצה הדתית."
              />
            }
          />

          <Route
            path="/gabai"
            element={
              <Placeholder phase="שלב 5" title="פורטל גבאים"
                description="אזור ניהול לגבאים לעדכון זמני תפילה, שיעורים, מודעות ופעילויות של בית הכנסת שלהם." />
            }
          />
          <Route
            path="*"
            element={
              <Placeholder phase="404" title="הדף לא נמצא"
                description="הכתובת שחיפשת אינה קיימת. נשמח לכוון אותך חזרה לעמוד הראשי." />
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
