import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/hooks/useAuth";
import { TenantProvider } from "@/hooks/useTenant";
import { CartSync } from "@/components/branding/CartSync";
import { RequireSuperAdmin } from "@/components/auth/RequireSuperAdmin";

/* עמוד הנחיתה והמעטפת שלו נטענים מיידית — הם מה שהמבקר רואה ראשון,
   ו-Lighthouse נמדד עליהם (DESIGN_STANDARD §7). כל שאר 70 העמודים נטענים
   בבקשה נפרדת כשנכנסים אליהם.

   למה זה נדרש ולא "אופטימיזציה": כל העמודים היו מיובאים ישירות, ולכן vite
   הפיק חבילה אחת של 2.23MB שהדפדפן חייב להוריד ולפרסר לפני שמצייר תו אחד.
   על מובייל זה נמדד LCP 12.5 שניות ו-Performance 34 — הנמוך בפלטפורמה.
   recharts, xlsx, embla ו-react-day-picker משמשים אך ורק במסכי הניהול
   והפורטל, ועד עכשיו כל מבקר בדף הבית הוריד גם אותם. */
import { PublicLayout } from "@/components/layout/PublicLayout";
import Home from "@/pages/public/Home";

// Layouts (נטענים עם האזור שהם עוטפים)
const PortalLayout = lazy(() =>
  import("@/components/layout/PortalLayout").then((m) => ({ default: m.PortalLayout })),
);
const AdminLayout = lazy(() =>
  import("@/components/layout/AdminLayout").then((m) => ({ default: m.AdminLayout })),
);

// Public Pages
const About = lazy(() => import("@/pages/public/About"));
const Contact = lazy(() => import("@/pages/public/Contact"));
const Privacy = lazy(() => import("@/pages/public/Privacy"));
const Accessibility = lazy(() => import("@/pages/public/Accessibility"));
const LessonsDirectory = lazy(() => import("@/pages/public/LessonsDirectory"));
const LessonDetail = lazy(() => import("@/pages/public/LessonDetail"));
const FindLesson = lazy(() => import("@/pages/public/FindLesson"));
const RequestLesson = lazy(() => import("@/pages/public/RequestLesson"));
const JoinTeacher = lazy(() => import("@/pages/public/JoinTeacher"));
const Synagogues = lazy(() => import("@/pages/public/Synagogues"));
const SynagogueDetail = lazy(() => import("@/pages/public/SynagogueDetail"));
const HalachaDaily = lazy(() => import("@/pages/public/HalachaDaily"));
const RabbiQuestions = lazy(() => import("@/pages/public/RabbiQuestions"));
const Mourning = lazy(() => import("@/pages/public/Mourning"));
const Kashrut = lazy(() => import("@/pages/public/Kashrut"));
const Mikvaot = lazy(() => import("@/pages/public/Mikvaot"));
const Azkarot = lazy(() => import("@/pages/public/Azkarot"));

// Shop
const ShopCatalog = lazy(() => import("@/pages/shop/ShopCatalog"));
const ProductDetail = lazy(() => import("@/pages/shop/ProductDetail"));
const Cart = lazy(() => import("@/pages/shop/Cart"));
const Checkout = lazy(() => import("@/pages/shop/Checkout"));
const OrderSuccess = lazy(() => import("@/pages/shop/OrderSuccess"));

// Donations
const DonationPage = lazy(() => import("@/pages/public/DonationPage"));
const DonationSuccess = lazy(() => import("@/pages/public/DonationSuccess"));

// Auth
const SignIn = lazy(() => import("@/pages/auth/SignIn"));
const SignUp = lazy(() => import("@/pages/auth/SignUp"));
const ActivateInvite = lazy(() => import("@/pages/auth/ActivateInvite"));

// New Pages
const PortalAttendance = lazy(() => import("@/pages/portal/Attendance"));
const PortalTips = lazy(() => import("@/pages/portal/Tips"));
const PortalBulkUpload = lazy(() => import("@/pages/portal/BulkUpload"));
const PortalStudySchedule = lazy(() => import("@/pages/portal/StudySchedule"));
const Questionnaire = lazy(() => import("@/pages/public/Questionnaire"));
const AdminTips = lazy(() => import("@/pages/admin/Tips"));
const AdminForums = lazy(() => import("@/pages/admin/Forums"));
const AdminTeacherFeatures = lazy(() => import("@/pages/admin/TeacherFeatures"));

