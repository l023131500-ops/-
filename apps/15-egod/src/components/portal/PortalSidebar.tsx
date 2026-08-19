import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, Calendar, Users, FileText, Settings, LogOut, BookOpen, MessageSquare, ShieldCheck, Building2, Mail, ClipboardCheck
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const baseItems = [
  { icon: LayoutDashboard, label: "לוח בקרה", path: "/portal" },
];
const commonTail = [
  { icon: MessageSquare, label: "פורומים", path: "/portal/forums" },
  { icon: Mail, label: "פניות", path: "/portal/messages" },
  { icon: FileText, label: "חומרי עזר", path: "/portal/materials" },
  { icon: Settings, label: "הגדרות", path: "/portal/settings" },
];

const menuByType: Record<string, { icon: any; label: string; path: string }[]> = {
  rabbi: [
    { icon: BookOpen, label: "השיעורים שלי", path: "/portal/lessons" },
    { icon: Calendar, label: "הספק לימודי", path: "/portal/schedule" },
    { icon: Users, label: "משתתפים", path: "/portal/participants" },
    { icon: ClipboardCheck, label: "מעקב נוכחות", path: "/portal/attendance" },
  ],
  synagogue: [
    { icon: Building2, label: "בית הכנסת", path: "/portal/prayer-times" },
    { icon: BookOpen, label: "שיעורים בבית הכנסת", path: "/portal/lessons" },
    { icon: Calendar, label: "לוח שיעורים", path: "/portal/schedule" },
    { icon: Users, label: "מתפללים", path: "/portal/participants" },
    { icon: ClipboardCheck, label: "מעקב נוכחות", path: "/portal/attendance" },
  ],
  organization: [
    { icon: Users, label: "מגידי השיעור שלנו", path: "/portal/participants" },
    { icon: BookOpen, label: "שיעורי הארגון", path: "/portal/lessons" },
    { icon: Calendar, label: "לוח פעילות", path: "/portal/schedule" },
    { icon: Building2, label: "בתי הכנסת המשויכים", path: "/portal/prayer-times" },
  ],
};

const PortalSidebar = () => {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const { isAdmin } = useRole();
  const [portalType, setPortalType] = useState<string>("rabbi");
  const [orgName, setOrgName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("portal_type, organization_name").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data?.portal_type) setPortalType(data.portal_type);
        if (data?.organization_name) setOrgName(data.organization_name);
      });
  }, [user]);

  const menuItems = [...baseItems, ...(menuByType[portalType] || menuByType.rabbi), ...commonTail];
  const portalLabel = portalType === "synagogue" ? "פורטל בית הכנסת" : portalType === "organization" ? "פורטל הארגון" : "פורטל מגיד השיעור";

  return (
    <aside className="w-64 min-h-screen bg-sidebar text-sidebar-foreground flex flex-col border-l border-sidebar-border">
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <Link to="/portal" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-sidebar-primary-foreground" />
          </div>
          <div>
            <p className="font-heading font-bold text-sm">{portalLabel}</p>
            <p className="text-xs text-sidebar-foreground/60">{orgName || user?.email}</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="p-3 border-t border-sidebar-border">
        {isAdmin && (
          <Link to="/admin">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 mb-1"
            >
              <ShieldCheck className="w-5 h-5" />
              ממשק ניהול
            </Button>
          </Link>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          onClick={signOut}
        >
          <LogOut className="w-5 h-5" />
          התנתק
        </Button>
      </div>
    </aside>
  );
};

export default PortalSidebar;