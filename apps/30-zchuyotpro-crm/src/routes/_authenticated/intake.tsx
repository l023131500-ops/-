import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Loader2, LinkIcon, UserPlus, Send, Inbox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { meProfileQuery, partnersQuery } from "@/features/clients/queries";
import { clientConsentsQuery, hasStandingConsent } from "@/features/clients/consents";
import { notifyClientConsentRequest } from "@/features/clients/notifyClient";
import { dispatchNotify } from "@/features/partners/queries";
import { triggerN8nWebhook } from "@/lib/n8n";
import { AllowedFieldsPreview } from "@/features/partners/components/AllowedFieldsChecklist";
import { DomainRequirementsPanel } from "@/features/partners/components/DomainRequirementsPanel";
import type { AllowedField } from "@/features/partners/constants";
import { PARTNER_CATEGORY } from "@/features/clients/constants";
import { INTAKE_CHANNEL, INTAKE_STATUS, INTAKE_STATUS_COLOR, INTAKE_CHANNEL_COLOR } from "@/features/intake/constants";
import { intakeListQuery, intakeStatsQuery, intakeClientMatchesQuery, useInvalidateIntake } from "@/features/intake/queries";
import { formatDateHe } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/intake")({
  head: () => ({ meta: [{ title: "פניות נכנסות | זכויות פרו" }] }),
  component: IntakeBoardPage,
});

function IntakeStatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const label = (INTAKE_STATUS as Record<string, string>)[status] ?? status;
  return <Badge className={cn("border-0", INTAKE_STATUS_COLOR[status])} variant="secondary">{label}</Badge>;
}

function IntakeChannelBadge({ channel }: { channel: string | null }) {
  if (!channel) return null;
  const label = (INTAKE_CHANNEL as Record<string, string>)[channel] ?? channel;
  return <Badge className={cn("border-0", INTAKE_CHANNEL_COLOR[channel] ?? "bg-muted")} variant="secondary">{label}</Badge>;
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card><CardContent className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
    </CardContent></Card>
  );
}

const emptyManual = { channel: "phone", full_name: "", phone: "", email: "", subject: "", body: "" };

