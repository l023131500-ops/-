import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { LayoutDashboard, Users, Shield, LogOut, ArrowRight, Settings, HelpCircle, Webhook, GraduationCap, Contact, UserCog, FileSpreadsheet, Scale, Phone } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, SidebarProvider, SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Routes, Route } from "react-router-dom";
import AdminDashboard from "./AdminDashboard";
import AdminClients from "./AdminClients";
import AdminQuestionBuilder from "./AdminQuestionBuilder";
import AdminWebhookTester from "./AdminWebhookTester";
import AdminAcademyManager from "./AdminAcademyManager";
import AdminLeads from "./AdminLeads";
import AdminUserManagement from "./AdminUserManagement";
import AdminDataExport from "./AdminDataExport";
import AdminRightsInquiries from "./AdminRightsInquiries";
import AdminIvrSettings from "./AdminIvrSettings";
import { useNavigate } from "react-router-dom";

const adminNav = [
  { label: "לוח בקרה", url: "/admin", icon: LayoutDashboard },
  { label: "ניהול לקוחות", url: "/admin/clients", icon: Users },
  { label: "ניהול משתמשים", url: "/admin/users", icon: UserCog },
  { label: "ניהול לידים", url: "/admin/leads", icon: Contact },
  { label: "ייצוא נתונים", url: "/admin/export", icon: FileSpreadsheet },
  { label: "פניות זכויות", url: "/admin/rights", icon: Scale },
  { label: "בונה שאלות", url: "/admin/questions", icon: HelpCircle },
  { label: "בודק Webhooks", url: "/admin/webhooks", icon: Webhook },
  { label: "ניהול אקדמיה", url: "/admin/academy", icon: GraduationCap },
  { label: "מערכת קולית (IVR)", url: "/admin/ivr", icon: Phone },
  { label: "הרשאות ותוכניות", url: "/admin/permissions", icon: Shield },
  { label: "הגדרות", url: "/admin/settings", icon: Settings },
];

function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <Sidebar collapsible="icon" side="right" className="border-sidebar-border">
      <SidebarContent className="sidebar-gradient">
        <div className="px-5 py-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-destructive/80 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-lg font-bold text-sidebar-accent-foreground tracking-tight">
              ניהול מערכת
            </motion.span>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/30 uppercase text-[9px] tracking-[0.2em] font-bold px-5">
            {!collapsed && "ניווט"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNav.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === "/admin"}
                      className="text-sidebar-foreground/70 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50 transition-all duration-300 mx-2 rounded-xl"
                      activeClassName="bg-sidebar-accent text-destructive font-bold border-s-2 border-destructive">
                      <item.icon className="w-4 h-4 me-3 shrink-0" strokeWidth={1.5} />
                      {!collapsed && <span className="text-[13px]">{item.label}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="sidebar-gradient border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => navigate("/")} className="text-sidebar-foreground/60 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50 mx-2 rounded-xl">
              <ArrowRight className="w-4 h-4 me-3 shrink-0" strokeWidth={1.5} />
              {!collapsed && <span className="text-[13px]">חזרה לאפליקציה</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={logout} className="text-destructive/70 hover:text-destructive hover:bg-destructive/10 mx-2 rounded-xl">
              <LogOut className="w-4 h-4 me-3 shrink-0" strokeWidth={1.5} />
              {!collapsed && <span className="text-[13px]">התנתק</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function AdminLayout() {
  return (
    <SidebarProvider>
      <div dir="rtl" className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center border-b border-border/30 px-6 glass-card sticky top-0 z-10" style={{ borderRadius: 0 }}>
            <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors duration-300" />
            <div className="flex-1" />
            <span className="text-[10px] font-bold text-destructive/80 bg-destructive/10 px-3 py-1.5 rounded-full tracking-wide">
              מצב מנהל
            </span>
          </header>
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<AdminDashboard />} />
              <Route path="/clients" element={<AdminClients />} />
              <Route path="/users" element={<AdminUserManagement />} />
              <Route path="/leads" element={<AdminLeads />} />
              <Route path="/export" element={<AdminDataExport />} />
              <Route path="/rights" element={<AdminRightsInquiries />} />
              <Route path="/questions" element={<AdminQuestionBuilder />} />
              <Route path="/webhooks" element={<AdminWebhookTester />} />
              <Route path="/academy" element={<AdminAcademyManager />} />
              <Route path="/ivr" element={<AdminIvrSettings />} />
              <Route path="/permissions" element={<AdminPermissions />} />
              <Route path="/settings" element={<AdminSettings />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AdminPermissions() {
  return (
    <div className="p-8 md:p-12 max-w-5xl mx-auto space-y-8">
      <h1 className="text-2xl font-extrabold text-foreground">הרשאות ותוכניות</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bento-card">
          <h3 className="font-bold text-foreground mb-3 flex items-center gap-2"><span className="text-lg">🏠</span> תוכנית סטנדרט</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>✓ ניהול משק בית מלא</li><li>✓ מעקב הוצאות והכנסות</li><li>✓ תכנון אירועים משפחתיים</li><li>✓ זכויות והטבות</li><li>✗ מודול עסקי</li><li>✗ תזכורות SMS/Email</li>
          </ul>
        </div>
        <div className="bento-card border border-accent/20">
          <h3 className="font-bold text-foreground mb-3 flex items-center gap-2"><span className="text-lg">⭐</span> תוכנית פרימיום</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>✓ כל התכונות של סטנדרט</li><li>✓ מודול עסקי מלא</li><li>✓ רווח והפסד + חשבוניות</li><li>✓ ספקים עסקיים</li><li>✓ תזכורות SMS/Email</li><li>✓ ייעוץ מומחה מועדף</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function AdminSettings() {
  return (
    <div className="p-8 md:p-12 max-w-5xl mx-auto space-y-8">
      <h1 className="text-2xl font-extrabold text-foreground">הגדרות מערכת</h1>
      <div className="bento-card">
        <p className="text-muted-foreground text-sm">הגדרות מתקדמות יהיו זמינות בקרוב.</p>
      </div>
    </div>
  );
}
