import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search, Send, Mail, Phone, MessageCircle, MessageSquare, FileText, Paperclip,
  Loader2, Check, CheckCheck, X, Users, UserCircle2, AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { meProfileQuery } from "@/features/clients/queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CHANNEL } from "@/features/clients/constants";
import { formatDateTimeHe, formatDateHe } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: [{ title: "תיבת תקשורת | זכויות פרו" }] }),
  component: Page,
});

const channelIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  whatsapp: MessageCircle,
  email: Mail,
  voice: Phone,
  sms: MessageSquare,
  internal: FileText,
};

const channelTone: Record<string, string> = {
  whatsapp: "text-green-600",
  email: "text-blue-600",
  voice: "text-orange-600",
  sms: "text-purple-600",
  internal: "text-muted-foreground",
};

type ContactKind = "client" | "partner";
type MessageRow = {
  id: string; tenant_id: string; client_id: string | null; partner_id: string | null;
  channel: string; direction: string; content: string | null; status: string;
  attachments: unknown; created_at: string; sent_by: string | null;
};
type Contact = {
  kind: ContactKind; id: string; name: string; phone: string | null; email: string | null;
  lastMessage: MessageRow | null; channels: Set<string>; unread: number;
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function Page() {
  const qc = useQueryClient();
  const { data: me } = useSuspenseQuery(meProfileQuery());
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "clients" | "partners" | "unread">("all");
  const [selected, setSelected] = useState<{ kind: ContactKind; id: string } | null>(null);

  // All messages for current tenant
  const { data: messages = [] } = useQuery({
    queryKey: ["inbox-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as MessageRow[];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["inbox-clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, first_name, last_name, phone, email, tenant_id");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: partners = [] } = useQuery({
    queryKey: ["inbox-partners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("partners").select("id, company_name, contact_name, phone, email");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Realtime
  useEffect(() => {
    const ch = supabase.channel("inbox-stream")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        qc.invalidateQueries({ queryKey: ["inbox-messages"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const contacts: Contact[] = useMemo(() => {
    const map = new Map<string, Contact>();
    for (const c of clients) {
      const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "ללא שם";
      map.set(`client:${c.id}`, { kind: "client", id: c.id, name, phone: c.phone, email: c.email, lastMessage: null, channels: new Set(), unread: 0 });
    }
    for (const p of partners) {
      map.set(`partner:${p.id}`, { kind: "partner", id: p.id, name: p.company_name, phone: p.phone, email: p.email, lastMessage: null, channels: new Set(), unread: 0 });
    }
    for (const m of messages) {
      const k = m.client_id ? `client:${m.client_id}` : m.partner_id ? `partner:${m.partner_id}` : null;
      if (!k) continue;
      const ct = map.get(k);
      if (!ct) continue;
      ct.channels.add(m.channel);
      if (!ct.lastMessage || new Date(m.created_at) > new Date(ct.lastMessage.created_at)) ct.lastMessage = m;
      if (m.direction === "inbound" && m.status !== "read") ct.unread++;
    }
    return Array.from(map.values())
      .filter((c) => c.lastMessage)
      .sort((a, b) => +new Date(b.lastMessage!.created_at) - +new Date(a.lastMessage!.created_at));
  }, [clients, partners, messages]);

  const filteredContacts = useMemo(() => contacts.filter((c) => {
    if (filter === "clients" && c.kind !== "client") return false;
    if (filter === "partners" && c.kind !== "partner") return false;
    if (filter === "unread" && c.unread === 0) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [contacts, filter, search]);

  const activeMessages = useMemo(() => {
    if (!selected) return [];
    return messages
      .filter((m) => (selected.kind === "client" ? m.client_id === selected.id : m.partner_id === selected.id))
      .slice()
      .reverse();
  }, [messages, selected]);

  const activeContact = selected ? contacts.find((c) => c.kind === selected.kind && c.id === selected.id) ?? null : null;

  // Auto-select first
  useEffect(() => {
    if (!selected && filteredContacts.length > 0) {
      setSelected({ kind: filteredContacts[0].kind, id: filteredContacts[0].id });
    }
  }, [filteredContacts, selected]);

  return (
    <div className="h-[calc(100vh-9rem)] flex gap-4">
      {/* LEFT: conversation list */}
      <Card className="w-80 flex flex-col">
        <div className="p-3 border-b space-y-3">
          <h2 className="text-lg font-semibold">תיבת תקשורת</h2>
          <div className="relative">
            <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="ps-2 pe-8" placeholder="חיפוש..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="all">הכל</TabsTrigger>
              <TabsTrigger value="clients">לקוחות</TabsTrigger>
              <TabsTrigger value="partners">שותפים</TabsTrigger>
              <TabsTrigger value="unread">חדש</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <ScrollArea className="flex-1">
          {filteredContacts.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">אין שיחות</div>}
          {filteredContacts.map((c) => {
            const isActive = selected?.kind === c.kind && selected?.id === c.id;
            const KindIcon = c.kind === "client" ? UserCircle2 : Users;
            return (
              <button key={`${c.kind}:${c.id}`} onClick={() => setSelected({ kind: c.kind, id: c.id })}
                className={cn("w-full p-3 flex items-start gap-3 hover:bg-accent text-start border-b border-border/40", isActive && "bg-accent")}>
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm flex-shrink-0 relative">
                  {initials(c.name)}
                  <KindIcon className="absolute -bottom-1 -end-1 h-4 w-4 bg-background rounded-full p-0.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{c.name}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{c.lastMessage && formatDateHe(c.lastMessage.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground truncate mt-0.5">
                    {Array.from(c.channels).slice(0, 3).map((ch) => {
                      const Icon = channelIcon[ch] ?? MessageSquare;
                      return <Icon key={ch} className={cn("h-3 w-3 flex-shrink-0", channelTone[ch])} />;
                    })}
                    <span className="truncate">{c.lastMessage?.content ?? "—"}</span>
                  </div>
                </div>
                {c.unread > 0 && <Badge className="bg-primary text-primary-foreground border-0">{c.unread}</Badge>}
              </button>
            );
          })}
        </ScrollArea>
      </Card>

      {/* RIGHT: chat window */}
      <Card className="flex-1 flex flex-col">
        {!activeContact && <div className="flex-1 flex items-center justify-center text-muted-foreground">בחר שיחה כדי להתחיל</div>}
        {activeContact && me && (
          <ChatPane
            contact={activeContact}
            messages={activeMessages}
            tenantId={me.tenant_id}
            senderId={me.id}
            onSent={() => qc.invalidateQueries({ queryKey: ["inbox-messages"] })}
          />
        )}
      </Card>
    </div>
  );
}

function ChatPane({ contact, messages, tenantId, senderId, onSent }: {
  contact: Contact; messages: MessageRow[]; tenantId: string; senderId: string; onSent: () => void;
}) {
  const [content, setContent] = useState("");
  const [channel, setChannel] = useState("whatsapp");
  const [attachments, setAttachments] = useState<{ name: string; size: number; path: string; mime: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight }); }, [messages.length]);

  // Mark inbound messages as read once the conversation is open, so the
  // unread badges (sidebar count, "חדש" filter, dashboard widget) actually
  // clear instead of staying stuck forever.
  useEffect(() => {
    const unreadIds = messages.filter((m) => m.direction === "inbound" && m.status !== "read").map((m) => m.id);
    if (unreadIds.length === 0) return;
    supabase.from("messages").update({ status: "read" }).in("id", unreadIds).then(({ error }) => {
      if (!error) onSent();
    });
  }, [messages, onSent]);

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const path = `${tenantId}/inbox/${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage.from("client-documents").upload(path, file);
      if (error) throw error;
      setAttachments((a) => [...a, { name: file.name, size: file.size, path, mime: file.type }]);
    } catch (e) {
      toast.error("שגיאת העלאה", { description: (e as Error).message });
    } finally { setUploading(false); }
  }

  const send = useMutation({
    mutationFn: async () => {
      if (!content.trim() && attachments.length === 0) throw new Error("הקלד הודעה");
      const payload = {
        tenant_id: tenantId,
        client_id: contact.kind === "client" ? contact.id : null,
        partner_id: contact.kind === "partner" ? contact.id : null,
        channel,
        direction: "outbound",
        status: "sent",
        content: content.trim(),
        attachments: attachments as never,
        sent_by: senderId,
      };
      const { data, error } = await supabase.from("messages").insert(payload).select("id").single();
      if (error) throw error;
      // Fire-and-forget dispatch (skip for internal notes)
      if (channel !== "internal") {
        fetch("/api/public/notify-message", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ messageId: data.id }),
        }).catch(() => {});
      }
      // WhatsApp to a client: real dispatch through the server (Green API,
      // test-mode gated) — same flow as the client file's MessagesTab. The
      // row above is already saved either way; this only performs delivery
      // and updates the row's status.
      if (channel === "whatsapp" && contact.kind === "client" && data?.id) {
        try {
          const { data: session } = await supabase.auth.getSession();
          const token = session.session?.access_token;
          if (!token) throw new Error("נדרשת התחברות מחדש");
          const res = await fetch(`${import.meta.env.BASE_URL}api/whatsapp-send`, {
            method: "POST",
            headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
            body: JSON.stringify({ messageId: data.id }),
          });
          const out = await res.json().catch(() => null);
          if (!res.ok) {
            toast.error("שליחת הוואטסאפ נכשלה", { description: out?.error ?? `שגיאה ${res.status}` });
          } else if (out?.mode === "test") {
            toast.info("הוואטסאפ נרשם במצב טסט", { description: out?.detail });
          } else {
            toast.success("הוואטסאפ נשלח ללקוח");
          }
        } catch (e) {
          toast.error("שליחת הוואטסאפ נכשלה", { description: e instanceof Error ? e.message : undefined });
        }
      }
    },
    onSuccess: () => { setContent(""); setAttachments([]); onSent(); },
    onError: (e: Error) => toast.error("שגיאה", { description: e.message }),
  });

  // Group by day
  const groups = useMemo(() => {
    const out: { day: string; rows: MessageRow[] }[] = [];
    let cur: { day: string; rows: MessageRow[] } | null = null;
    for (const m of messages) {
      const d = new Date(m.created_at).toDateString();
      if (!cur || cur.day !== d) { cur = { day: d, rows: [] }; out.push(cur); }
      cur.rows.push(m);
    }
    return out;
  }, [messages]);

  const KindIcon = contact.kind === "client" ? UserCircle2 : Users;

  return (
    <>
      <div className="p-4 border-b flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">{initials(contact.name)}</div>
        <div className="flex-1">
          <div className="font-semibold flex items-center gap-2">{contact.name} <KindIcon className="h-4 w-4 text-muted-foreground" /></div>
          <div className="text-xs text-muted-foreground">{contact.phone ?? "—"} · {contact.email ?? "—"}</div>
        </div>
      </div>

      <div ref={scrollerRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
        {groups.length === 0 && <div className="text-center text-muted-foreground text-sm py-12">אין הודעות עדיין</div>}
        {groups.map((g) => (
          <div key={g.day} className="space-y-2">
            <div className="text-center">
              <span className="inline-block px-3 py-1 rounded-full bg-card text-xs text-muted-foreground border">{formatDateHe(g.day)}</span>
            </div>
            {g.rows.map((m) => <Bubble key={m.id} m={m} />)}
          </div>
        ))}
      </div>

      <div className="border-t p-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CHANNEL).map(([k, v]) => {
                const Icon = channelIcon[k] ?? MessageSquare;
                return <SelectItem key={k} value={k}><span className="inline-flex items-center gap-2"><Icon className={cn("h-3.5 w-3.5", channelTone[k])} />{v}</span></SelectItem>;
              })}
            </SelectContent>
          </Select>
          {attachments.map((a, i) => (
            <Badge key={i} variant="secondary" className="gap-1">
              <Paperclip className="h-3 w-3" />{a.name}
              <button onClick={() => setAttachments((arr) => arr.filter((_, idx) => idx !== i))}><X className="h-3 w-3" /></button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2 items-end">
          <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ""; }} />
          <Button type="button" variant="ghost" size="icon" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          </Button>
          <Textarea rows={2} placeholder="כתוב הודעה..." value={content} onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send.mutate(); } }} />
          <Button onClick={() => send.mutate()} disabled={send.isPending || (!content.trim() && attachments.length === 0)}>
            {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </>
  );
}

function Bubble({ m }: { m: MessageRow }) {
  const outbound = m.direction === "outbound";
  const Icon = channelIcon[m.channel] ?? MessageSquare;
  const StatusIcon = m.status === "read" ? CheckCheck : m.status === "delivered" ? CheckCheck : m.status === "failed" ? AlertCircle : Check;
  const attachments = Array.isArray(m.attachments) ? (m.attachments as { name: string; size: number; path: string; mime: string }[]) : [];
  return (
    <div className={cn("flex", outbound ? "justify-start" : "justify-end")}>
      <div className={cn("max-w-[70%] rounded-2xl p-3 shadow-sm",
        outbound ? "bg-primary text-primary-foreground rounded-bs-sm" : "bg-card border rounded-be-sm")}>
        <div className={cn("flex items-center gap-1.5 text-[11px] mb-1", outbound ? "opacity-80" : "text-muted-foreground")}>
          <Icon className={cn("h-3 w-3", outbound ? "" : channelTone[m.channel])} />
          <span>{(CHANNEL as Record<string, string>)[m.channel] ?? m.channel}</span>
        </div>
        {m.channel === "voice" && m.content && (
          <div className="flex items-center gap-2 mb-1 text-xs"><Phone className="h-3 w-3" /><span className="italic opacity-90">תמלול:</span></div>
        )}
        {m.content && <div className="text-sm whitespace-pre-wrap break-words">{m.content}</div>}
        {attachments.length > 0 && (
          <div className="mt-2 space-y-1">
            {attachments.map((a, i) => (
              <div key={i} className={cn("flex items-center gap-2 text-xs rounded p-2", outbound ? "bg-primary-foreground/15" : "bg-muted")}>
                <FileText className="h-4 w-4" />
                <div className="flex-1 min-w-0">
                  <div className="truncate">{a.name}</div>
                  <div className="opacity-70">{(a.size / 1024).toFixed(1)} KB</div>
                </div>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={async () => {
                  const { data } = await supabase.storage.from("client-documents").createSignedUrl(a.path, 60);
                  if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                }}><Paperclip className="h-3 w-3" /></Button>
              </div>
            ))}
          </div>
        )}
        <div className={cn("flex items-center gap-1 text-[10px] mt-1 justify-end", outbound ? "opacity-70" : "text-muted-foreground")}>
          {outbound && m.status === "test_mode" && <span>טסט — לא נשלח בפועל ·</span>}
          <span>{formatDateTimeHe(m.created_at)}</span>
          {outbound && <StatusIcon className="h-3 w-3" />}
        </div>
      </div>
    </div>
  );
}
