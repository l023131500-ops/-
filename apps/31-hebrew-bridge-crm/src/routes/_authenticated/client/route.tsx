import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Activity, FolderLock, Mail, Share2 } from "lucide-react";
import { RoleLayout, type NavItem } from "@/components/layouts/RoleLayout";
import { supabase } from "@/integrations/supabase/client";

const clientNav: NavItem[] = [
  { title: "מצב הטיפול שלי", to: "/client/status", icon: Activity },
  { title: "עדכונים", to: "/client/messages", icon: Mail },
  { title: "תיק מסמכים מאובטח", to: "/client/documents", icon: FolderLock },
  { title: "ניהול שיתוף מידע", to: "/client/consents", icon: Share2 },
];

export const Route = createFileRoute("/_authenticated/client")({
  beforeLoad: async () => {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userRes.user.id);
    const set = new Set((roles ?? []).map((r) => r.role));
    if (set.has("admin")) throw redirect({ to: "/admin" });
    if (set.has("partner")) throw redirect({ to: "/partner" });
  },
  component: ClientLayout,
});

function ClientLayout() {
  return (
    <RoleLayout items={clientNav} brandLabel="אזור אישי ללקוח">
      <Outlet />
    </RoleLayout>
  );
}
