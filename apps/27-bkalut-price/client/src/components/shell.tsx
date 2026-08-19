import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Logo } from "./logo";
import {
  Menu,
  X,
  LayoutDashboard,
  FileText,
  Building2,
  ClipboardList,
  Cable,
  UsersRound,
  Wallet,
  Workflow,
  ScrollText,
  Inbox,
  UserCog,
  LogIn,
  LogOut,
  Database,
  BookOpen,
  Bell,
  Wand2,
  Mail,
  Sparkles,
  Library,
  Key,
  Briefcase,
  ShoppingCart,
  ClipboardCheck,
  Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminAuth } from "@/lib/admin-auth";

const NAV = [
  { path: "/admin", label: "סקירה", icon: LayoutDashboard, testId: "nav-dashboard" },
  { path: "/match", label: "בדיקת התאמה", icon: ClipboardList, testId: "nav-match" },
  { path: "/advanced-match", label: "חיפוש מתוחכם", icon: Wand2, testId: "nav-advanced-match" },
  { path: "/potential-admin", label: "סורק פוטנציאל", icon: Sparkles, testId: "nav-potential" },
  { path: "/params-topics", label: "מאגר פרמטרים", icon: Library, testId: "nav-params" },
  { path: "/general-inquiry", label: "מייל לפנייה כללית", icon: Mail, testId: "nav-general-inquiry" },
  { path: "/rights", label: "זכויות והטבות", icon: FileText, testId: "nav-rights" },
  { path: "/orgs", label: "עמותות", icon: Building2, testId: "nav-orgs" },
  { path: "/submissions", label: "פניות", icon: UsersRound, testId: "nav-submissions" },
  { path: "/users", label: "משתמשים", icon: UserCog, testId: "nav-users" },
  { path: "/delivery", label: "הודעות", icon: Inbox, testId: "nav-delivery" },
  { path: "/financial", label: "ניהול פיננסי", icon: Wallet, testId: "nav-financial" },
  { path: "/financial-crm", label: "CRM פיננסי", icon: Briefcase, testId: "nav-financial-crm" },
  { path: "/price-comparison-admin", label: "השוואת מחירים", icon: ShoppingCart, testId: "nav-price-comparison" },
  { path: "/health-funds-admin", label: "השוואת קופות חולים", icon: Stethoscope, testId: "nav-health-funds" },
  { path: "/community-questionnaires", label: "שאלוני קהילות", icon: ClipboardCheck, testId: "nav-community" },
  { path: "/premium-requests", label: "בקשות פרימיום", icon: Inbox, testId: "nav-premium" },
  { path: "/reminders", label: "תזכורות לקוחות", icon: Bell, testId: "nav-reminders" },
  { path: "/webhook-log", label: "יומן וובהוקים", icon: Workflow, testId: "nav-webhook-log" },
  { path: "/automations", label: "אוטומציות", icon: Workflow, testId: "nav-automations" },
  { path: "/integrations", label: "API", icon: Cable, testId: "nav-integrations" },
  { path: "/api-access", label: "גישת API", icon: Key, testId: "nav-api-access" },
  { path: "/db-status", label: "סטטוס מסד", icon: Database, testId: "nav-db-status" },
  { path: "/admin-docs", label: "הוראות מערכת", icon: BookOpen, testId: "nav-admin-docs" },
  { path: "/terms", label: "תנאים", icon: ScrollText, testId: "nav-terms" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const [loc, setLoc] = useLocation();
  const [open, setOpen] = useState(false);
  const { isAuthed, session, logout } = useAdminAuth();

  function isActive(path: string) {
    if (path === "/admin") return loc === "/admin";
    return loc.startsWith(path);
  }

  async function handleLogout() {
    await logout();
    setLoc("/login");
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" dir="rtl">
      <header className="border-b border-border bg-sidebar text-sidebar-foreground sticky top-0 z-30">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/admin" data-testid="link-home" className="flex items-center hover-elevate rounded-md px-2 py-1 -mr-2">
            <Logo size={28} />
          </Link>

          <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  data-testid={item.testId}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors hover-elevate",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                      : "text-sidebar-foreground/85",
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-2 text-xs text-sidebar-foreground/60">
            {isAuthed ? (
              <>
                <span className="hidden xl:inline" dir="ltr">{session?.identity}</span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1 px-2 py-1 rounded-md hover-elevate text-[12px]"
                  data-testid="button-logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  התנתקות
                </button>
              </>
            ) : (
              <Link
                href="/login"
                data-testid="nav-login"
                className="flex items-center gap-1 px-2 py-1 rounded-md hover-elevate text-[12px]"
              >
                <LogIn className="w-3.5 h-3.5" />
                כניסה
              </Link>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden hover-elevate p-2 -ml-2 rounded-md"
            aria-label="תפריט"
            data-testid="button-menu-toggle"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {open && (
          <div className="lg:hidden border-t border-sidebar-border bg-sidebar" data-testid="nav-mobile">
            <nav className="px-4 py-2 flex flex-col">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    data-testid={`${item.testId}-mobile`}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 py-3 px-2 rounded-md hover-elevate text-sm",
                      active && "bg-sidebar-accent text-sidebar-accent-foreground font-semibold",
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              <div className="border-t border-sidebar-border mt-2 pt-2">
                {isAuthed ? (
                  <button
                    type="button"
                    onClick={() => { setOpen(false); handleLogout(); }}
                    className="flex items-center gap-3 py-3 px-2 rounded-md hover-elevate text-sm w-full text-right"
                    data-testid="button-logout-mobile"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>התנתקות {session?.identity ? `(${session.identity})` : ""}</span>
                  </button>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 py-3 px-2 rounded-md hover-elevate text-sm"
                    data-testid="nav-login-mobile"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>כניסה למערכת הניהול</span>
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-6 md:py-10">
          {children}
        </div>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        מאגר בקלות · 02-3131500 · l023131500@gmail.com · להבחין תמיד בין זכות לפי חוק לבין אפשרות לפנייה לסיוע
      </footer>
    </div>
  );
}
