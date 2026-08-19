import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import FindLesson from "./pages/FindLesson.tsx";
import RequestLesson from "./pages/RequestLesson.tsx";
import About from "./pages/About.tsx";
import Login from "./pages/Login.tsx";
import JoinTeacher from "./pages/JoinTeacher.tsx";
import Dashboard from "./pages/portal/Dashboard.tsx";
import StudySchedule from "./pages/portal/StudySchedule.tsx";
import Participants from "./pages/portal/Participants.tsx";
import Materials from "./pages/portal/Materials.tsx";
import PortalSettings from "./pages/portal/PortalSettings.tsx";
import Forums from "./pages/portal/Forums.tsx";
import Lessons from "./pages/portal/Lessons.tsx";
import PrayerTimes from "./pages/portal/PrayerTimes.tsx";
import Messages from "./pages/portal/Messages.tsx";
import Attendance from "./pages/portal/Attendance.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import AdminTeachers from "./pages/admin/AdminTeachers.tsx";
import AdminLeads from "./pages/admin/AdminLeads.tsx";
import AdminTips from "./pages/admin/AdminTips.tsx";
import AdminContent from "./pages/admin/AdminContent.tsx";
import AdminMessages from "./pages/admin/AdminMessages.tsx";
import AdminForums from "./pages/admin/AdminForums.tsx";
import AdminMatching from "./pages/admin/AdminMatching.tsx";
import AdminRoute from "./components/AdminRoute.tsx";
import Questionnaire from "./pages/Questionnaire.tsx";
import RabbiPublic from "./pages/RabbiPublic.tsx";
import Invite from "./pages/Invite.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    {/* Served from more30.com/egod as well as the site root. Vite's BASE_URL
        carries the mount path into the bundle; the trailing slash has to go,
        because the address is /egod and react-router silently renders null when
        the pathname does not start with the whole basename — which is why this
        route showed the app's own 404 page. */}
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/+$/, "") || "/"}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/find-lesson" element={<FindLesson />} />
            <Route path="/request-lesson" element={<RequestLesson />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
            <Route path="/join" element={<JoinTeacher />} />
            <Route path="/questionnaire" element={<Questionnaire />} />
            <Route path="/invite" element={<Invite />} />
            <Route path="/portal" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/portal/schedule" element={<ProtectedRoute><StudySchedule /></ProtectedRoute>} />
            <Route path="/portal/participants" element={<ProtectedRoute><Participants /></ProtectedRoute>} />
            <Route path="/portal/materials" element={<ProtectedRoute><Materials /></ProtectedRoute>} />
            <Route path="/portal/settings" element={<ProtectedRoute><PortalSettings /></ProtectedRoute>} />
            <Route path="/portal/forums" element={<ProtectedRoute><Forums /></ProtectedRoute>} />
            <Route path="/portal/lessons" element={<ProtectedRoute><Lessons /></ProtectedRoute>} />
            <Route path="/portal/prayer-times" element={<ProtectedRoute><PrayerTimes /></ProtectedRoute>} />
            <Route path="/portal/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/portal/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/teachers" element={<AdminRoute><AdminTeachers /></AdminRoute>} />
            <Route path="/admin/leads" element={<AdminRoute><AdminLeads /></AdminRoute>} />
            <Route path="/admin/tips" element={<AdminRoute><AdminTips /></AdminRoute>} />
            <Route path="/admin/content" element={<AdminRoute><AdminContent /></AdminRoute>} />
            <Route path="/admin/messages" element={<AdminRoute><AdminMessages /></AdminRoute>} />
            <Route path="/admin/forums" element={<AdminRoute><AdminForums /></AdminRoute>} />
            <Route path="/admin/matching" element={<AdminRoute><AdminMatching /></AdminRoute>} />
            <Route path="/rabbi/:id" element={<RabbiPublic />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