// Portal
const PortalDashboard = lazy(() => import("@/pages/portal/Dashboard"));
const PortalSchedule = lazy(() => import("@/pages/portal/Schedule"));
const PortalParticipants = lazy(() => import("@/pages/portal/Participants"));
const PortalMaterials = lazy(() => import("@/pages/portal/Materials"));
const PortalForums = lazy(() => import("@/pages/portal/Forums"));
const PortalGallery = lazy(() => import("@/pages/portal/Gallery"));
const PortalDonations = lazy(() => import("@/pages/portal/Donations"));
const PortalOrders = lazy(() => import("@/pages/portal/Orders"));
const PortalMessages = lazy(() => import("@/pages/portal/Messages"));
const PortalSettings = lazy(() => import("@/pages/portal/Settings"));
const PortalProfile = lazy(() => import("@/pages/portal/Profile"));

// Admin
const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const AdminTenants = lazy(() => import("@/pages/admin/Tenants"));
const AdminTenantDetail = lazy(() => import("@/pages/admin/TenantDetail"));
const AdminUsers = lazy(() => import("@/pages/admin/Users"));
const AdminMatching = lazy(() => import("@/pages/admin/Matching"));
const AdminLeads = lazy(() => import("@/pages/admin/Leads"));
const AdminCommerce = lazy(() => import("@/pages/admin/Commerce"));
const AdminAnalytics = lazy(() => import("@/pages/admin/Analytics"));

// 404
const NotFound = lazy(() => import("@/pages/NotFound"));

// ---- Torah-Connect Legacy Pages (from original ZIP) ----
const RabbiPortal = lazy(() => import("@/pages/legacy/RabbiPortal"));
const SynagoguePortal = lazy(() => import("@/pages/legacy/SynagoguePortal"));
const OrgPortal = lazy(() => import("@/pages/legacy/OrgPortal"));
const LessonDirectory = lazy(() => import("@/pages/legacy/LessonDirectory"));
const TeachersLanding = lazy(() => import("@/pages/legacy/TeachersLanding"));
const PublicOrgPage = lazy(() => import("@/pages/legacy/PublicOrgPage"));
const PublicRabbiPage = lazy(() => import("@/pages/legacy/PublicRabbiPage"));
const PublicSynagoguePage = lazy(() => import("@/pages/legacy/PublicSynagoguePage"));
const IvrBuilder = lazy(() => import("@/pages/legacy/IvrBuilder"));
const NedarimManagement = lazy(() => import("@/pages/legacy/NedarimManagement"));
const UpdateLesson = lazy(() => import("@/pages/legacy/UpdateLesson"));
const StudyDayUpload = lazy(() => import("@/pages/legacy/StudyDayUpload"));
const Install = lazy(() => import("@/pages/legacy/Install"));
const LegacyAdminDashboard = lazy(() => import("@/pages/legacy/AdminDashboard"));
const LegacyAdminLogin = lazy(() => import("@/pages/legacy/AdminLogin"));

// ---- Guru-Portal Admin Pages ----
const AdminContent = lazy(() => import("@/pages/admin/Content"));
const AdminLeadsGuru = lazy(() => import("@/pages/admin/LeadsGuru"));
const AdminMatchingGuru = lazy(() => import("@/pages/admin/MatchingGuru"));
const AdminMessages = lazy(() => import("@/pages/admin/Messages"));
const AdminTeachers = lazy(() => import("@/pages/admin/Teachers"));

// ---- Guru-Portal Portal Pages ----
const PortalLessons = lazy(() => import("@/pages/portal/Lessons"));
const PortalPrayerTimes = lazy(() => import("@/pages/portal/PrayerTimes"));
const PortalPortalSettings = lazy(() => import("@/pages/portal/PortalSettings"));

