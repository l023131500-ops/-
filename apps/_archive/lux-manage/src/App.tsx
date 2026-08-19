import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppProvider, useApp } from "@/contexts/AppContext";
import { FinancialProvider } from "@/contexts/FinancialContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/AppSidebar";
import { AnimatePresence, motion } from "framer-motion";
import DashboardPage from "@/components/DashboardPage";
import BusinessDashboard from "@/components/BusinessDashboard";
import BusinessGate from "@/components/BusinessGate";
import FinancialSetupPage from "@/components/FinancialSetupPage";
import ProfilePage from "@/components/ProfilePage";
import ExpenseTrackerPage from "@/components/ExpenseTrackerPage";
import FamilyFuturePage from "@/components/FamilyFuturePage";
import FinancialHealthPage from "@/components/FinancialHealthPage";
import SmartTimelinePage from "@/components/SmartTimelinePage";
import SuppliersPage from "@/components/SuppliersPage";
import ExpertChatPage from "@/components/ExpertChatPage";
import BenefitsPage from "@/components/BenefitsPage";
import PlaceholderPage from "@/components/PlaceholderPage";
import LoginPage from "@/components/LoginPage";
import LandingPage from "@/components/LandingPage";
import AdminLayout from "@/components/AdminLayout";
import MasterCalendarPage from "@/components/MasterCalendarPage";
import FloatingExpertChat from "@/components/FloatingExpertChat";
import FloatingActionButton from "@/components/FloatingActionButton";
import QuickEntryPage from "@/components/QuickEntryPage";
import BudgetGuard from "@/components/BudgetGuard";
import ApiDocsPage from "@/components/ApiDocsPage";
import CommandBar from "@/components/CommandBar";
import GrowthAcademyPage from "@/components/GrowthAcademyPage";
import OnboardingWizard from "@/components/OnboardingWizard";
import InvoicesPage from "@/components/InvoicesPage";
import ProjectsPage from "@/components/ProjectsPage";
import ModuleSettingsPage from "@/components/ModuleSettingsPage";
import ResetPasswordPage from "@/components/ResetPasswordPage";
import { supabase } from "@/integrations/supabase/client";
import { Settings, BarChart3 } from "lucide-react";
import NotFound from "./pages/NotFound";
import { useEffect, useRef } from "react";
import { consumeStoredOAuthNextPath, sanitizeAuthNextPath } from "@/lib/authRedirect";

const queryClient = new QueryClient();
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function AppLayout() {
  const { language, mode, profile } = useApp();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const isBusiness = mode === "business";

  return (
    <div dir={language === "he" ? "rtl" : "ltr"} className="min-h-screen flex w-full bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center border-b border-border/30 px-6 glass-card sticky top-0 z-10" style={{ borderRadius: 0 }}>
          <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors duration-300" />
          <div className="flex-1" />
          {isAdmin && (
            <button
              onClick={() => navigate("/admin")}
              className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors me-3"
              title="ניהול"
            >
              ⚙
            </button>
          )}
          <AnimatePresence mode="wait">
            <motion.span
              key={mode}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.3 }}
              className={`text-[10px] font-bold px-3 py-1.5 rounded-full tracking-wide ${
                isBusiness ? "bg-indigo/10 text-indigo" : "bg-accent/10 text-accent"
              }`}
            >
              {isBusiness ? "מצב עסקי" : "מצב ביתי"}
            </motion.span>
          </AnimatePresence>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={isBusiness ? (profile.profileComplete && profile.familyStatus ? <BusinessDashboard /> : <BusinessGate />) : <DashboardPage />} />
            <Route path="/financial-setup" element={<FinancialSetupPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/timeline" element={<SmartTimelinePage />} />
            <Route path="/expenses" element={<ExpenseTrackerPage />} />
            <Route path="/family-future" element={<FamilyFuturePage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/financial-health" element={<FinancialHealthPage />} />
            <Route path="/benefits" element={<BenefitsPage />} />
            <Route path="/expert-chat" element={<ExpertChatPage />} />
            <Route path="/calendar" element={<MasterCalendarPage />} />
            <Route path="/quick-entry" element={<QuickEntryPage />} />
            <Route path="/academy" element={<GrowthAcademyPage />} />
            <Route path="/api-docs" element={<ApiDocsPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/reports" element={<PlaceholderPage title="דוחות" icon={BarChart3} />} />
            <Route path="/settings" element={<ModuleSettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <FloatingExpertChat />
          <FloatingActionButton />
          <BudgetGuard />
          <CommandBar />
        </main>
      </div>
    </div>
  );
}

function UserIdSync() {
  const { user } = useAuth();
  const { setUserId } = useApp();
  useEffect(() => {
    setUserId(user?.id || null);
  }, [user?.id, setUserId]);
  return null;
}

function ProfileSync() {
  const { user } = useAuth();
  const { setProfile, profile } = useApp();
  
  useEffect(() => {
    if (!user?.id || !UUID_PATTERN.test(user.id) || profile.profileComplete) return;

    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data && (data as any).profile_complete) {
          setProfile({
            name: (data as any).name || "",
            familyStatus: (data as any).family_status || "",
            childrenCount: (data as any).children_count || 0,
            childrenAges: (data as any).children_ages || [],
            childrenNames: (data as any).children_names || [],
            childrenHealthNeeds: (data as any).children_health_needs || [],
            monthlyIncome: Number((data as any).monthly_income) || 0,
            businessDividends: Number((data as any).business_dividends) || 0,
            passiveIncome: Number((data as any).passive_income) || 0,
            recurringSupport: Number((data as any).recurring_support) || 0,
            yearlyBonus: Number((data as any).yearly_bonus) || 0,
            oneTimeIncome: Number((data as any).one_time_income) || 0,
            livingStandard: (data as any).living_standard || "בינוני",
            healthFund: (data as any).health_fund || "",
            specialHealthNeeds: (data as any).special_health_needs || "",
            residentialStatus: (data as any).residential_status || "renter",
            mortgageMonthly: Number((data as any).mortgage_monthly) || 0,
            rentAmount: Number((data as any).rent_amount) || 0,
            carType: (data as any).car_type || "",
            carYear: (data as any).car_year || 0,
            realEstateAssets: (data as any).real_estate_assets || "",
            loans: (data as any).loans || [],
            creditCardDebt: Number((data as any).credit_card_debt) || 0,
            familyFinancialHelp: (data as any).family_financial_help || false,
            familyHelpAmount: Number((data as any).family_help_amount) || 0,
            sector: (data as any).sector || "",
            city: (data as any).city || "",
            dailyExpenses: Number((data as any).daily_expenses) || 0,
            weeklyExpenses: Number((data as any).weekly_expenses) || 0,
            monthlyFixedExpenses: Number((data as any).monthly_fixed_expenses) || 0,
            yearlyFixedExpenses: Number((data as any).yearly_fixed_expenses) || 0,
            profileComplete: true,
          });
      }
    });
  }, [user?.id, profile.profileComplete, setProfile]);
  
  return null;
}

