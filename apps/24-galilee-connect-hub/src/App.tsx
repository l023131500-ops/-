import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ChatBot from "./components/ChatBot";
import Navbar from "./components/Navbar";

// Route-level code splitting: these pages were all bundled eagerly into a
// single 981KB chunk (Lighthouse: 1.7s scripting / 1.26s TBT on /galil,
// QA/platform/galil-perf-trace-0817), even though a visit only ever needs one.
const Index = lazy(() => import("./pages/Index"));
const GabaiPortal = lazy(() => import("./pages/GabaiPortal"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const ReligiousInfoPage = lazy(() => import("./pages/ReligiousInfoPage"));
const SynagoguePage = lazy(() => import("./pages/SynagoguePage"));
const AllSynagoguesPage = lazy(() => import("./pages/AllSynagoguesPage"));
const KashrutPage = lazy(() => import("./pages/KashrutPage"));
const MikvaotPage = lazy(() => import("./pages/MikvaotPage"));
const HalachaPage = lazy(() => import("./pages/HalachaPage"));
const NewsletterPage = lazy(() => import("./pages/NewsletterPage"));
const MourningGuidePage = lazy(() => import("./pages/MourningGuidePage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {/* basename must match the vite --base the bundle was built with. The app
          is served at more30.com/galil, so without it the router is handed the
          pathname "/galil", matches none of the routes below, and renders its
          own 404 — which is what production was doing: assets loaded fine, and
          the page showed "non-existent route: /galil". */}
      <BrowserRouter basename="/galil">
        <Navbar />
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/synagogue/:id" element={<SynagoguePage />} />
            <Route path="/synagogues" element={<AllSynagoguesPage />} />
            <Route path="/kashrut" element={<KashrutPage />} />
            <Route path="/mikvaot" element={<MikvaotPage />} />
            <Route path="/halacha" element={<HalachaPage />} />
            <Route path="/newsletter" element={<NewsletterPage />} />
            <Route path="/mourning" element={<MourningGuidePage />} />
            <Route path="/gabai" element={<GabaiPortal />} />
            <Route path="/gabai/form/:token" element={<GabaiPortal />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/info" element={<ReligiousInfoPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <ChatBot />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
