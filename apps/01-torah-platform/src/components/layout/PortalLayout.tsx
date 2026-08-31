import { Outlet, NavLink, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import {
  LayoutDashboard,
  Calendar,
  Users,
  MessageSquare,
  MessagesSquare,
  FileText,
  Settings,
  Image as ImageIcon,
  BookOpen,
  Heart,
  HeartHandshake,
  ShoppingBag,
  Mail,
  Loader2,
  CheckSquare,
  Lightbulb,
  Upload,
  CalendarDays,
  Building2,
  BadgeCheck,
  Megaphone,
  Newspaper,
  MessageCircle,
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

  // religious_council (architecture.md §5.2 "מועצה דתית") is the only tenant
  // type with its own dedicated region screens -- these routes+pages have
  // existed and been RLS-verified since earlier rounds, but were never added
  // here, so a council tenant had no way to reach them from the real nav.
  const councilItems =
    tenant?.type === "religious_council"
      ? [
          { to: "/portal/synagogues", icon: Building2, label: "בתי כנסת באזור" },
          { to: "/portal/community-services", icon: HeartHandshake, label: "שירותי קהילה" },
          { to: "/portal/azkarot", icon: Heart, label: "אזכרות ויארצייט" },
          { to: "/portal/newsletters", icon: Newspaper, label: "ניוזלטר / עלון" },
        ]
      : [];

  // רב / מורה הוראה (architecture.md §5.2): "שאל את הרב" – ניהול שאלות ותשובות.
  // rabbi_questions RLS already scopes moderator/tenant_admin to their own
  // tenant_id, but only a global super_admin-only screen ever existed
  // (admin/RabbiQuestions.tsx) -- a real rabbi/mori_horaah tenant had no nav
  // path to their own portal/rabbi-questions screen.
  const rabbiItems =
    tenant?.type === "rabbi" || tenant?.type === "mori_horaah"
      ? [{ to: "/portal/rabbi-questions", icon: MessageCircle, label: "שאל את הרב" }]
      : [];

  const items = [
    { to: "/portal", icon: LayoutDashboard, label: "סקירה", end: true },
    { to: "/portal/schedule", icon: Calendar, label: "לוח שיעורים" },
    { to: "/portal/participants", icon: Users, label: "משתתפים" },
    ...councilItems,
    ...rabbiItems,
    { to: "/portal/materials", icon: FileText, label: "חומרי לימוד" },
    { to: "/portal/kashrut", icon: BadgeCheck, label: "תעודות כשרות" },
    { to: "/portal/forums", icon: MessageSquare, label: "פורומים" },
    { to: "/portal/chat", icon: MessagesSquare, label: "צ'אט פנימי" },
    { to: "/portal/ads", icon: Megaphone, label: "באנרים ופרסום" },
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
