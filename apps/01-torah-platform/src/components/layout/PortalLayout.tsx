import { useEffect, useState } from "react";
import { Outlet, NavLink, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTenant, useTenantFeature } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Clock,
  UserCog,
  GraduationCap,
  Bell,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Navbar } from "./Navbar";

const STATUS_LABEL: Record<string, string> = {
  pending: "ממתין לאישור",
  suspended: "מושעה",
  archived: "בארכיון",
};

const STATUS_MESSAGE: Record<string, string> = {
  pending: "החשבון שלך ממתין לאישור מנהל המערכת. תישלח הודעה כאשר הגישה תאושר.",
  suspended: "הגישה לחשבון זה הושעתה. לבירור הסיבה יש לפנות למנהל המערכת.",
  archived: "חשבון זה הועבר לארכיון ואינו פעיל יותר.",
};

/* build_tasks#47: tenants.status ("pending"/"active"/"suspended"/"archived",
 * set by the approve/suspend flow in admin/Tenants.tsx + TenantDetail.tsx) was
 * never actually read anywhere in the app — a pending or suspended tenant's
 * member could sign in and use the full portal exactly like an active
 * tenant's. RLS now blocks all tenant-scoped writes/most reads for a
 * non-active tenant (has_tenant_role, migration 20260831270000), but a signed
 * in member still needs to SEE why the portal isn't working instead of
 * hitting silent permission errors on every screen. */
