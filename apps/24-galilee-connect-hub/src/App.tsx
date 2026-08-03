import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import GabaiPortal from "./pages/GabaiPortal";
import ContactPage from "./pages/ContactPage";
import ReligiousInfoPage from "./pages/ReligiousInfoPage";
import SynagoguePage from "./pages/SynagoguePage";
import AllSynagoguesPage from "./pages/AllSynagoguesPage";
import KashrutPage from "./pages/KashrutPage";
import MikvaotPage from "./pages/MikvaotPage";
import HalachaPage from "./pages/HalachaPage";
import NewsletterPage from "./pages/NewsletterPage";
import MourningGuidePage from "./pages/MourningGuidePage";
import NotFound from "./pages/NotFound";
import ChatBot from "./components/ChatBot";
import Navbar from "./components/Navbar";

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
        <ChatBot />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
