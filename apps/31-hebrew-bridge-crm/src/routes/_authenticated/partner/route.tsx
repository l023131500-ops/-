import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Briefcase, MessageSquare, ListChecks } from "lucide-react";
import { RoleLayout, type NavItem } from "@/components/layouts/RoleLayout";
import { supabase } from "@/integrations/supabase/client";

const partnerNav: NavItem[] = [
  { title: "לקוחות בטיפולי", to: "/partner/clients", icon: Briefcase },
  { title: "המשימות שלי", to: "/partner/tasks", icon: ListChecks },
  { title: "משובים ועדכונים", to: "/partner/feedbacks", icon: MessageSquare },
];

export const Route = createFileRoute("/_authenticated/partner")({
  beforeLoad: async () => {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userRes.user.id);
    const set = new Set((roles ?? []).map((r) => r.role));
    if (set.has("admin")) throw redirect({ to: "/admin" });
    if (!set.has("partner")) throw redirect({ to: "/client" });
  },
  component: PartnerLayout,
});

function PartnerLayout() {
  return (
    <RoleLayout items={partnerNav} brandLabel="אזור שותפים עסקיים">
      <Outlet />
    </RoleLayout>
  );
}
