import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import TeachersLanding from "./pages/TeachersLanding";
import FindLesson from "./pages/FindLesson";
import UpdateLesson from "./pages/UpdateLesson";
import RequestLesson from "./pages/RequestLesson";
import LessonDirectory from "./pages/LessonDirectory";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import NedarimManagement from "./pages/NedarimManagement";
import IvrBuilder from "./pages/IvrBuilder";
import RabbiPortal from "./pages/RabbiPortal";
import OrgPortal from "./pages/OrgPortal";
import PublicRabbiPage from "./pages/PublicRabbiPage";
import PublicOrgPage from "./pages/PublicOrgPage";
import BulkUpload from "./pages/BulkUpload";
import StudyDayUpload from "./pages/StudyDayUpload";
import SynagoguePortal from "./pages/SynagoguePortal";
import PublicSynagoguePage from "./pages/PublicSynagoguePage";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";
import Install from "./pages/Install";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {/* basename must match the vite --base the bundle was built with. The app
          is served at more30.com/mthbram, so without it the router is handed the
          pathname "/mthbram", matches none of the routes below, and renders its
          own 404 — which is exactly what production was doing: assets loaded
          fine, and the page showed "non-existent route: /mthbram". */}
      <BrowserRouter basename="/mthbram">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/teachers" element={<TeachersLanding />} />
          <Route path="/find-lesson" element={<FindLesson />} />
          <Route path="/update-lesson" element={<UpdateLesson />} />
          <Route path="/request-lesson" element={<RequestLesson />} />
          <Route path="/lessons" element={<LessonDirectory />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/nedarim" element={<ProtectedRoute><NedarimManagement /></ProtectedRoute>} />
          <Route path="/admin/ivr" element={<ProtectedRoute><IvrBuilder /></ProtectedRoute>} />
          <Route path="/portal/rabbi/:token" element={<RabbiPortal />} />
          <Route path="/portal/org/:token" element={<OrgPortal />} />
          <Route path="/view/rabbi/:publicToken" element={<PublicRabbiPage />} />
          <Route path="/view/org/:publicToken" element={<PublicOrgPage />} />
          <Route path="/bulk-upload/:token" element={<BulkUpload />} />
          <Route path="/study-days/:token" element={<StudyDayUpload />} />
          <Route path="/shul/:accessToken" element={<SynagoguePortal />} />
          <Route path="/view/shul/:publicToken" element={<PublicSynagoguePage />} />
          <Route path="/install" element={<Install />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
