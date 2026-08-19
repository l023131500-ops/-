import { useEffect } from "react";
import { Switch, Route, Router, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import RightsPage from "@/pages/rights";
import RightDetail from "@/pages/right-detail";
import OrgsPage from "@/pages/orgs";
import OrgDetail from "@/pages/org-detail";
import MatchPage from "@/pages/match";
import IntegrationsPage from "@/pages/integrations";
import ServiceFormPage from "@/pages/service-form";
import SubmissionsPage from "@/pages/submissions";
import FinancialPage from "@/pages/financial";
import AutomationsPage from "@/pages/automations";
import TermsPage from "@/pages/terms";
import AdminLoginPage from "@/pages/admin-login";
import UsersPage from "@/pages/users";
import DeliveryPage from "@/pages/delivery";
import Shell from "@/components/shell";
import { AdminAuthProvider, useAdminAuth } from "@/lib/admin-auth";
import { UserAuthProvider } from "@/lib/user-auth";
import UserLoginPage from "@/pages/user-login";
import MePage from "@/pages/me";
import WebhookLogPage from "@/pages/webhook-log";
import PremiumRequestsPage from "@/pages/premium-requests";
import DbStatusPage from "@/pages/db-status";
import AdminDocsPage from "@/pages/admin-docs";
import RemindersPage from "@/pages/reminders";
import PublicLanding from "@/pages/public-landing";
import PublicEligibility from "@/pages/public-eligibility";
import PublicTopic from "@/pages/public-topic";
import PublicFinancial from "@/pages/public-financial";
import PublicReminder from "@/pages/public-reminder";
import AdvancedMatchPage from "@/pages/advanced-match";
import GeneralInquiryPage from "@/pages/general-inquiry";
import PublicChatbot from "@/components/public-chatbot";
import ChatbotAdminPage from "@/pages/chatbot-admin";
import PublicPotential from "@/pages/public-potential";
import PotentialAdminPage from "@/pages/potential-admin";
import ParamsTopicsPage from "@/pages/params-topics";
import ApiAccessPage from "@/pages/api-access";
import FinancialCrmPage from "@/pages/financial-crm";
import PublicPriceComparison from "@/pages/public-price-comparison";
import PublicProductCompare from "@/pages/public-product-compare";
import PriceComparisonAdmin from "@/pages/price-comparison-admin";
import PublicCommunity from "@/pages/public-community";
import CommunityAdmin from "@/pages/community-admin";
import PublicHealthFunds from "@/pages/public-health-funds";
import HealthFundServicePage from "@/pages/health-fund-service";
import HealthFundsAdmin from "@/pages/health-funds-admin";
import VoluntarySubmitPage from "@/pages/voluntary-submit";

function isAdminSubdomain(): boolean {
  return typeof window !== "undefined" && window.location.hostname.startsWith("admin.");
}

function isPublicPath(loc: string): boolean {
  if (loc === "/") return true;
  if (loc === "/eligibility") return true;
  if (loc === "/potential") return true;
  if (loc.startsWith("/potential/")) return true;
  if (loc.startsWith("/p/topic/")) return true;
  if (loc === "/p/financial") return true;
  if (loc.startsWith("/service/")) return true;
  if (loc.startsWith("/r/")) return true;
  if (loc === "/terms") return true;
  if (loc === "/price-comparison") return true;
  if (loc.startsWith("/compare/")) return true;
  if (loc === "/health-funds") return true;
  if (loc.startsWith("/health-fund-service/")) return true;
  if (loc.startsWith("/community/")) return true;
  if (loc.startsWith("/submit/")) return true;
  return false;
}

// Routes that render *inside* Shell but do not themselves require admin auth.
// (Login pages must be reachable without a token, terms is a public legal doc,
// user-login/me are end-user only — not admin internal.)
function isInternalPublicRoute(loc: string): boolean {
  return loc === "/login" || loc === "/user-login" || loc === "/me" || loc === "/terms";
}

function InternalArea() {
  const [loc, setLoc] = useLocation();
  const { isAuthed, loading } = useAdminAuth();
  const allowed = isInternalPublicRoute(loc);

  // Anything inside Shell that isn't the login screens, terms, or end-user
  // pages requires an authenticated admin session. We redirect — never
  // render the internal page contents — to make sure the rights database
  // and dashboards are not exposed to unauthenticated users.
  useEffect(() => {
    if (loading) return;
    if (allowed) return;
    if (!isAuthed) {
      setLoc("/login");
    }
  }, [allowed, isAuthed, loading, setLoc]);

  if (!allowed && !isAuthed) {
    return (
      <Shell>
        <div className="py-20 text-center text-sm text-muted-foreground" data-testid="auth-redirecting">
          {loading ? "מאמת הרשאה..." : "ההרשמה נדרשת — מעביר למסך כניסה..."}
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <Switch>
        <Route path="/admin" component={Dashboard} />
        <Route path="/login" component={AdminLoginPage} />
        <Route path="/match" component={MatchPage} />
        <Route path="/advanced-match" component={AdvancedMatchPage} />
        <Route path="/general-inquiry" component={GeneralInquiryPage} />
        <Route path="/integrations" component={IntegrationsPage} />
        <Route path="/submissions" component={SubmissionsPage} />
        <Route path="/rights" component={RightsPage} />
        <Route path="/rights/:id" component={RightDetail} />
        <Route path="/orgs" component={OrgsPage} />
        <Route path="/orgs/:id" component={OrgDetail} />
        <Route path="/users" component={UsersPage} />
        <Route path="/delivery" component={DeliveryPage} />
        <Route path="/financial" component={FinancialPage} />
        <Route path="/automations" component={AutomationsPage} />
        <Route path="/webhook-log" component={WebhookLogPage} />
        <Route path="/premium-requests" component={PremiumRequestsPage} />
        <Route path="/db-status" component={DbStatusPage} />
        <Route path="/admin-docs" component={AdminDocsPage} />
        <Route path="/reminders" component={RemindersPage} />
        <Route path="/chatbot" component={ChatbotAdminPage} />
        <Route path="/potential-admin" component={PotentialAdminPage} />
        <Route path="/params-topics" component={ParamsTopicsPage} />
        <Route path="/api-access" component={ApiAccessPage} />
        <Route path="/financial-crm" component={FinancialCrmPage} />
        <Route path="/financial-crm/:clientId" component={FinancialCrmPage} />
        <Route path="/price-comparison-admin" component={PriceComparisonAdmin} />
        <Route path="/health-funds-admin" component={HealthFundsAdmin} />
        <Route path="/community-questionnaires" component={CommunityAdmin} />
        <Route path="/user-login" component={UserLoginPage} />
        <Route path="/me" component={MePage} />
        <Route path="/terms" component={TermsPage} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function AppRouter() {
  const [loc] = useLocation();

  // Public site (no internal Shell, no nav back to rights database).
  if (isPublicPath(loc)) {
    // Dedicated price-comparison deployment: on the bkalut-prices host the
    // homepage IS the price-comparison page (static hosts have no SPA fallback,
    // so a direct-URL landing must resolve at "/"). All other hosts (incl.
    // Rivka's benefits portal) are unaffected and keep the rights landing.
    // VITE_PRICE_HOME=1 pins the same behaviour for path-based deployments
    // (e.g. more30.com/mechiron), where the hostname carries no signal.
    const isPriceHost =
      import.meta.env.VITE_PRICE_HOME === "1" ||
      (typeof window !== "undefined" &&
        /(^|\.)bkalut-prices\./.test(window.location.hostname));
    return (
      <div className="min-h-screen" dir="rtl">
        <Switch>
          <Route path="/" component={isPriceHost ? PublicPriceComparison : PublicLanding} />
          <Route path="/eligibility" component={PublicEligibility} />
          <Route path="/potential" component={PublicPotential} />
          <Route path="/potential/:slug" component={PublicPotential} />
          <Route path="/p/topic/:id" component={PublicTopic} />
          <Route path="/p/financial" component={PublicFinancial} />
          <Route path="/service/:id" component={ServiceFormPage} />
          <Route path="/r/:id" component={PublicReminder} />
          <Route path="/price-comparison" component={PublicPriceComparison} />
          <Route path="/compare/:barcode" component={PublicProductCompare} />
          <Route path="/health-funds" component={PublicHealthFunds} />
          <Route path="/health-fund-service/:id" component={HealthFundServicePage} />
          <Route path="/community/:slug" component={PublicCommunity} />
          <Route path="/submit/:token" component={VoluntarySubmitPage} />
          <Route path="/terms" component={TermsPage} />
          <Route component={NotFound} />
        </Switch>
        {/* Floating chatbot — admin-toggle gated, hidden by default. */}
        <PublicChatbot />
      </div>
    );
  }

  // Internal/admin app — auth-gated, uses Shell with full navigation.
  if (!isAdminSubdomain() && loc !== "/user-login" && loc !== "/me" && loc !== "/terms") {
    return <NotFound />;
  }
  return <InternalArea />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminAuthProvider>
        <UserAuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router hook={useHashLocation}>
              <AppRouter />
            </Router>
          </TooltipProvider>
        </UserAuthProvider>
      </AdminAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
