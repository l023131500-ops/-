import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Users, Network, Shield, CreditCard, ListChecks, Webhook, FileText } from "lucide-react";
import { RoleLayout, type NavItem } from "@/components/layouts/RoleLayout";
import { supabase } from "@/integrations/supabase/client";

const adminNav: NavItem[] = [
  { title: "ניהול לקוחות", to: "/admin/clients", icon: Users },
  { title: "רשת שותפים", to: "/admin/partners", icon: Network },
  { title: "יומן משימות", to: "/admin/tasks", icon: ListChecks },
  { title: "ניהול תוכן ונושאים", to: "/admin/content", icon: FileText },
  { title: "הגדרת הרשאות וחשיפה", to: "/admin/access", icon: Shield },
  { title: "יומן עסקאות וסליקה", to: "/admin/transactions", icon: CreditCard },
  { title: "אינטגרציות ו-Webhooks", to: "/admin/integrations", icon: Webhook },
];

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userRes.user.id);
    const set = new Set((roles ?? []).map((r) => r.role));
    if (!set.has("admin")) {
      if (set.has("partner")) throw redirect({ to: "/partner" });
      throw redirect({ to: "/client" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <RoleLayout items={adminNav} brandLabel="מערכת מנהל על">
      <Outlet />
    </RoleLayout>
  );
}