function TenantStatusBlocked({ status, onSignOut }: { status: string; onSignOut: () => void }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <CardTitle>הגישה לפורטל אינה זמינה</CardTitle>
          <CardDescription>
            סטטוס החשבון: {STATUS_LABEL[status] || status}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {STATUS_MESSAGE[status] || "החשבון אינו פעיל כרגע."}
          </p>
          <Button variant="outline" onClick={onSignOut}>
            התנתקות
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function PortalLayout() {
  const { user, loading, signOut } = useAuth();
  const { tenant, loading: tenantLoading } = useTenant();
  const hasLessons = useTenantFeature("lessons");
  const hasDonations = useTenantFeature("donations");
  const loc = useLocation();

  // Bypass the tenant-status gate for real super admins (verified server-side
  // via the is_super_admin RPC, the same check useSuperAdminGate uses) so an
  // owner can still open a pending/suspended tenant's portal for support.
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  useEffect(() => {
    if (!user) {
      setIsSuperAdmin(false);
      return;
    }
    let alive = true;
    supabase.rpc("is_super_admin", { _uid: user.id }).then(({ data }) => {
      if (alive) setIsSuperAdmin(Boolean(data));
    });
    return () => {
      alive = false;
    };
  }, [user]);

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

  const tenantBlocked = !tenantLoading && !!tenant && tenant.status !== "active";

  // isSuperAdmin === null means the RPC hasn't answered yet — wait rather than
  // flashing the blocked screen at a real super admin for a split second.
  if (tenantBlocked && isSuperAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (tenantBlocked && !isSuperAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/30">
        <Navbar />
        <div className="flex-1 flex">
          <main className="flex-1 p-4 md:p-8">
            <TenantStatusBlocked status={tenant!.status} onSignOut={signOut} />
          </main>
        </div>
      </div>
    );
  }

  // religious_council (architecture.md §5.2 "מועצה דתית") is the only tenant
  // type with its own dedicated region screens -- these routes+pages have
  // existed and been RLS-verified since earlier rounds, but were never added
  // here, so a council tenant had no way to reach them from the real nav.
  // "זמני תפילות" (architecture.md §5.2 "זמני תפילות מצרפיים מכל בתי הכנסת"):
  // pages/portal/PrayerTimes.tsx already reads/writes prayer_times for every
  // synagogues row scoped to tenant.id -- for a council tenant that is every
  // synagogue in its region, i.e. exactly the "aggregated from all synagogues"
  // spec ask -- but the route (App.tsx "prayer-times") was never in this nav.
  const councilItems =
    tenant?.type === "religious_council"
      ? [
          { to: "/portal/synagogues", icon: Building2, label: "בתי כנסת באזור" },
          { to: "/portal/prayer-times", icon: Clock, label: "זמני תפילות" },
          { to: "/portal/community-services", icon: HeartHandshake, label: "שירותי קהילה" },
          { to: "/portal/azkarot", icon: Heart, label: "אזכרות ויארצייט" },
          { to: "/portal/newsletters", icon: Newspaper, label: "ניוזלטר / עלון" },
        ]
      : [];

  // ארגון (architecture.md §5.2 "ארגון": "ניהול בתי כנסת קשורים" +
  // "ניהול מגידי שיעור משויכים לארגון"). synagogues + its RLS
  // (synagogues_tenant_write_*) are not restricted to religious_council --
  // any tenant_admin/moderator/member of the owning tenant may write -- and
  // the /portal/synagogues route+screen were already built+verified for
  // build_tasks#22, but PortalLayout.tsx only ever linked it for
  // religious_council, so the 3 live organization tenants had no nav path to
  // manage their linked synagogues despite the spec listing it for them too.
  // "ניהול מגידי שיעור" was a second, separate spec line for organization --
  // public.teachers had a tenant_id column but zero write RLS and zero screen
  // anywhere (build_tasks#42, migration 20260831260000 added the tenant-scoped
  // read/write RLS this new /portal/teachers screen relies on).
  const orgItems =
    tenant?.type === "organization"
      ? [
          { to: "/portal/synagogues", icon: Building2, label: "בתי כנסת קשורים" },
          { to: "/portal/teachers", icon: GraduationCap, label: "מגידי שיעור" },
        ]
      : [];

  // רב / מורה הוראה (architecture.md §5.2): "שאל את הרב" – ניהול שאלות ותשובות +
  // "הלכה יומית". rabbi_questions RLS already scopes moderator/tenant_admin to
  // their own tenant_id, but only a global super_admin-only screen ever existed
  // (admin/RabbiQuestions.tsx) -- a real rabbi/mori_horaah tenant had no nav
  // path to their own portal/rabbi-questions screen. halacha_daily had the same
  // gap: table + RLS existed since 20260519000002 and a public read-only list
  // (pages/public/HalachaDaily.tsx) already existed, but zero write UI/nav.
  const rabbiItems =
    tenant?.type === "rabbi" || tenant?.type === "mori_horaah"
      ? [
          { to: "/portal/rabbi-questions", icon: MessageCircle, label: "שאל את הרב" },
          { to: "/portal/halacha-daily", icon: ScrollText, label: "הלכה יומית" },
        ]
      : [];

  // pages/portal/Lessons.tsx ("השיעורים שלי") is a personal self-listing screen
  // (scoped to rabbi_user_id, feeds the same public lessons directory the
  // "lessons" tenant feature already gates in Navbar.tsx) -- distinct from the
  // tenant-wide /portal/schedule above. It existed fully built and routed but
  // was never in this nav (and self-wrapped a dead decoy layout -- also fixed).
  const lessonsItems = hasLessons
    ? [{ to: "/portal/lessons", icon: BookOpen, label: "השיעורים שלי" }]
    : [];

  // donation_campaigns (architecture.md §3.2 "donations" + §5.2 org/council
  // fundraising): table + tenant_admin-scoped write RLS (campaigns_write_ins/
  // upd/del) existed since the table was created, and public/DonationPage.tsx
  // already reads a campaign by slug and renders its title/goal/progress bar
  // for /donate/:campaignSlug -- but no screen anywhere ever let a tenant
  // admin create that row, so a named campaign could never exist in practice
  // (build_tasks#48). Gated on the same "donations" tenant_features flag the
  // public /donate nav link already uses.
  const campaignItems = hasDonations
    ? [{ to: "/portal/campaigns", icon: Heart, label: "קמפיינים לתרומה" }]
    : [];

  // announcements (architecture.md §5.2 synagogue "מודעות פנימיות" + council
  // "מודעות לציבור"): table + generic tenant_read/tenant_write RLS existed
  // since 20260519000002 but zero UI anywhere ever referenced it. Unconditional
  // like kashrut/chat/ads below -- not restricted to a single tenant type.
  const items = [
    { to: "/portal", icon: LayoutDashboard, label: "סקירה", end: true },
    { to: "/portal/schedule", icon: Calendar, label: "לוח שיעורים" },
    { to: "/portal/participants", icon: Users, label: "משתתפים" },
    ...lessonsItems,
    ...councilItems,
    ...orgItems,
    ...rabbiItems,
    { to: "/portal/materials", icon: FileText, label: "חומרי לימוד" },
    { to: "/portal/announcements", icon: Bell, label: "מודעות" },
    { to: "/portal/kashrut", icon: BadgeCheck, label: "תעודות כשרות" },
    { to: "/portal/forums", icon: MessageSquare, label: "פורומים" },
    { to: "/portal/chat", icon: MessagesSquare, label: "צ'אט פנימי" },
    { to: "/portal/ads", icon: Megaphone, label: "באנרים ופרסום" },
    { to: "/portal/gallery", icon: ImageIcon, label: "גלריה" },
    { to: "/portal/donations", icon: Heart, label: "תרומות" },
    ...campaignItems,
    { to: "/portal/orders", icon: ShoppingBag, label: "הזמנות" },
    { to: "/portal/messages", icon: Mail, label: "הודעות" },
    { to: "/portal/attendance", icon: CheckSquare, label: "נוכחות" },
    { to: "/portal/tips", icon: Lightbulb, label: "טיפים יומיים" },
    { to: "/portal/bulk-upload", icon: Upload, label: "העלאה מרובה" },
    { to: "/portal/study-schedule", icon: CalendarDays, label: "ימי לימוד" },
    { to: "/portal/settings", icon: Settings, label: "הגדרות" },
    { to: "/portal/portal-settings", icon: UserCog, label: "הגדרות פורטל אישי" },
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
