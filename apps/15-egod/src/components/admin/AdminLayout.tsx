import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, FileText, Lightbulb, MessageSquare, Settings, LogOut, ShieldCheck, Mail, ArrowLeftRight
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const adminMenu = [
  { icon: LayoutDashboard, label: "סקירה כללית", path: "/admin" },
  { icon: Users, label: "ניהול מגידים", path: "/admin/teachers" },
  { icon: ArrowLeftRight, label: "התאמת שיעורים", path: "/admin/matching" },
  { icon: MessageSquare, label: "ניהול לידים", path: "/admin/leads" },
  { icon: Mail, label: "ניהול פניות", path: "/admin/messages" },
  { icon: MessageSquare, label: "ניהול פורומים", path: "/admin/forums" },
  { icon: Lightbulb, label: "ניהול טיפים", path: "/admin/tips" },
  { icon: FileText, label: "ניהול תכנים", path: "/admin/content" },
];

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-screen bg-background" dir="rtl">
      <aside className="w-64 min-h-screen bg-sidebar text-sidebar-foreground flex flex-col border-l border-sidebar-border">
        <div className="p-4 border-b border-sidebar-border">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-destructive flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-destructive-foreground" />
            </div>
            <div>
              <p className="font-heading font-bold text-sm">ממשק ניהול</p>
              <p className="text-xs text-sidebar-foreground/60">{user?.email}</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {adminMenu.map((item) => {
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

        <div className="p-3 border-t border-sidebar-border space-y-1">
          <Link to="/portal">
            <Button variant="ghost" className="w-full justify-start gap-3 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50">
              <Settings className="w-5 h-5" />
              חזור לפורטל
            </Button>
          </Link>
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
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;