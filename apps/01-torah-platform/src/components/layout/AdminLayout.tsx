import { Outlet, NavLink, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Building2, Users, Sparkles, MessageSquare, ShoppingCart, BarChart3, Loader2, Lightbulb, MessageCircle, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Navbar } from "./Navbar";

export function AdminLayout() {
  const { user, loading } = useAuth();
  const loc = useLocation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    (async () => {
      const { data } = await supabase.rpc("is_super_admin", { _uid: user.id });
      setIsAdmin(Boolean(data));
    })();
  }, [user]);

  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to={`/auth/sign-in?redirect=${encodeURIComponent(loc.pathname)}`} replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const items = [
    { to: "/admin", icon: LayoutDashboard, label: "סקירה כללית", end: true },
    { to: "/admin/tenants", icon: Building2, label: "ארגונים" },
    { to: "/admin/users", icon: Users, label: "משתמשים" },
    { to: "/admin/matching", icon: Sparkles, label: "התאמת AI" },
    { to: "/admin/leads", icon: MessageSquare, label: "פניות ולידים" },
    { to: "/admin/commerce", icon: ShoppingCart, label: "מסחר ותרומות" },
    { to: "/admin/analytics", icon: BarChart3, label: "ניתוחים" },
    { to: "/admin/tips", icon: Lightbulb, label: "טיפים יומיים" },
    { to: "/admin/forums", icon: MessageCircle, label: "פורומים" },
    { to: "/admin/teacher-features", icon: Settings2, label: "הגדרות מורים" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar />
      <div className="flex-1 flex">
        <aside className="hidden md:block w-60 border-l bg-background">
          <div className="p-4">
            <div className="text-xs text-muted-foreground mb-2">סופר אדמין</div>
            <div className="font-heading text-lg">ניהול מערכת</div>
          </div>
          <nav className="px-2 flex flex-col gap-1">
            {items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={(it as any).end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
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