function AuthCallback() {
  const { isAuthenticated, isAdmin, isNewUser, loading } = useAuth();
  const location = useLocation();
  const consumedNextRef = useRef<string | null>(null);

  if (consumedNextRef.current === null) {
    consumedNextRef.current = consumeStoredOAuthNextPath();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">מסיים התחברות...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    const next = new URLSearchParams(location.search).get("next") || "/";
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  const requestedNext = sanitizeAuthNextPath(new URLSearchParams(location.search).get("next"));
  const safeNext = requestedNext ?? consumedNextRef.current;

  if (!safeNext && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  if (safeNext === "/admin" && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  if (isNewUser) {
    return <Navigate to="/" replace />;
  }

  return <Navigate to={safeNext && (safeNext !== "/admin" || isAdmin) ? safeNext : "/"} replace />;
}

function PublicAuthScreen({ defaultRegister = false }: { defaultRegister?: boolean }) {
  const navigate = useNavigate();

  return (
    <LoginPage
      onBack={() => navigate("/")}
      defaultRegister={defaultRegister}
    />
  );
}

function AuthGate() {
  const { isAuthenticated, isAdmin, isNewUser, completeOnboarding, loading } = useAuth();
  const { profile } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const requestedNext = sanitizeAuthNextPath(new URLSearchParams(location.search).get("next"));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl gold-gradient mx-auto flex items-center justify-center animate-pulse">
            <span className="text-2xl">✨</span>
          </div>
          <p className="text-sm text-muted-foreground">טוען...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage onGetStarted={() => navigate("/login")} />} />
        <Route path="/login" element={<PublicAuthScreen />} />
        <Route path="/register" element={<PublicAuthScreen defaultRegister />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/admin-portal" element={<Navigate to="/login?next=%2Fadmin" replace />} />
        <Route path="/admin/*" element={<Navigate to="/login?next=%2Fadmin" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  if (!isAdmin && !isNewUser && profile.profileComplete && location.pathname === "/" && requestedNext && requestedNext !== "/") {
    return <Navigate to={requestedNext} replace />;
  }

  if (!isAdmin && isNewUser) {
    return <OnboardingWizard onComplete={completeOnboarding} />;
  }

  if (isAdmin && location.pathname === "/") {
    return <Navigate to="/admin" replace />;
  }

  if (isAdmin && location.pathname === "/admin-portal") {
    return <Navigate to="/admin" replace />;
  }

  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/login" element={<Navigate to={requestedNext && (requestedNext !== "/admin" || isAdmin) ? requestedNext : isAdmin ? "/admin" : "/"} replace />} />
      <Route path="/register" element={<Navigate to={requestedNext && (requestedNext !== "/admin" || isAdmin) ? requestedNext : isAdmin ? "/admin" : "/"} replace />} />
      <Route path="/admin-portal" element={isAdmin ? <Navigate to="/admin" replace /> : <NotAuthorized />} />
      <Route path="/admin/*" element={isAdmin ? <AdminLayout /> : <NotAuthorized />} />
      <Route path="/*" element={
        <SidebarProvider>
          <AppLayout />
        </SidebarProvider>
      } />
    </Routes>
  );
}

function NotAuthorized() {
  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-2xl font-bold text-foreground mb-2">⛔ אין הרשאה</p>
        <p className="text-muted-foreground">אין לך הרשאת מנהל לצפות בעמוד זה.</p>
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <AppProvider>
          <UserIdSync />
          <ProfileSync />
          <FinancialProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthGate />
            </BrowserRouter>
          </FinancialProvider>
        </AppProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
