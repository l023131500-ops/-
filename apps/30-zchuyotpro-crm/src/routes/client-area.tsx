import { createFileRoute, Outlet, redirect, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ShieldCheck, LogOut, User, MessageSquare, FileText, ScrollText, Wallet, Handshake, KeyRound } from "lucide-react";
import { queryOptions } from "@tanstack/react-query";
import { tenantModulesQuery } from "@/features/customize/queries";
import { OPTIONAL_MODULES, isModuleEnabled } from "@/features/customize/modules";

export const meClientQuery = () =>
  queryOptions({
    queryKey: ["me-client"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("auth_user_id", u.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const Route = createFileRoute("/client-area")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: ClientAreaLayout,
});

const tabs = [
  { url: "/client-area", label: "פרופיל", icon: User, exact: true },
  { url: "/client-area/messages", label: "הודעות", icon: MessageSquare, exact: false },
  { url: "/client-area/documents", label: "מסמכים", icon: FileText, exact: false },
  { url: "/client-area/entitlements", label: "זכאויות", icon: ScrollText, exact: false },
  { url: "/client-area/finance", label: "כספים", icon: Wallet, exact: false },
  { url: "/client-area/vault", label: "אזורים אישיים", icon: KeyRound, exact: false },
  { url: "/client-area/consents", label: "שיתופי פעולה", icon: Handshake, exact: false },
] as const;

function ClientAreaLayout() {
  const { data: client, isLoading } = useQuery(meClientQuery());
  // spec item 2: modules the manager turned off are hidden from the client too
  const { data: modules } = useQuery(tenantModulesQuery());
  const visibleTabs = tabs.filter((t) => {
    const gated = OPTIONAL_MODULES.find((m) => m.portalUrl === t.url);
    return !gated || isModuleEnabled(modules, gated.key);
  });
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">טוען...</div>;
  }

  if (!client) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">החשבון לא משויך ללקוח</h1>
          <p className="text-sm text-muted-foreground">החשבון שלך אינו משויך לתיק לקוח במערכת. צור קשר עם הארגון.</p>
          <Button onClick={signOut} variant="outline"><LogOut className="h-4 w-4 me-1" /> התנתק</Button>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary text-primary-foreground"><ShieldCheck className="h-4 w-4" /></div>
          <div>
            <div className="font-semibold">אזור אישי</div>
            <div className="text-xs text-muted-foreground">{client.first_name} {client.last_name}</div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="h-4 w-4 me-1" /> יציאה</Button>
      </header>
      <nav className="border-b bg-card/40 px-2 sm:px-4 overflow-x-auto">
        <div className="flex gap-1">
          {visibleTabs.map((t) => {
            const active = t.exact ? pathname === t.url : pathname.startsWith(t.url);
            return (
              <Link
                key={t.url}
                to={t.url}
                className={`flex items-center gap-1 px-3 py-2 text-sm border-b-2 whitespace-nowrap ${
                  active ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="h-4 w-4" /> {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
      <main className="flex-1 p-4 sm:p-6 max-w-4xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
