import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Mail, MessageCircle, Phone, Workflow, Plus, Send, Trash2, Inbox } from "lucide-react";
import { AdminGate } from "@/components/admin-gate";
import type { Client } from "@shared/schema";
import type { AppUser } from "@/types/admin";

const CHANNELS = [
  { value: "email", label: "מייל", icon: Mail },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { value: "voice", label: "מערכת קולית", icon: Phone },
  { value: "n8n", label: "n8n Webhook", icon: Workflow },
];

interface DeliveryRow {
  id: number;
  channel: string;
  recipientType: string;
  recipientId: number | null;
  recipientLabel: string;
  toAddress: string;
  subject: string | null;
  body: string;
  callbackUrl: string | null;
  status: string;
  statusDetail: string | null;
  attempts: number;
  endpointUsed: string | null;
  responseText: string | null;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
  createdBy: string | null;
}

function statusBadge(status: string) {
  const variants: Record<string, { variant: any; label: string }> = {
    pending: { variant: "secondary", label: "בהמתנה" },
    sent: { variant: "default", label: "נשלח" },
    failed: { variant: "destructive", label: "נכשל" },
    skipped: { variant: "outline", label: "טיוטה" },
  };
  const meta = variants[status] ?? { variant: "outline", label: status };
  return <Badge variant={meta.variant} className="text-[11px]">{meta.label}</Badge>;
}