// ---- Guru-Portal Public Pages ----
const Invite = lazy(() => import("@/pages/public/Invite"));
const RabbiPublic = lazy(() => import("@/pages/public/RabbiPublic"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

/* מסך הביניים בין מסך למסך. ‎min-height‎ שווה לגובה החלון כדי שהמעבר לא
   יקפיץ את העמוד — קפיצת פריסה נמדדת כ-CLS ונחשבת כשל. */
function RouteFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen items-center justify-center text-muted-foreground"
    >
      טוען…
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* The routes below are written from the site root, but the site is also
          served from a sub-path (more30.com/torah). Vite's BASE_URL carries that
          prefix into the bundle, so the router derives it instead of hardcoding
          a deployment detail. At the root it is "/", i.e. unchanged.

          The trailing slash must go. BASE_URL is "/torah/", the address people
          land on is "/torah", and react-router treats a pathname that does not
          start with the full basename as no match — it then renders null with no
          error of any kind in a production build. That is a blank page, not a
          crash, which is why it went unnoticed. */}
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/+$/, "") || "/"}>
        <TenantProvider>
          <AuthProvider>
            <TooltipProvider>
              <CartSync />
              <Toaster />
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  {/* Public site */}
                  <Route element={<PublicLayout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/t/:slug" element={<Home />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/accessibility" element={<Accessibility />} />

                    <Route path="/lessons" element={<LessonsDirectory />} />
                    <Route path="/lessons/:id" element={<LessonDetail />} />
                    <Route path="/find-lesson" element={<FindLesson />} />
                    <Route path="/request-lesson" element={<RequestLesson />} />
                    <Route path="/join-teacher" element={<JoinTeacher />} />

                    <Route path="/synagogues" element={<Synagogues />} />
                    <Route path="/synagogues/:id" element={<SynagogueDetail />} />
                    <Route path="/halacha" element={<HalachaDaily />} />
                    <Route path="/ask-rabbi" element={<RabbiQuestions />} />
                    <Route path="/mourning" element={<Mourning />} />
                    <Route path="/kashrut" element={<Kashrut />} />
                    <Route path="/mikvaot" element={<Mikvaot />} />
                    <Route path="/azkarot" element={<Azkarot />} />

                    <Route path="/shop" element={<ShopCatalog />} />
                    <Route path="/shop/:slug" element={<ProductDetail />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/order/success" element={<OrderSuccess />} />

                    <Route path="/donate" element={<DonationPage />} />
                    <Route path="/donate/:campaignSlug" element={<DonationPage />} />
                    <Route path="/donate/success" element={<DonationSuccess />} />
                    <Route path="/questionnaire" element={<Questionnaire />} />
                    {/* Guru-Portal Public */}
                    <Route path="/invite" element={<Invite />} />
                    <Route path="/rabbi/:id" element={<RabbiPublic />} />
                    {/* Torah-Connect Legacy Public */}
                    <Route path="/teachers" element={<TeachersLanding />} />
                    <Route path="/lessons-dir" element={<LessonDirectory />} />
                    <Route path="/install" element={<Install />} />
                  </Route>

                  {/* Auth */}
                  <Route path="/auth/sign-in" element={<SignIn />} />
                  <Route path="/auth/sign-up" element={<SignUp />} />
                  <Route path="/auth/activate" element={<ActivateInvite />} />

                  {/* Portal */}
                  <Route path="/portal" element={<PortalLayout />}>
                    <Route index element={<PortalDashboard />} />
                    <Route path="schedule" element={<PortalSchedule />} />
                    <Route path="participants" element={<PortalParticipants />} />
                    <Route path="materials" element={<PortalMaterials />} />
                    <Route path="forums" element={<PortalForums />} />
                    <Route path="gallery" element={<PortalGallery />} />
                    <Route path="donations" element={<PortalDonations />} />
                    <Route path="orders" element={<PortalOrders />} />
                    <Route path="messages" element={<PortalMessages />} />
                    <Route path="settings" element={<PortalSettings />} />
                    <Route path="profile" element={<PortalProfile />} />
                    <Route path="attendance" element={<PortalAttendance />} />
                    <Route path="tips" element={<PortalTips />} />
                    <Route path="bulk-upload" element={<PortalBulkUpload />} />
                    <Route path="study-schedule" element={<PortalStudySchedule />} />
                    {/* Guru-Portal Portal Pages */}
                    <Route path="lessons" element={<PortalLessons />} />
                    <Route path="prayer-times" element={<PortalPrayerTimes />} />
                    <Route path="portal-settings" element={<PortalPortalSettings />} />
                  </Route>

                  {/* Super Admin */}
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="tenants" element={<AdminTenants />} />
                    <Route path="tenants/:id" element={<AdminTenantDetail />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="matching" element={<AdminMatching />} />
                    <Route path="leads" element={<AdminLeads />} />
                    <Route path="commerce" element={<AdminCommerce />} />
                    <Route path="analytics" element={<AdminAnalytics />} />
                    <Route path="tips" element={<AdminTips />} />
                    <Route path="forums" element={<AdminForums />} />
                    <Route path="teacher-features" element={<AdminTeacherFeatures />} />
                    {/* Guru-Portal Admin Pages */}
                    <Route path="content" element={<AdminContent />} />
                    <Route path="leads-guru" element={<AdminLeadsGuru />} />
                    <Route path="matching-guru" element={<AdminMatchingGuru />} />
                    <Route path="messages" element={<AdminMessages />} />
                    <Route path="teachers" element={<AdminTeachers />} />
                  </Route>

                  {/* Torah-Connect Legacy Routes (standalone, no layout wrapper) */}
                  <Route path="/portal/rabbi/:token" element={<RabbiPortal />} />
                  <Route path="/portal/org/:token" element={<OrgPortal />} />
                  <Route path="/shul/:accessToken" element={<SynagoguePortal />} />
                  <Route path="/view/rabbi/:publicToken" element={<PublicRabbiPage />} />
                  <Route path="/view/org/:publicToken" element={<PublicOrgPage />} />
                  <Route path="/view/shul/:publicToken" element={<PublicSynagoguePage />} />
                  <Route path="/study-days/:token" element={<StudyDayUpload />} />
                  <Route path="/update-lesson" element={<UpdateLesson />} />
                  <Route path="/legacy/admin-login" element={<LegacyAdminLogin />} />

                  {/* /legacy/teacher-dashboard and /legacy/seeker-dashboard used
                      to render two pages from the original ZIP whose entire
                      contents were literals: four invented seekers with names,
                      cities and "התאמה 95%" beside a יצירת קשר button, four
                      invented rabbis, and seven counters (12 · 4 · 3 · 156 ·
                      8 · 3 · 24). Both were routed with no gate under the title
                      "האזור האישי שלי", and both were painted to anonymous
                      visitors in production — measured 10/08/2026 on
                      more30.com/torah. Nothing in the tree linked to either.
                      The real personal area is /portal, which is gated and
                      reads the tenant, so the addresses now point there rather
                      than 404. core.issues #141. */}
                  <Route path="/legacy/teacher-dashboard" element={<Navigate to="/portal" replace />} />
                  <Route path="/legacy/seeker-dashboard" element={<Navigate to="/portal" replace />} />

                  {/* The legacy consoles. "standalone, no layout wrapper" above
                      was also, until now, "no gate": measured against production
                      on 07/08/2026, an anonymous visitor got /legacy/admin
                      (953 chars, the lesson board with edit, ZIP backup and
                      Nedarim export) and /legacy/ivr (1708 chars, "ניהול מערכת")
                      fully painted, while /admin beside them redirected to
                      sign-in. core.issues #87. They keep their own chrome —
                      RequireSuperAdmin adds the check and nothing else. */}
                  <Route element={<RequireSuperAdmin />}>
                    <Route path="/legacy/admin" element={<LegacyAdminDashboard />} />
                    <Route path="/legacy/nedarim" element={<NedarimManagement />} />
                    <Route path="/legacy/ivr" element={<IvrBuilder />} />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </TooltipProvider>
          </AuthProvider>
        </TenantProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
