import { useQuery } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, FileText, ScrollText, Send, CheckSquare, Loader2, UserPlus, Phone } from "lucide-react";
import { formatDateTimeHe } from "@/lib/format";

type Event = {
  id: string;
  when: string;
  kind: string;
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  agent?: string | null;
  detail?: string | null;
};

const clientTimelineQuery = (clientId: string) =>
  queryOptions({
    queryKey: ["timeline", clientId],
    queryFn: async () => {
      const [client, messages, docs, entitlements, refs, tasks, calls] = await Promise.all([
        supabase.from("clients").select("created_at, first_name, last_name").eq("id", clientId).maybeSingle(),
        supabase.from("messages").select("id, channel, direction, content, created_at, sender:profiles!messages_sent_by_fkey(full_name)").eq("client_id", clientId).order("created_at", { ascending: false }).limit(100),
        supabase.from("documents").select("id, file_name, created_at, uploader:profiles!documents_uploaded_by_fkey(full_name)").eq("client_id", clientId).order("created_at", { ascending: false }).limit(100),
        supabase.from("client_entitlements").select("id, status, updated_at, handler:profiles!client_entitlements_handled_by_fkey(full_name), entitlement:entitlements(title)").eq("client_id", clientId).order("updated_at", { ascending: false }).limit(100),
        supabase.from("partner_referrals").select("id, status, sent_at, partner:partners(company_name), referrer:profiles!partner_referrals_referred_by_fkey(full_name)").eq("client_id", clientId).order("sent_at", { ascending: false }).limit(100),
        supabase.from("tasks").select("id, title, status, completed_at, created_at, assignee:profiles!tasks_assigned_to_fkey(full_name)").eq("client_id", clientId).order("created_at", { ascending: false }).limit(100),
        supabase.from("call_transcripts").select("id, direction, duration_seconds, summary, transcript, call_at, recorder:profiles!call_transcripts_recorded_by_fkey(full_name)").eq("client_id", clientId).order("call_at", { ascending: false }).limit(100),
      ]);

      const events: Event[] = [];

      if (client.data) {
        events.push({
          id: `init-${clientId}`,
          when: client.data.created_at,
          kind: "client",
          icon: UserPlus,
          text: `הלקוח ${client.data.first_name} ${client.data.last_name} נוסף למערכת`,
        });
      }
      (messages.data ?? []).forEach((m) => {
        const dir = m.direction === "outbound" ? "נשלחה" : "התקבלה";
        events.push({
          id: `m-${m.id}`,
          when: m.created_at,
          kind: "message",
          icon: MessageSquare,
          text: `הודעה ${dir} (${m.channel}): ${(m.content ?? "").slice(0, 80)}`,
          agent: (m as { sender?: { full_name: string } | null }).sender?.full_name ?? null,
        });
      });
      (docs.data ?? []).forEach((d) => {
        events.push({
          id: `d-${d.id}`,
          when: d.created_at,
          kind: "doc",
          icon: FileText,
          text: `מסמך הועלה: ${d.file_name}`,
          agent: (d as { uploader?: { full_name: string } | null }).uploader?.full_name ?? null,
        });
      });
      (entitlements.data ?? []).forEach((e) => {
        events.push({
          id: `e-${e.id}`,
          when: e.updated_at,
          kind: "entitlement",
          icon: ScrollText,
          text: `זכאות "${(e as { entitlement?: { title: string } | null }).entitlement?.title ?? ""}" - ${e.status}`,
          agent: (e as { handler?: { full_name: string } | null }).handler?.full_name ?? null,
        });
      });
      (refs.data ?? []).forEach((r) => {
        events.push({
          id: `r-${r.id}`,
          when: r.sent_at,
          kind: "referral",
          icon: Send,
          text: `הפניה ל${(r as { partner?: { company_name: string } | null }).partner?.company_name ?? "שותף"} - ${r.status}`,
          agent: (r as { referrer?: { full_name: string } | null }).referrer?.full_name ?? null,
        });
      });
      (tasks.data ?? []).forEach((t) => {
        if (t.status === "done" && t.completed_at) {
          events.push({
            id: `tc-${t.id}`,
            when: t.completed_at,
            kind: "task-done",
            icon: CheckSquare,
            text: `משימה הושלמה: ${t.title}`,
            agent: (t as { assignee?: { full_name: string } | null }).assignee?.full_name ?? null,
          });
        }
        events.push({
          id: `tn-${t.id}`,
          when: t.created_at,
          kind: "task",
          icon: CheckSquare,
          text: `משימה נוצרה: ${t.title}`,
          agent: (t as { assignee?: { full_name: string } | null }).assignee?.full_name ?? null,
        });
      });

      (calls.data ?? []).forEach((c) => {
        const dir = c.direction === "outbound" ? "יוצאת" : "נכנסת";
        const duration = c.duration_seconds != null ? ` (${Math.round(c.duration_seconds / 60)} דק')` : "";
        events.push({
          id: `c-${c.id}`,
          when: c.call_at,
          kind: "call",
          icon: Phone,
          text: `שיחה ${dir}${duration}${c.summary ? `: ${c.summary}` : ""}`,
          agent: (c as { recorder?: { full_name: string } | null }).recorder?.full_name ?? null,
          detail: c.transcript ?? null,
        });
      });

      events.sort((a, b) => (b.when ?? "").localeCompare(a.when ?? ""));
      return events;
    },
  });

export function TimelineTab({ clientId }: { clientId: string }) {
  const { data: events, isLoading } = useQuery(clientTimelineQuery(clientId));

  return (
    <Card>
      <CardHeader><CardTitle>ציר זמן</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (events ?? []).length === 0 ? (
          <p className="text-center text-muted-foreground py-8">אין אירועים</p>
        ) : (
          <div className="relative ps-6 space-y-3 border-s-2 border-muted">
            {(events ?? []).map((e) => (
              <div key={e.id} className="relative">
                <div className="absolute -start-[33px] top-1 bg-card border-2 border-primary rounded-full p-1.5">
                  <e.icon className="h-3 w-3 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm">{e.text}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTimeHe(e.when)}{e.agent ? ` · ${e.agent}` : ""}
                  </span>
                  {e.detail && (
                    <span className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-3">
                      {e.detail}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