function DeliveryInner() {
  const [creating, setCreating] = useState(false);

  const list = useQuery<DeliveryRow[]>({ queryKey: ["/api/admin/delivery"] });
  const leads = useQuery<Client[]>({ queryKey: ["/api/clients"] });
  const users = useQuery<AppUser[]>({ queryKey: ["/api/admin/users"] });

  const totals = useMemo(() => {
    const arr = list.data ?? [];
    return {
      total: arr.length,
      pending: arr.filter((r) => r.status === "pending").length,
      sent: arr.filter((r) => r.status === "sent").length,
      failed: arr.filter((r) => r.status === "failed" || r.status === "skipped").length,
    };
  }, [list.data]);

  async function sendNow(row: DeliveryRow) {
    await apiRequest("POST", `/api/admin/delivery/${row.id}/send`);
    await queryClient.invalidateQueries({ queryKey: ["/api/admin/delivery"] });
  }
  async function remove(row: DeliveryRow) {
    if (!confirm("למחוק את ההודעה?")) return;
    await apiRequest("DELETE", `/api/admin/delivery/${row.id}`);
    await queryClient.invalidateQueries({ queryKey: ["/api/admin/delivery"] });
  }

  return (
    <div dir="rtl" className="space-y-6" data-testid="page-delivery">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">מרכז הודעות יוצאות</p>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">תור הודעות ושיחות חוזרות</h1>
          <p className="text-sm text-muted-foreground max-w-3xl mt-1">
            ניסוח הודעה ללקוח או למשתמש פנימי, שמירה בתור, ושליחה לערוץ המתאים — מייל, WhatsApp, מערכת קולית או n8n.
            שליחה בפועל מתרחשת רק אם הקונקטור מוגדר ומופעל בעמוד <strong>אוטומציות</strong>.
          </p>
        </div>
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button className="gap-1.5" data-testid="button-new-message">
              <Plus className="w-4 h-4" />
              הודעה חדשה
            </Button>
          </DialogTrigger>
          {creating && (
            <MessageDialog
              leads={leads.data ?? []}
              users={users.data ?? []}
              onClose={() => setCreating(false)}
              onSent={async () => {
                await queryClient.invalidateQueries({ queryKey: ["/api/admin/delivery"] });
                setCreating(false);
              }}
            />
          )}
        </Dialog>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiBlock label="סה״כ" value={totals.total} icon={Inbox} />
        <KpiBlock label="בהמתנה" value={totals.pending} />
        <KpiBlock label="נשלחו" value={totals.sent} />
        <KpiBlock label="נכשלו / טיוטות" value={totals.failed} />
      </section>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-right">
            <tr>
              <th className="py-2 px-3 font-medium">#</th>
              <th className="py-2 px-3 font-medium">ערוץ</th>
              <th className="py-2 px-3 font-medium">נמען</th>
              <th className="py-2 px-3 font-medium">תוכן</th>
              <th className="py-2 px-3 font-medium">סטטוס</th>
              <th className="py-2 px-3 font-medium">נוצר</th>
              <th className="py-2 px-3 font-medium w-44 text-left">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {list.isLoading ? (
              <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">טוען...</td></tr>
            ) : (list.data ?? []).length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">אין הודעות בתור עדיין. אפשר ליצור הודעה חדשה.</td></tr>
            ) : (
              (list.data ?? []).map((row) => (
                <tr key={row.id} className="border-t border-border" data-testid={`row-delivery-${row.id}`}>
                  <td className="py-2 px-3 text-muted-foreground tabular-nums">{row.id}</td>
                  <td className="py-2 px-3">
                    <ChannelLabel channel={row.channel} />
                  </td>
                  <td className="py-2 px-3">
                    <div className="font-medium">{row.recipientLabel}</div>
                    <div className="text-xs text-muted-foreground" dir="ltr">{row.toAddress}</div>
                  </td>
                  <td className="py-2 px-3 max-w-xs">
                    {row.subject && <div className="font-medium text-xs truncate">{row.subject}</div>}
                    <div className="text-xs text-muted-foreground truncate" title={row.body}>{row.body}</div>
                  </td>
                  <td className="py-2 px-3">
                    {statusBadge(row.status)}
                    {row.statusDetail && <div className="text-[11px] text-muted-foreground mt-1">{row.statusDetail}</div>}
                  </td>
                  <td className="py-2 px-3 text-xs text-muted-foreground" dir="ltr">
                    {new Date(row.createdAt).toLocaleString("he-IL")}
                  </td>
                  <td className="py-2 px-3 text-left">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" className="gap-1" onClick={() => sendNow(row)} data-testid={`button-send-${row.id}`}>
                        <Send className="w-4 h-4" />שליחה
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive gap-1" onClick={() => remove(row)} data-testid={`button-delete-${row.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function KpiBlock({ label, value, icon: Icon }: { label: string; value: number; icon?: any }) {
  return (
    <Card className="p-4 border border-card-border flex items-center justify-between">
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
      </div>
      {Icon && (
        <span className="rounded-full p-2 bg-muted/50 text-foreground/70">
          <Icon className="w-4 h-4" />
        </span>
      )}
    </Card>
  );
}

function ChannelLabel({ channel }: { channel: string }) {
  const meta = CHANNELS.find((c) => c.value === channel);
  const Icon = meta?.icon ?? Mail;
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="w-4 h-4 text-foreground/70" />
      <span>{meta?.label ?? channel}</span>
    </div>
  );
}

interface MessageDialogProps {
  leads: Client[];
  users: AppUser[];
  onClose: () => void;
  onSent: () => Promise<void>;
}

function MessageDialog({ leads, users, onClose, onSent }: MessageDialogProps) {
  const [channel, setChannel] = useState("email");
  const [recipientType, setRecipientType] = useState<"lead" | "user" | "manual">("lead");
  const [recipientId, setRecipientId] = useState<string>("");
  const [recipientLabel, setRecipientLabel] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function selectRecipient(value: string) {
    setRecipientId(value);
    if (recipientType === "lead") {
      const lead = leads.find((l) => String(l.id) === value);
      if (lead) {
        setRecipientLabel(lead.fullName);
        if (channel === "email") setToAddress(lead.email ?? "");
        else if (channel === "voice" || channel === "whatsapp") setToAddress(lead.phone);
      }
    } else if (recipientType === "user") {
      const u = users.find((x) => String(x.id) === value);
      if (u) {
        setRecipientLabel(u.fullName);
        if (channel === "email") setToAddress(u.email ?? "");
        else if (channel === "voice" || channel === "whatsapp") setToAddress(u.phone ?? "");
      }
    }
  }

  async function submit(send: boolean) {
    setBusy(true);
    setError(null);
    try {
      const created = await apiRequest("POST", "/api/admin/delivery", {
        channel,
        recipientType,
        recipientId: recipientType === "manual" ? null : Number(recipientId || 0) || null,
        recipientLabel: recipientLabel || (recipientType === "manual" ? toAddress : ""),
        toAddress,
        subject,
        body,
        callbackUrl,
      });
      const json = await created.json();
      if (send) {
        await apiRequest("POST", `/api/admin/delivery/${json.id}/send`);
      }
      await onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogContent dir="rtl" className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>הודעה חדשה לתור</DialogTitle>
      </DialogHeader>
      <div className="space-y-3" data-testid="form-message-dialog">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>ערוץ שליחה</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger data-testid="select-channel"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CHANNELS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>סוג נמען</Label>
            <Select value={recipientType} onValueChange={(v) => { setRecipientType(v as any); setRecipientId(""); }}>
              <SelectTrigger data-testid="select-recipient-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lead">פנייה / ליד</SelectItem>
                <SelectItem value="user">משתמש פנימי</SelectItem>
                <SelectItem value="manual">ידני</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {recipientType !== "manual" && (
          <div className="space-y-1.5">
            <Label>בחירת נמען</Label>
            <Select value={recipientId} onValueChange={selectRecipient}>
              <SelectTrigger data-testid="select-recipient"><SelectValue placeholder="בחר/י נמען" /></SelectTrigger>
              <SelectContent>
                {(recipientType === "lead" ? leads : users).map((r: any) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.fullName} {r.email || r.phone ? `· ${r.email || r.phone}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>שם נמען להצגה</Label>
            <Input value={recipientLabel} onChange={(e) => setRecipientLabel(e.target.value)} data-testid="input-recipient-label" />
          </div>
          <div className="space-y-1.5">
            <Label>כתובת / מספר</Label>
            <Input dir="ltr" value={toAddress} onChange={(e) => setToAddress(e.target.value)} required data-testid="input-to-address" />
          </div>
        </div>

        {channel === "email" && (
          <div className="space-y-1.5">
            <Label>נושא המייל</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} data-testid="input-subject" />
          </div>
        )}

        <div className="space-y-1.5">
          <Label>גוף ההודעה</Label>
          <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} required data-testid="input-body" />
        </div>

        <div className="space-y-1.5">
          <Label>Callback URL (אופציונלי)</Label>
          <Input dir="ltr" placeholder="https://..." value={callbackUrl} onChange={(e) => setCallbackUrl(e.target.value)} data-testid="input-callback-url" />
        </div>

        {error && <div className="text-sm text-destructive">{error}</div>}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>ביטול</Button>
          <Button variant="secondary" disabled={busy} onClick={() => submit(false)} data-testid="button-save-only">
            שמירה בתור
          </Button>
          <Button disabled={busy} onClick={() => submit(true)} data-testid="button-save-and-send">
            <Send className="w-4 h-4 ml-1" /> שמירה ושליחה לערוץ
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground border-t border-border pt-2">
          השליחה יוצאת רק אם הקונקטור מוגדר ומופעל בעמוד אוטומציות. אחרת ההודעה נשמרת כטיוטה.
        </p>
      </div>
    </DialogContent>
  );
}

export default function DeliveryPage() {
  return (
    <AdminGate>
      <DeliveryInner />
    </AdminGate>
  );
}