function IntakeBoardPage() {
  const [status, setStatus] = useState("all");
  const [channel, setChannel] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState(emptyManual);

  const { data: me } = useSuspenseQuery(meProfileQuery());
  const { data: stats } = useSuspenseQuery(intakeStatsQuery());
  const { data: rows } = useSuspenseQuery(intakeListQuery({ status, channel, search }));
  const invalidate = useInvalidateIntake();

  const selectedRow = rows.find((r) => r.id === selected);

  const copyFormLink = () => {
    if (!me) return;
    const url = `${window.location.origin}${import.meta.env.BASE_URL}intake-form/${me.tenant_id}`;
    void navigator.clipboard.writeText(url);
    toast.success("קישור הטופס הציבורי הועתק", { description: url });
  };

  const createManual = useMutation({
    mutationFn: async () => {
      if (!me) throw new Error("פרופיל לא נמצא");
      if (!manual.full_name.trim()) throw new Error("שם מלא הוא חובה");
      if (!manual.phone.trim() && !manual.email.trim()) throw new Error("נדרש טלפון או אימייל");
      const { error } = await supabase.from("intake_inquiries").insert({
        tenant_id: me.tenant_id,
        channel: manual.channel,
        full_name: manual.full_name.trim(),
        phone: manual.phone.trim() || null,
        email: manual.email.trim() || null,
        subject: manual.subject.trim() || null,
        body: manual.body.trim() || null,
        source_meta: { via: "manual", recorded_by: me.id },
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("הפנייה נרשמה"); invalidate(); setManualOpen(false); setManual(emptyManual); },
    onError: (e: Error) => toast.error("שגיאה", { description: e.message }),
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">פניות נכנסות</h2>
          <p className="text-muted-foreground text-sm mt-1">כל פנייה — טופס, אימייל, וואטסאפ, קולי או טלפון — נכנסת ללוח אחד לבירור וניתוב</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyFormLink}><LinkIcon className="h-4 w-4 ms-2" /> קישור לטופס ציבורי</Button>
          <Button onClick={() => setManualOpen(true)}><Plus className="h-4 w-4 ms-2" /> פנייה ידנית</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatCard label="סה״כ" value={stats.total} color="" />
        <StatCard label="חדש" value={stats.new} color="text-yellow-700 dark:text-yellow-300" />
        <StatCard label="בבירור" value={stats.in_triage} color="text-blue-700 dark:text-blue-300" />
        <StatCard label="נקלט כלקוח" value={stats.converted} color="text-purple-700 dark:text-purple-300" />
        <StatCard label="הופנה לשותף" value={stats.routed} color="text-green-700 dark:text-green-300" />
        <StatCard label="נדחה" value={stats.rejected} color="text-red-700 dark:text-red-300" />
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">חיפוש</Label>
            <div className="relative">
              <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pe-9" placeholder="שם, טלפון, אימייל או נושא..." />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">סטטוס</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">הכל</SelectItem>
                {Object.entries(INTAKE_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">ערוץ</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הערוצים</SelectItem>
                {Object.entries(INTAKE_CHANNEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>התקבלה</TableHead>
                <TableHead>ערוץ</TableHead>
                <TableHead>שם</TableHead>
                <TableHead>יצירת קשר</TableHead>
                <TableHead>נושא</TableHead>
                <TableHead>לקוח</TableHead>
                <TableHead>סטטוס</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  אין פניות — שתפו את הטופס הציבורי או רשמו פנייה ידנית
                </TableCell></TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(r.id)}>
                  <TableCell className="text-sm whitespace-nowrap">{formatDateHe(r.created_at)}</TableCell>
                  <TableCell><IntakeChannelBadge channel={r.channel} /></TableCell>
                  <TableCell className="font-medium">{r.full_name}</TableCell>
                  <TableCell className="text-sm" dir="ltr">{r.phone ?? r.email ?? "—"}</TableCell>
                  <TableCell className="text-sm max-w-48 truncate">{r.subject ?? "—"}</TableCell>
                  <TableCell className="text-sm">
                    {r.client ? `${r.client.first_name} ${r.client.last_name}` : "—"}
                  </TableCell>
                  <TableCell><IntakeStatusBadge status={r.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedRow && (
        <IntakeDetailSheet
          key={selectedRow.id}
          row={selectedRow}
          meId={me?.id ?? null}
          onClose={() => setSelected(null)}
          invalidate={invalidate}
        />
      )}

      <Sheet open={manualOpen} onOpenChange={setManualOpen}>
        <SheetContent side="left" dir="rtl" className="overflow-y-auto">
          <SheetHeader><SheetTitle>רישום פנייה ידנית</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4 px-4">
            <div className="space-y-1.5">
              <Label>ערוץ</Label>
              <Select value={manual.channel} onValueChange={(v) => setManual({ ...manual, channel: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(INTAKE_CHANNEL).filter(([k]) => k !== "form").map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>שם מלא *</Label><Input value={manual.full_name} onChange={(e) => setManual({ ...manual, full_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>טלפון</Label><Input dir="ltr" value={manual.phone} onChange={(e) => setManual({ ...manual, phone: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>אימייל</Label><Input dir="ltr" value={manual.email} onChange={(e) => setManual({ ...manual, email: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>נושא</Label><Input value={manual.subject} onChange={(e) => setManual({ ...manual, subject: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>תוכן הפנייה</Label><Textarea rows={4} value={manual.body} onChange={(e) => setManual({ ...manual, body: e.target.value })} /></div>
          </div>
          <SheetFooter className="px-4 mt-4">
            <Button onClick={() => createManual.mutate()} disabled={createManual.isPending}>
              {createManual.isPending && <Loader2 className="h-4 w-4 animate-spin ms-2" />}
              רישום פנייה
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

type IntakeListRow = {
  id: string;
  tenant_id: string;
  channel: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  subject: string | null;
  body: string | null;
  suggested_category: string | null;
  status: string;
  client_id: string | null;
  referral_id: string | null;
  rejection_reason: string | null;
  created_at: string;
  client: { id: string; file_number: string | null; first_name: string; last_name: string } | null;
  referral: { id: string; status: string; partner: { company_name: string } | null } | null;
  handler: { full_name: string } | null;
};

function IntakeDetailSheet({ row, meId, onClose, invalidate }: {
  row: IntakeListRow;
  meId: string | null;
  onClose: () => void;
  invalidate: () => void;
}) {
  const { data: partners } = useSuspenseQuery(partnersQuery());
  const { data: matches } = useQuery({
    ...intakeClientMatchesQuery({ phone: row.phone, email: row.email }),
    enabled: !row.client_id,
  });
  const [partnerId, setPartnerId] = useState("");
  const { data: clientConsents } = useQuery({
    ...clientConsentsQuery(row.client_id ?? ""),
    enabled: !!row.client_id,
  });
  const [routeNotes, setRouteNotes] = useState(
    `פנייה נכנסת (${(INTAKE_CHANNEL as Record<string, string>)[row.channel] ?? row.channel})${row.subject ? `: ${row.subject}` : ""}${row.body ? `\n${row.body}` : ""}`,
  );
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  // Opening a fresh inquiry moves it to "in_triage" automatically — same
  // mark-on-open behavior as the messages inbox (round 041cd552).
  const markTriage = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("intake_inquiries")
        .update({ status: "in_triage", handled_by: meId })
        .eq("id", row.id).eq("status", "new");
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  useEffect(() => {
    if (row.status === "new") markTriage.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const linkClient = useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase.from("intake_inquiries")
        .update({ client_id: clientId, status: "converted", handled_by: meId, handled_at: new Date().toISOString() })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("הפנייה קושרה ללקוח"); invalidate(); },
    onError: (e: Error) => toast.error("שגיאה", { description: e.message }),
  });

  const createClient = useMutation({
    mutationFn: async () => {
      const parts = row.full_name.trim().split(/\s+/);
      const { data: client, error } = await supabase.from("clients").insert({
        tenant_id: row.tenant_id,
        first_name: parts[0],
        last_name: parts.slice(1).join(" ") || "—",
        phone: row.phone,
        email: row.email,
        status: "pending",
        notes: `נוצר מפנייה נכנסת (${(INTAKE_CHANNEL as Record<string, string>)[row.channel] ?? row.channel})${row.subject ? `: ${row.subject}` : ""}${row.body ? `\n${row.body}` : ""}`,
        assigned_agent_id: meId,
      }).select("id").single();
      if (error) throw error;
      const { error: updErr } = await supabase.from("intake_inquiries")
        .update({ client_id: client.id, status: "converted", handled_by: meId, handled_at: new Date().toISOString() })
        .eq("id", row.id);
      if (updErr) throw updErr;
      return client.id as string;
    },
    onSuccess: () => { toast.success("נוצר לקוח חדש מהפנייה"); invalidate(); },
    onError: (e: Error) => toast.error("שגיאה", { description: e.message }),
  });

  const routeToPartner = useMutation({
    mutationFn: async () => {
      if (!row.client_id) throw new Error("קשרו לקוח לפני ניתוב לשותף");
      if (!partnerId) throw new Error("בחרו שותף");
      const sel = partners.find((p) => p.id === partnerId);
      // spec item 4: no standing topic consent → the referral waits for the
      // client's approval in the portal; the partner sees nothing until then.
      const granted = hasStandingConsent(clientConsents, sel?.category);
      const { data: ref, error } = await supabase.from("partner_referrals").insert({
        tenant_id: row.tenant_id,
        client_id: row.client_id,
        partner_id: partnerId,
        status: granted ? "sent" : "pending",
        consent_status: granted ? "approved" : "awaiting_client",
        notes: routeNotes || null,
        referred_by: meId,
      }).select("id").single();
      if (error) throw error;
      const { error: updErr } = await supabase.from("intake_inquiries")
        .update({ status: "routed", referral_id: ref.id, handled_by: meId, handled_at: new Date().toISOString() })
        .eq("id", row.id);
      if (updErr) throw updErr;
      if (granted) {
        void dispatchNotify("notify-partner", { referralId: ref.id });
        void triggerN8nWebhook("partner-referral", {
          referralId: ref.id,
          partnerId,
          clientId: row.client_id,
          tenantId: row.tenant_id,
        });
      } else {
        // supabase builders are lazy — must be awaited to actually run
        await supabase.from("messages").insert({
          tenant_id: row.tenant_id,
          client_id: row.client_id,
          channel: "internal",
          direction: "outbound",
          content: `בקשת אישור: העברת פרטים אל ${sel?.company_name ?? "שותף"} ממתינה לאישורך בלשונית "שיתופי פעולה" באזור האישי`,
          status: "sent",
          sent_by: meId,
        });
        // proactively reach the client on the real channels too — a request
        // only visible inside the portal stalls for clients who never log in
        void notifyClientConsentRequest({
          tenantId: row.tenant_id,
          clientId: row.client_id,
          sentBy: meId,
          partnerName: sel?.company_name,
        });
      }
      return { granted };
    },
    onSuccess: ({ granted }) => {
      toast.success(granted ? "הפנייה נותבה לשותף" : "הניתוב ממתין לאישור הלקוח באזור האישי");
      invalidate();
    },
    onError: (e: Error) => toast.error("שגיאה", { description: e.message }),
  });

  const reject = useMutation({
    mutationFn: async () => {
      if (!rejectReason.trim()) throw new Error("נדרשת סיבת דחייה");
      const { error } = await supabase.from("intake_inquiries")
        .update({ status: "rejected", rejection_reason: rejectReason.trim(), handled_by: meId, handled_at: new Date().toISOString() })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("הפנייה נדחתה"); invalidate(); onClose(); },
    onError: (e: Error) => toast.error("שגיאה", { description: e.message }),
  });

  const suggestedLabel = row.suggested_category
    ? (PARTNER_CATEGORY as Record<string, string>)[row.suggested_category] ?? row.suggested_category
    : null;
  const sortedPartners = [...partners].sort((a, b) => {
    if (row.suggested_category) {
      const aHit = a.category === row.suggested_category ? 0 : 1;
      const bHit = b.category === row.suggested_category ? 0 : 1;
      if (aHit !== bHit) return aHit - bHit;
    }
    return a.company_name.localeCompare(b.company_name, "he");
  });
  const selPartner = partners.find((p) => p.id === partnerId);
  const isClosed = row.status === "routed" || row.status === "rejected";

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="left" dir="rtl" className="sm:max-w-lg overflow-y-auto">
        <SheetHeader><SheetTitle>פרטי פנייה</SheetTitle></SheetHeader>
        <div className="space-y-4 mt-4 px-4 text-sm pb-8">
          <div className="flex items-center justify-between">
            <IntakeChannelBadge channel={row.channel} />
            <IntakeStatusBadge status={row.status} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><div className="text-muted-foreground text-xs">שם</div><div className="font-medium">{row.full_name}</div></div>
            <div><div className="text-muted-foreground text-xs">התקבלה</div><div>{formatDateHe(row.created_at)}</div></div>
            {row.phone && <div><div className="text-muted-foreground text-xs">טלפון</div><div dir="ltr">{row.phone}</div></div>}
            {row.email && <div><div className="text-muted-foreground text-xs">אימייל</div><div dir="ltr">{row.email}</div></div>}
            {suggestedLabel && <div><div className="text-muted-foreground text-xs">נושא מבוקש</div><div>{suggestedLabel}</div></div>}
            {row.handler && <div><div className="text-muted-foreground text-xs">מטופל ע״י</div><div>{row.handler.full_name}</div></div>}
          </div>
          {row.subject && <div><div className="text-muted-foreground text-xs">נושא</div><div>{row.subject}</div></div>}
          {row.body && <div><div className="text-muted-foreground text-xs">תוכן הפנייה</div><div className="rounded-md border bg-muted/30 p-2 mt-1 whitespace-pre-wrap">{row.body}</div></div>}
          {row.rejection_reason && <div><div className="text-muted-foreground text-xs">סיבת דחייה</div><div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-950/30 p-2 mt-1 whitespace-pre-wrap">{row.rejection_reason}</div></div>}

          <Separator />

          {/* Step 1 — client */}
          <div className="space-y-2">
            <div className="font-medium">לקוח</div>
            {row.client ? (
              <Link to="/clients/$id" params={{ id: row.client.id }} className="text-primary hover:underline">
                {row.client.first_name} {row.client.last_name}{row.client.file_number ? ` · ${row.client.file_number}` : ""}
              </Link>
            ) : (
              <div className="space-y-2">
                {(matches ?? []).length > 0 && (
                  <div className="rounded-md border p-2 space-y-1.5">
                    <div className="text-xs text-muted-foreground">התאמות קיימות לפי טלפון/אימייל:</div>
                    {(matches ?? []).map((m) => (
                      <div key={m.id} className="flex items-center justify-between gap-2">
                        <span>{m.first_name} {m.last_name}{m.file_number ? ` · ${m.file_number}` : ""}</span>
                        <Button size="sm" variant="outline" onClick={() => linkClient.mutate(m.id)} disabled={linkClient.isPending || isClosed}>
                          <LinkIcon className="h-3.5 w-3.5 ms-1" /> קשר
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <Button size="sm" variant="secondary" onClick={() => createClient.mutate()} disabled={createClient.isPending || isClosed}>
                  {createClient.isPending ? <Loader2 className="h-4 w-4 animate-spin ms-2" /> : <UserPlus className="h-4 w-4 ms-2" />}
                  צור לקוח חדש מהפנייה
                </Button>
              </div>
            )}
          </div>

          {/* Step 2 — route to a partner with a field-level preview */}
          {!isClosed && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="font-medium">ניתוב לשותף</div>
                {!row.client_id && <p className="text-xs text-muted-foreground">קשרו לקוח לפנייה כדי לאפשר ניתוב לשותף.</p>}
                <Select value={partnerId} onValueChange={setPartnerId}>
                  <SelectTrigger><SelectValue placeholder="בחרו שותף" /></SelectTrigger>
                  <SelectContent>
                    {sortedPartners.length === 0 && <div className="px-2 py-3 text-sm text-muted-foreground text-center">אין שותפים פעילים</div>}
                    {sortedPartners.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.company_name} · {(PARTNER_CATEGORY as Record<string, string>)[p.category] ?? p.category}
                        {row.suggested_category && p.category === row.suggested_category ? " ★" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selPartner && row.client_id && (
                  <div
                    className={cn(
                      "rounded-md border p-2.5 text-xs font-medium",
                      hasStandingConsent(clientConsents, selPartner.category)
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-amber-200 bg-amber-50 text-amber-800",
                    )}
                  >
                    {hasStandingConsent(clientConsents, selPartner.category)
                      ? "ללקוח יש הסכמה תקפה לתחום זה — הניתוב יישלח מיד לשותף"
                      : "אין הסכמה תקפה לתחום — הניתוב ימתין לאישור הלקוח באזור האישי"}
                  </div>
                )}
                {selPartner && <AllowedFieldsPreview value={((selPartner.allowed_client_fields as unknown as AllowedField[]) ?? [])} />}
                {selPartner && (
                  <DomainRequirementsPanel
                    category={selPartner.category}
                    allowedFields={((selPartner.allowed_client_fields as unknown as AllowedField[]) ?? [])}
                    clientId={row.client_id}
                  />
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs">הערות לשותף</Label>
                  <Textarea rows={3} value={routeNotes} onChange={(e) => setRouteNotes(e.target.value)} />
                </div>
                <Button onClick={() => routeToPartner.mutate()} disabled={routeToPartner.isPending || !row.client_id || !partnerId}>
                  {routeToPartner.isPending ? <Loader2 className="h-4 w-4 animate-spin ms-2" /> : <Send className="h-4 w-4 ms-2" />}
                  אשר והעבר לשותף
                </Button>
              </div>

              <Separator />
              <div className="space-y-2">
                {!showReject ? (
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setShowReject(true)}>דחיית הפנייה</Button>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-xs">סיבת דחייה</Label>
                    <Textarea rows={2} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                    <div className="flex gap-2">
                      <Button variant="destructive" size="sm" onClick={() => reject.mutate()} disabled={reject.isPending}>
                        {reject.isPending && <Loader2 className="h-4 w-4 animate-spin ms-2" />}
                        דחה פנייה
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowReject(false)}>ביטול</Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {row.referral && (
            <>
              <Separator />
              <div className="text-xs text-muted-foreground">
                הופנתה אל {row.referral.partner?.company_name ?? "שותף"} — ניתן לעקוב בעמוד <Link to="/referrals" className="text-primary hover:underline">הפניות לשת״פ</Link>.
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
