import { useState } from "react";
import { Link, Navigate, NavLink, Outlet } from "react-router-dom";
import { LogOut, Menu, Moon, Sun, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/hooks/useTheme";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

/** Shared guarded portal chrome (sidebar + topbar). Redirects to `loginPath` if signed out. */
export function PortalShell({ title, subtitle, nav, loginPath }: {
  title: string;
  subtitle: string;
  nav: NavItem[];
  loginPath: string;
}) {
  const { user, loading, signOut, isDemo } = useAuth();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">טוען…</div>;
  }
  if (!user) return <Navigate to={loginPath} replace />;

  const navLinks = (
    <nav className="flex flex-col gap-1">
      {nav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )
          }
        >
          <item.icon className="h-5 w-5 shrink-0" aria-hidden />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[260px_1fr]">
      {/* sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen flex-col border-l border-border bg-card p-4 lg:flex">
        <div className="mb-6 px-2">
          <div className="font-display text-lg font-bold text-foreground">{title}</div>
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        </div>
        {navLinks}
        <div className="mt-auto space-y-2 pt-4">
          {isDemo && <div className="rounded-lg bg-gold/10 px-3 py-2 text-center text-xs text-gold">מצב הדגמה</div>}
          <Link to="/" className="block rounded-lg px-3 py-2 text-center text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
            צפייה באתר
          </Link>
          <button onClick={signOut} className="flex w-full items-center justify-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-foreground hover:brightness-95">
            <LogOut className="h-4 w-4" /> יציאה
          </button>
        </div>
      </aside>

      {/* mobile topbar */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
        <button onClick={() => setOpen((v) => !v)} aria-label="תפריט" className="grid h-10 w-10 place-items-center rounded-md">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <span className="font-display font-bold">{title}</span>
        <button onClick={toggle} aria-label="מצב תצוגה" className="grid h-10 w-10 place-items-center rounded-md">
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-b border-border bg-card p-4 lg:hidden">
          {navLinks}
          <button onClick={signOut} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm">
            <LogOut className="h-4 w-4" /> יציאה
          </button>
        </div>
      )}

      <main className="p-5 sm:p-8">
        <Outlet />
      </main>
    </div>
  );
}
