import { type ReactNode } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { UserMenu } from "@/components/user-menu";
import { StaffNotificationsBell } from "@/components/staff-notifications-bell";
import { GlobalSearch } from "@/components/global-search";
import { Breadcrumbs } from "@/components/breadcrumbs";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div dir="rtl" className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-card/50 backdrop-blur px-3 sm:px-4 sticky top-0 z-10 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <SidebarTrigger />
              <h1 className="text-base sm:text-lg font-semibold text-foreground shrink-0">זכויות פרו</h1>
            </div>
            <div className="flex-1 hidden sm:block max-w-md mx-2">
              <GlobalSearch />
            </div>
            <div className="flex items-center gap-1">
              <StaffNotificationsBell />
              <UserMenu />
            </div>
          </header>
          <div className="sm:hidden border-b px-3 py-2"><GlobalSearch /></div>
          <div className="px-4 sm:px-6 pt-3"><Breadcrumbs /></div>
          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
