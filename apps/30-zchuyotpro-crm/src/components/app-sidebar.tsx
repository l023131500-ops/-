import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, Users, Handshake, ScrollText, MessageSquare, FileText, Settings, ShieldCheck, Send, Briefcase, CheckSquare, BarChart3, Inbox } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { myPartnerQuery } from "@/features/partners/queries";

const items = [
  { title: "לוח בקרה", url: "/dashboard", icon: LayoutDashboard },
  { title: "פניות נכנסות", url: "/intake", icon: Inbox },
  { title: "לקוחות", url: "/clients", icon: Users },
  { title: "משימות", url: "/tasks", icon: CheckSquare },
  { title: "שותפים", url: "/partners", icon: Handshake },
  { title: "הפניות לשת״פ", url: "/referrals", icon: Send },
  { title: "זכאויות", url: "/entitlements", icon: ScrollText },
  { title: "תיבת תקשורת", url: "/messages", icon: MessageSquare },
  { title: "מסמכים", url: "/documents", icon: FileText },
  { title: "אנליטיקה", url: "/analytics", icon: BarChart3 },
  { title: "הגדרות", url: "/settings", icon: Settings },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: partner } = useQuery(myPartnerQuery());

  return (
    <Sidebar collapsible="icon" side="right">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="p-1.5 rounded-lg bg-primary text-primary-foreground shrink-0">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <span className="font-semibold text-sidebar-foreground">זכויות פרו</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>תפריט ראשי</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = pathname === item.url || pathname.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {partner && (
          <SidebarGroup>
            <SidebarGroupLabel>שותף</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/partner-portal")} tooltip="פורטל שותפים">
                    <Link to="/partner-portal" className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 shrink-0" />
                      <span>פורטל שותפים</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
