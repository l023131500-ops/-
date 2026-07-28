import { BookOpen, Building2, HeartHandshake, Inbox, LayoutDashboard } from "lucide-react";
import { PortalShell, type NavItem } from "@/components/portal/PortalShell";

const NAV: NavItem[] = [
  { to: "/admin", label: "סקירה", icon: LayoutDashboard, end: true },
  { to: "/admin/synagogues", label: "בתי כנסת", icon: Building2 },
  { to: "/admin/lessons", label: "שיעורי תורה", icon: BookOpen },
  { to: "/admin/services", label: "גמ״חים ושירותים", icon: HeartHandshake },
  { to: "/admin/inbox", label: "תיבת פניות", icon: Inbox },
];

export function AdminLayout() {
  return <PortalShell title="ניהול המועצה" subtitle="חצור הגלילית" nav={NAV} loginPath="/admin/login" />;
}
