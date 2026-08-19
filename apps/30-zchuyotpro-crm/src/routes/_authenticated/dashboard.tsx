import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Handshake, ScrollText, MessageSquare, UserPlus, Send, FileText, Activity, Clock, Loader2 } from "lucide-react";
import { dashboardStatsQuery, recentActivityQuery, referralsBoardQuery } from "@/features/dashboard/queries";
import { REFERRAL_STATUS, REFERRAL_STATUS_COLOR } from "@/features/clients/constants";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "לוח בקרה | זכויות פרו" }] }),
  component: Dashboard,
});

const KANBAN_COLS = ["sent", "pending", "in_progress", "completed", "rejected"] as const;

function fmtTime(iso: string) {
  const d = new Date(iso);
  const now = Date.now();
  const diff = Math.floor((now - d.getTime()) / 1000);
  if (diff < 60) return "עכשיו";
  if (diff < 3600) return `לפני ${Math.floor(diff / 60)} ד׳`;
  if (diff < 86400) return `לפני ${Math.floor(diff / 3600)} ש׳`;
  return d.toLocaleDateString("he-IL");
}

function Dashboard() {
  const qc = useQueryClient();
  const { data: stats } = useQuery(dashboardStatsQuery());
  const { data: activity, isLoading: actLoading } = useQuery(recentActivityQuery());
  const { data: refs, isLoading: refsLoading } = useQuery(referralsBoardQuery());

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("partner_referrals").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("הסטטוס עודכן");
      qc.invalidateQueries({ queryKey: ["dashboard-referrals-board"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e: Error) => toast.error("עדכון נכשל", { description: e.message }),
  });

  const cards = [
    { label: "לקוחות פעילים", value: stats?.activeClients ?? "—", icon: Users, color: "text-blue-600" },
    { label: "לקוחות חדשים החודש", value: stats?.newMonth ?? "—", icon: UserPlus, color: "text-green-600" },
    { label: "הפניות פתוחות", value: stats?.openReferrals ?? "—", icon: Handshake, color: "text-orange-600" },
    { label: "זכאויות נבדקו החודש", value: stats?.entitlementsChecked ?? "—", icon: ScrollText, color: "text-purple-600" },
    { label: "הודעות שלא נקראו", value: stats?.unreadMessages ?? "—", icon: MessageSquare, color: "text-pink-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">לוח בקרה</h2>
          <p className="text-muted-foreground text-sm mt-1">סקירה כללית של המערכת</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm"><Link to="/clients/new"><UserPlus className="h-4 w-4 ms-1" /> לקוח חדש</Link></Button>
          <Button asChild size="sm" variant="outline"><Link to="/referrals"><Send className="h-4 w-4 ms-1" /> הפניות</Link></Button>
          <Button asChild size="sm" variant="outline"><Link to="/documents"><FileText className="h-4 w-4 ms-1" /> מסמכים</Link></Button>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4" /> פעילות אחרונה</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[480px] overflow-auto">
            {actLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (activity ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">אין פעילות להצגה</p>
            ) : (
              (activity ?? []).map((a) => (
                <div key={a.id} className="flex items-start gap-2 text-sm border-b last:border-0 pb-2">
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {a.kind === "client" ? "לקוח" : a.kind === "referral" ? "הפניה" : a.kind === "message" ? "הודעה" : "מסמך"}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{a.text}</div>
                    {a.clientId && a.clientName && (
                      <Link to="/clients/$id" params={{ id: a.clientId }} className="text-xs text-primary hover:underline">
                        {a.clientName}
                      </Link>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {fmtTime(a.when)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">לוח הפניות לשת״פ</CardTitle>
          </CardHeader>
          <CardContent>
            {refsLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                {KANBAN_COLS.map((status) => {
                  const cards = (refs ?? []).filter((r) => r.status === status);
                  return (
                    <div key={status} className="bg-muted/40 rounded-md p-2 min-h-[120px]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold">{REFERRAL_STATUS[status as keyof typeof REFERRAL_STATUS]}</span>
                        <Badge variant="secondary" className="text-[10px]">{cards.length}</Badge>
                      </div>
                      <div className="space-y-1.5 max-h-[360px] overflow-auto">
                        {cards.map((r) => (
                          <div key={r.id} className={`p-2 rounded border bg-card text-xs ${REFERRAL_STATUS_COLOR[status]}`}>
                            {r.client && (
                              <Link
                                to="/clients/$id"
                                params={{ id: r.client.id }}
                                className="font-medium hover:underline block truncate"
                              >
                                {r.client.first_name} {r.client.last_name}
                              </Link>
                            )}
                            <div className="text-[10px] opacity-80 truncate">{r.partner?.company_name}</div>
                            {r.notes && <div className="text-[10px] mt-1 line-clamp-2">{r.notes}</div>}
                            <select
                              value={status}
                              onChange={(e) => updateStatus.mutate({ id: r.id, status: e.target.value })}
                              className="mt-1 w-full text-[10px] bg-background rounded border px-1 py-0.5"
                            >
                              {KANBAN_COLS.map((s) => (
                                <option key={s} value={s}>{REFERRAL_STATUS[s]}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
