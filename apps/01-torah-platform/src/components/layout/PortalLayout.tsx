import { Outlet, NavLink, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import {
  LayoutDashboard,
  Calendar,
  Users,
  MessageSquare,
  FileText,
  Settings,
  Image as ImageIcon,
  BookOpen,
  Heart,
  ShoppingBag,
  Mail,
  Loader2,
  CheckSquare,
  Lightbulb,
  Upload,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Navbar } from "./Navbar";

export function PortalLayout() {
  const { user, loading } = useAuth();
  const { tenant } = useTenant();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/auth/sign-in?redirect=${encodeURIComponent(loc.pathname)}`} replace />;
  }

  const items = [
    { to: "/portal", icon: LayoutDashboard, label: "סקירה", end: true },
    { to: "/portal/schedule", icon: Calendar, label: "לוח שיעורים" },
    { to: "/portal/participants", icon: Users, label: "משתתפים" },
    { to: "/portal/materials", icon: FileText, label: "חומרי לימוד" },
    { to: "/portal/forums", icon: MessageSquare, label: "פורומים" },
    { to: "/portal/gallery", icon: ImageIcon, label: "גלריה" },
    { to: "/portal/donations", icon: Heart, label: "תרומות" },
    { to: "/portal/orders", icon: ShoppingBag, label: "הזמנות" },
    { to: "/portal/messages", icon: Mail, label: "הודעות" },
    { to: "/portal/attendance", icon: CheckSquare, label: "נוכחות" },
    { to: "/portal/tips", icon: Lightbulb, label: "טיפים יומיים" },
    { to: "/portal/bulk-upload", icon: Upload, label: "העלאה מרובה" },
    { to: "/portal/study-schedule", icon: CalendarDays, label: "ימי לימוד" },
    { to: "/portal/settings", icon: Settings, label: "הגדרות" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar />
      <div className="flex-1 flex">
        <aside className="hidden md:block w-60 border-l bg-background">
          <div className="p-4">
            <div className="text-xs text-muted-foreground mb-2">פורטל ניהול</div>
            <div className="font-heading text-lg">{tenant?.branding?.site_name || tenant?.name}</div>
          </div>
          <nav className="px-2 flex flex-col gap-1">
            {items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={(it as any).end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent text-foreground/80",
                  )
                }
              >
                <it.icon className="h-4 w-4" />
                {it.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
