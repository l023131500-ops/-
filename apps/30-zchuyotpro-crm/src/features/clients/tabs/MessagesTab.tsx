import { useEffect, useState } from "react";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send, MessageSquare, Mail, Phone, MessageCircle, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { messagesQuery, clientQuery, meProfileQuery } from "@/features/clients/queries";
import { CHANNEL } from "@/features/clients/constants";
import { formatDateTimeHe } from "@/lib/format";
import { triggerN8nWebhook } from "@/lib/n8n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Delivery states written by /api/email-send onto outbound email rows.
const EMAIL_STATUS: Record<string, string> = {
  test_mode: "טסט — לא נשלח בפועל",
  delivered: "נשלח במייל",
  failed: "שליחה נכשלה",
};

// Delivery states written by /api/whatsapp-send onto outbound whatsapp rows.
const WHATSAPP_STATUS: Record<string, string> = {
  test_mode: "טסט — לא נשלח בפועל",
  delivered: "נשלח בוואטסאפ",
  failed: "שליחה נכשלה",
};

const deliveryLabel = (channel: string, status: string): string | undefined =>
  channel === "email" ? EMAIL_STATUS[status] : channel === "whatsapp" ? WHATSAPP_STATUS[status] : undefined;

const channelIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  whatsapp: MessageCircle,
  email: Mail,
  voice: Phone,
  sms: MessageSquare,
  internal: FileText,
};

export function MessagesTab({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const { data: client } = useSuspenseQuery(clientQuery(clientId));
  const { data: me } = useSuspenseQuery(meProfileQuery());
  const { data: messages } = useSuspenseQuery(messagesQuery(clientId));
  const [content, setContent] = useState("");
  const [channel, setChannel] = useState<string>("whatsapp");
  const [emailSubject, setEmailSubject] = useState("");

  useEffect(() => {
    const ch = supabase
      .channel(`messages-${clientId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `client_id=eq.${clientId}` }, () => {
        qc.invalidateQueries({ queryKey: ["messages", clientId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clientId, qc]);

  // Mark inbound messages as read once this tab is open, matching the inbox's
  // ChatPane — otherwise the unread badge for this client never clears.
  useEffect(() => {
    const unreadIds = messages.filter((m) => m.direction === "inbound" && m.status !== "read").map((m) => m.id);
    if (unreadIds.length === 0) return;
    supabase.from("messages").update({ status: "read" }).in("id", unreadIds).then(({ error }) => {
      if (!error) qc.invalidateQueries({ queryKey: ["messages", clientId] });
    });
  }, [messages, clientId, qc]);

  const send = useMutation({
    mutationFn: async () => {
      if (!content.trim()) throw new Error("הקלד הודעה");
      const body = content.trim();
      const { data: inserted, error } = await supabase.from("messages").insert({
        tenant_id: client.tenant_id,
        client_id: clientId,
        channel,
        direction: "outbound",
        status: "sent",
        content: body,
        sent_by: me?.id ?? null,
      }).select("id").single();
      if (error) throw error;
      // Fire-and-forget n8n automation; never blocks the save above.
      if (channel !== "internal") {
        void triggerN8nWebhook("send-message", {
          clientId,
          channel,
          content: body,
          tenantId: client.tenant_id,
        });
      }
      // Email / WhatsApp channels: real dispatch through the server (Resend /
      // Green API, both test-mode gated). The timeline row above is already
      // saved either way — this only performs delivery and updates the row's
      // status.
      if ((channel === "email" || channel === "whatsapp") && inserted?.id) {
        const name = channel === "email" ? "המייל" : "הוואטסאפ";
        try {
          const { data: session } = await supabase.auth.getSession();
          const token = session.session?.access_token;
          if (!token) throw new Error("נדרשת התחברות מחדש");
          const res = await fetch(`${import.meta.env.BASE_URL}api/${channel === "email" ? "email-send" : "whatsapp-send"}`, {
            method: "POST",
            headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
            body: JSON.stringify({
              messageId: inserted.id,
              ...(channel === "email" ? { subject: emailSubject.trim() || undefined } : {}),
            }),
          });
          const out = await res.json().catch(() => null);
          if (!res.ok) {
            toast.error(`שליחת ${name} נכשלה`, { description: out?.error ?? `שגיאה ${res.status}` });
          } else if (out?.mode === "test") {
            toast.info(`${name} נרשם במצב טסט`, { description: out?.detail });
          } else {
            toast.success(`${name} נשלח ללקוח`);
          }
        } catch (e) {
          toast.error(`שליחת ${name} נכשלה`, { description: e instanceof Error ? e.message : undefined });
        }
      }
    },
    onSuccess: () => { setContent(""); setEmailSubject(""); qc.invalidateQueries({ queryKey: ["messages", clientId] }); },
    onError: (e: Error) => toast.error("שגיאה", { description: e.message }),
  });

  return (
    <Card>
      <CardHeader><CardTitle>תקשורת</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 max-h-[480px] overflow-y-auto pe-1">
          {messages.length === 0 && <div className="text-center text-muted-foreground py-12">אין הודעות עדיין</div>}
          {messages.map((m) => {
            const Icon = channelIcon[m.channel] ?? MessageSquare;
            const outbound = m.direction === "outbound";
            return (
              <div key={m.id} className={cn("flex", outbound ? "justify-start" : "justify-end")}>
                <div className={cn("max-w-[75%] rounded-lg p-3 border", outbound ? "bg-primary text-primary-foreground border-primary" : "bg-card")}>
                  <div className="flex items-center gap-1.5 text-xs opacity-80 mb-1">
                    <Icon className="h-3 w-3" />
                    <span>{(CHANNEL as Record<string, string>)[m.channel] ?? m.channel}</span>
                    <span>·</span>
                    <span>{formatDateTimeHe(m.created_at)}</span>
                    {outbound && deliveryLabel(m.channel, m.status) && (
                      <>
                        <span>·</span>
                        <span className={m.status === "failed" ? "text-red-300 font-medium" : ""}>{deliveryLabel(m.channel, m.status)}</span>
                      </>
                    )}
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t pt-4 space-y-2">
          <div className="flex gap-2">
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(CHANNEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
            {channel === "email" && (
              <Input
                className="flex-1"
                placeholder="נושא המייל (לא חובה)"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            )}
          </div>
          <div className="flex gap-2 items-end">
            <Textarea rows={2} placeholder="הקלד הודעה..." value={content} onChange={(e) => setContent(e.target.value)} />
            <Button onClick={() => send.mutate()} disabled={send.isPending || !content.trim()}>
              {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
