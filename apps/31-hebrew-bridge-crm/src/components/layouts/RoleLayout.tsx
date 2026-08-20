import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  SidebarProvider, SidebarTrigger, SidebarInset,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Shield } from "lucide-react";
import { toast } from "sonner";
import { SupportFooter } from "@/components/layouts/SupportFooter";

export type NavItem = {
  title: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
};

interface Props {
  items: NavItem[];
  brandLabel: string;
  children: ReactNode;
}

export function RoleLayout({ items, brandLabel, children }: Props) {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut();
      toast.success("התנתקת בהצלחה");
      navigate({ to: "/auth", replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar side="right" collapsible="icon">
          <SidebarHeader className="border-b border-sidebar-border">
            <div className="flex items-center gap-3 px-2 py-3">
              <div className="w-9 h-9 rounded-lg bg-sidebar-primary/20 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-sidebar-primary-foreground" />
              </div>
              <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-bold text-sidebar-foreground tracking-wide">בקלות</span>
                <span className="text-xs text-sidebar-foreground/60">{brandLabel}</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>תפריט ראשי</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    const active = currentPath === item.to || currentPath.startsWith(item.to + "/");
                    return (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                          <Link to={item.to} className="flex items-center gap-3">
                            <item.icon className="w-4 h-4 shrink-0" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t border-sidebar-border">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleSignOut} disabled={signingOut} tooltip="התנתק">
                  <LogOut className="w-4 h-4" />
                  <span>התנתק</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <header className="sticky top-0 z-10 h-14 flex items-center gap-3 border-b bg-background/80 backdrop-blur px-4">
            <SidebarTrigger />
            <div className="flex-1" />
            <span className="text-sm text-muted-foreground">{brandLabel}</span>
          </header>
          <main className="flex-1 p-6 animate-fade-in">{children}</main>
          <SupportFooter />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export function PlaceholderPage({ title, description }: { title: string; description?: string }) {
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">{title}</h1>
      <p className="text-muted-foreground mb-8">{description ?? "מודול זה יבנה בשלבים הבאים."}</p>
      <div className="rounded-xl border-2 border-dashed border-border bg-card p-12 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-muted mb-4">
          <Shield className="w-7 h-7 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold mb-2">בקרוב</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          תשתית המסך מוכנה. הטבלאות, הטפסים ותהליכי העבודה ייבנו בשלבים הבאים של המערכת.
        </p>
      </div>
    </div>
  );
}
