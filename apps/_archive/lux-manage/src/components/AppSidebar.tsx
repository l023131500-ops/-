import {
  LayoutDashboard, User, Receipt, PartyPopper, Activity, Settings, Home, Building2,
  CalendarDays, Users, MessageCircle, Shield, LogOut, Crown, FileText, BarChart3, Briefcase, Calendar, Zap,
  GraduationCap, Code2, FolderKanban
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeEnabledModules } from "@/lib/modules";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

const householdNav = [
  { titleKey: "dashboard", label: "לוח בקרה", url: "/", icon: LayoutDashboard },
  { titleKey: "quick_entry", label: "הזנה מהירה", url: "/quick-entry", icon: Zap },
  { titleKey: "profile", label: "פרופיל אישי", url: "/profile", icon: User },
  { titleKey: "financial_setup", label: "ניהול תקציב", url: "/financial-setup", icon: Receipt },
  { titleKey: "calendar", label: "יומן ותזכורות", url: "/calendar", icon: Calendar },
  { titleKey: "timeline", label: "משימות פעילות", url: "/timeline", icon: CalendarDays },
  { titleKey: "expenses", label: "מעקב הוצאות", url: "/expenses", icon: Receipt },
  { titleKey: "family_future", label: "תכנון עתידי", url: "/family-future", icon: PartyPopper },
  { titleKey: "suppliers", label: "ספקים ונותני שירות", url: "/suppliers", icon: Users },
  { titleKey: "financial_health", label: "סקירה כלכלית", url: "/financial-health", icon: Activity },
  { titleKey: "benefits", label: "זכויות והטבות", url: "/benefits", icon: Shield },
  { titleKey: "academy", label: "מרכז ידע", url: "/academy", icon: GraduationCap },
  { titleKey: "expert_chat", label: "דברו איתנו", url: "/expert-chat", icon: MessageCircle },
  { titleKey: "projects", label: "פרויקטים ואירועים", url: "/projects", icon: FolderKanban },
];

const businessNav = [
  { titleKey: "dashboard", label: "לוח בקרה", url: "/", icon: LayoutDashboard },
  { titleKey: "quick_entry", label: "הזנה מהירה", url: "/quick-entry", icon: Zap },
  { titleKey: "profile", label: "פרופיל עסקי", url: "/profile", icon: Briefcase },
  { titleKey: "calendar", label: "יומן עסקי", url: "/calendar", icon: Calendar },
  { titleKey: "expenses", label: "הוצאות עסקיות", url: "/expenses", icon: Receipt },
  { titleKey: "suppliers", label: "ספקים", url: "/suppliers", icon: Users },
  { titleKey: "invoices", label: "חשבוניות", url: "/invoices", icon: FileText },
  { titleKey: "reports", label: "דוחות", url: "/reports", icon: BarChart3 },
  { titleKey: "financial_health", label: "סקירה כלכלית", url: "/financial-health", icon: Activity },
  { titleKey: "academy", label: "מרכז צמיחה", url: "/academy", icon: GraduationCap },
  { titleKey: "expert_chat", label: "ייעוץ עסקי", url: "/expert-chat", icon: MessageCircle },
  { titleKey: "projects", label: "פרויקטים", url: "/projects", icon: FolderKanban },
];

