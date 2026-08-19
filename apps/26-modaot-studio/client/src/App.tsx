import { lazy, Suspense } from "react";
import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import { TemplateProvider } from "@/lib/templateContext";

/*
  כל שבעת המסכים היו מיובאים ישירות, ולכן ישבו בקובץ אחד של **1,192KB**.
  מי שפתח את more30.com/studio — עמוד נחיתה עם 762 תווים ושמונה כפתורים —
  הוריד איתו את העורך המלא (41KB מקור), את הבריף, את מחלקת המיתוג ואת
  ‎html2canvas‎. נמדד: ‎bootup-time‎ 4.4 שניות, ‎unused-javascript‎ 267KB.

  ‎Home‎ נשאר ישיר; הוא מה שמצטייר. ‎NotFound‎ נשאר ישיר כי הוא זעיר ובדיוק
  במסלול שבו הבאת קובץ נוסף היא הדבר הגרוע ביותר.
*/
const Editor = lazy(() => import("@/pages/Editor"));
const Projects = lazy(() => import("@/pages/Projects"));
const Studio = lazy(() => import("@/pages/Studio"));
const Brief = lazy(() => import("@/pages/Brief"));
const BrandingHome = lazy(() => import("@/pages/BrandingHome"));
const BrandingBrief = lazy(() => import("@/pages/BrandingBrief"));
const BrandKitPage = lazy(() => import("@/pages/BrandKitPage"));

function ScreenFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B1220] text-[#F5EEDD]/70">
      טוען…
    </div>
  );
}

function AppRouter() {
  return (
    <Suspense fallback={<ScreenFallback />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/editor" component={Editor} />
        <Route path="/projects" component={Projects} />
        <Route path="/studio" component={Studio} />
        <Route path="/brief" component={Brief} />
        <Route path="/branding" component={BrandingHome} />
        <Route path="/branding/brief" component={BrandingBrief} />
        <Route path="/branding/:id" component={BrandKitPage} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <TemplateProvider>
          <Router hook={useHashLocation}>
            <AppRouter />
          </Router>
        </TemplateProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
