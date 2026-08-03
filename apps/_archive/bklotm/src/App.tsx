import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminLeads from "./pages/AdminLeads";
import AdminLogin from "./pages/AdminLogin";
import AdminSettings from "./pages/AdminSettings";
import AdminRightsReference from "./pages/AdminRightsReference";
import AdminDocuments from "./pages/AdminDocuments";
import AdminTips from "./pages/AdminTips";
import AdminPodcasts from "./pages/AdminPodcasts";
import AdminVideos from "./pages/AdminVideos";
import AdminClientMessages from "./pages/AdminClientMessages";
import ClientIntakeForm from "./pages/ClientIntakeForm";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/leads" element={<AdminLeads />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/rights" element={<AdminRightsReference />} />
          <Route path="/admin/documents" element={<AdminDocuments />} />
          <Route path="/admin/tips" element={<AdminTips />} />
          <Route path="/admin/podcasts" element={<AdminPodcasts />} />
          <Route path="/admin/messages" element={<AdminClientMessages />} />
          <Route path="/admin/videos" element={<AdminVideos />} />
          <Route path="/intake/:rightId" element={<ClientIntakeForm />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