export function AppSidebar() {
  const { mode, setMode, language, setLanguage, t } = useApp();
  const { user, logout, isAdmin } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const [enabledModules, setEnabledModules] = useState<string[] | null>(null);
  const [businessEnabled, setBusinessEnabled] = useState(false);

  useEffect(() => {
    if (!user) {
      setEnabledModules(null);
      setBusinessEnabled(false);
      return;
    }
    supabase.from("profiles").select("enabled_modules, business_enabled").eq("id", user.id).single().then(({ data }) => {
      if (data) {
        if ((data as any).enabled_modules) {
          setEnabledModules(normalizeEnabledModules((data as any).enabled_modules as string[]));
        }
        setBusinessEnabled(!!(data as any).business_enabled);
      }
    });
  }, [user]);

  const isBusiness = mode === "business";
  const allNav = isBusiness ? businessNav : householdNav;
  const navItems = enabledModules
    ? allNav.filter(n => ["dashboard", "profile"].includes(n.titleKey) || enabledModules.includes(n.titleKey))
    : allNav;
  const canBusiness = businessEnabled;

  return (
    <Sidebar collapsible="icon" side="right" className="border-sidebar-border">
      <SidebarContent className={`${isBusiness ? "sidebar-gradient-business" : "sidebar-gradient"}`}>
        {/* Logo */}
        <div className="px-5 py-8 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${isBusiness ? "business-gradient" : "gold-gradient"}`}>
            <span className="text-sm font-black text-white">
              {isBusiness ? "BZ" : "EF"}
            </span>
          </div>
          {!collapsed && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-lg font-bold text-sidebar-accent-foreground tracking-tight">
              {isBusiness ? "FinanceHub Pro" : "FinanceHub"}
            </motion.span>
          )}
        </div>

        {/* Mode Toggle */}
        {!collapsed && (
          <div className="px-4 mb-6">
            <div className="flex rounded-2xl bg-sidebar-accent/60 p-1 gap-1">
              <button onClick={() => setMode("household")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all duration-400 ${
                  !isBusiness ? "gold-gradient text-white shadow-md" : "text-sidebar-foreground hover:text-sidebar-accent-foreground"
                }`}>
                <Home className="w-3.5 h-3.5" />
                בית
              </button>
              <button onClick={() => {
                  if (!canBusiness) return;
                  setMode("business");
                  navigate("/");
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all duration-400 ${
                  isBusiness ? "business-gradient text-white shadow-md"
                    : canBusiness ? "text-sidebar-foreground hover:text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/30 cursor-not-allowed"
                }`}
                title={!canBusiness ? "לא רשום לשירות העסקי" : ""}>
                <Building2 className="w-3.5 h-3.5" />
                עסקי
                {!canBusiness && <Crown className="w-3 h-3 text-accent/50" />}
              </button>
            </div>
          </div>
        )}

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/30 uppercase text-[9px] tracking-[0.2em] font-bold px-5">
            {!collapsed && (isBusiness ? "ניהול עסקי" : "ניהול ביתי")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((navItem) => (
                <SidebarMenuItem key={navItem.titleKey + navItem.url}>
                  <SidebarMenuButton asChild>
                    <NavLink to={navItem.url} end={navItem.url === "/"}
                      className="text-sidebar-foreground/70 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50 transition-all duration-300 rounded-xl mx-2"
                      activeClassName={`bg-sidebar-accent font-bold border-s-2 ${isBusiness ? "text-indigo border-indigo" : "text-sidebar-primary border-sidebar-primary"}`}>
                      <navItem.icon className="w-[18px] h-[18px] me-3 shrink-0" strokeWidth={1.5} />
                      {!collapsed && <span className="text-[13px]">{navItem.label}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className={`${isBusiness ? "sidebar-gradient-business" : "sidebar-gradient"} border-t border-sidebar-border`}>
        {!collapsed && user && (
          <div className="px-4 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sidebar-accent flex items-center justify-center text-[11px] font-bold text-sidebar-accent-foreground">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-sidebar-accent-foreground truncate">{user.name}</p>
              <p className="text-[10px] text-sidebar-foreground/40">
                {user.email}
              </p>
            </div>
          </div>
        )}

        <SidebarMenu>
          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => navigate("/admin")} className="text-sidebar-foreground/60 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50 mx-2 rounded-xl">
                <Shield className="w-[18px] h-[18px] me-3 shrink-0 text-destructive/70" strokeWidth={1.5} />
                {!collapsed && <span className="text-destructive/70 text-[13px]">ניהול מערכת</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink to="/api-docs" className="text-sidebar-foreground/60 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50 mx-2 rounded-xl" activeClassName="text-sidebar-primary">
                  <Code2 className="w-[18px] h-[18px] me-3 shrink-0" strokeWidth={1.5} />
                  {!collapsed && <span className="text-[13px]">כלי API</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink to="/settings" className="text-sidebar-foreground/60 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50 mx-2 rounded-xl" activeClassName="text-sidebar-primary">
                <Settings className="w-[18px] h-[18px] me-3 shrink-0" strokeWidth={1.5} />
                {!collapsed && <span className="text-[13px]">{t("settings")}</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={logout} className="text-sidebar-foreground/60 hover:text-destructive/80 hover:bg-destructive/10 mx-2 rounded-xl">
              <LogOut className="w-[18px] h-[18px] me-3 shrink-0" strokeWidth={1.5} />
              {!collapsed && <span className="text-[13px]">התנתק</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
