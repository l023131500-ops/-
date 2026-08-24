import { useState } from "react";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { referralsQuery, partnersQuery, clientQuery, meProfileQuery, useInvalidateClient } from "@/features/clients/queries";
import { clientConsentsQuery, hasStandingConsent, CONSENT_STATUS_LABELS } from "@/features/clients/consents";
import { dispatchNotify } from "@/features/partners/queries";
import { triggerN8nWebhook } from "@/lib/n8n";
import { AllowedFieldsPreview } from "@/features/partners/components/AllowedFieldsChecklist";
import { DomainRequirementsPanel } from "@/features/partners/components/DomainRequirementsPanel";
import type { AllowedField } from "@/features/partners/constants";
import { PARTNER_CATEGORY, REFERRAL_STATUS } from "@/features/clients/constants";
import { ReferralStatusBadge } from "@/features/clients/components/badges";
import { formatDateHe } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const STATUS_ORDER = ["sent", "pending", "in_progress", "completed"] as const;

export function ConsentBadge({ status }: { status: string }) {
  const label = (CONSENT_STATUS_LABELS as Record<string, string>)[status] ?? status;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        status === "awaiting_client" && "bg-amber-100 text-amber-800",
        status === "approved" && "bg-emerald-100 text-emerald-800",
        status === "declined" && "bg-red-100 text-red-800",
      )}
    >
      {label}
    </span>
  );
}

function StatusFlow({ status }: { status: string }) {
  if (status === "rejected") return <span className="text-xs text-destructive font-medium">נדחה</span>;
  const currentIdx = STATUS_ORDER.indexOf(status as typeof STATUS_ORDER[number]);
  return (
    <div className="flex items-center gap-1">
      {STATUS_ORDER.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <div className={cn("h-2 w-2 rounded-full", i <= currentIdx ? "bg-primary" : "bg-muted")} />
          {i < STATUS_ORDER.length - 1 && <div className={cn("h-px w-4", i < currentIdx ? "bg-primary" : "bg-muted")} />}
        </div>
      ))}
    </div>
  );
}

export function ReferralsTab({ clientId }: { clientId: string }) {
  const { data: client } = useSuspenseQuery(clientQuery(clientId));
  const { data: me } = useSuspenseQuery(meProfileQuery());
  const { data: referrals } = useSuspenseQuery(referralsQuery(clientId));
  const { data: partners } = useSuspenseQuery(partnersQuery());
  const { data: consents } = useSuspenseQuery(clientConsentsQuery(clientId));
  const invalidate = useInvalidateClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ partner_id: string; notes: string }>({ partner_id: "", notes: "" });

  const create = useMutation({
    mutationFn: async () => {
      if (!draft.partner_id) throw new Error("בחר שותף");
      const sel = partners.find((p) => p.id === draft.partner_id);
      // spec item 4: without a standing consent for the topic, the referral
      // waits for the client's approval in the portal — the partner gains no
      // access (RLS-gated) until the client approves.
      const granted = hasStandingConsent(consents, sel?.category);
      const { data: ref, error } = await supabase.from("partner_referrals").insert({
        tenant_id: client.tenant_id,
        client_id: clientId,
        partner_id: draft.partner_id,
        status: granted ? "sent" : "pending",
        consent_status: granted ? "approved" : "awaiting_client",
        notes: draft.notes || null,
        referred_by: me?.id ?? null,
      }).select("id").single();
      if (error) throw error;
      if (granted) {
        void dispatchNotify("notify-partner", { referralId: ref.id });
        void triggerN8nWebhook("partner-referral", {
          referralId: ref.id,
          partnerId: draft.partner_id,
          clientId,
          tenantId: client.tenant_id,
        });
      } else {
        // let the client know a request is waiting in the personal portal
        // (supabase builders are lazy — must be awaited to actually run)
        await supabase.from("messages").insert({
          tenant_id: client.tenant_id,
          client_id: clientId,
          channel: "internal",
          direction: "outbound",
          content: `בקשת אישור: העברת פרטים אל ${sel?.company_name ?? "שותף"} ממתינה לאישורך בלשונית "שיתופי פעולה" באזור האישי`,
          status: "sent",
          sent_by: me?.id ?? null,
        });
      }
      return { granted };
    },
    onSuccess: ({ granted }) => {
      toast.success(granted ? "הפניה נשלחה" : "ההפניה ממתינה לאישור הלקוח באזור האישי");
      invalidate(clientId); setOpen(false); setDraft({ partner_id: "", notes: "" });
    },
    onError: (e: Error) => toast.error("שגיאה", { description: e.message }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("partner_referrals").update({
        status,
        completed_at: status === "completed" ? new Date().toISOString() : null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("עודכן"); invalidate(clientId); },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>הפניות לשותפים</CardTitle>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 ms-2" /> הפניה חדשה</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>שותף</TableHead>
              <TableHead>קטגוריה</TableHead>
              <TableHead>תאריך שליחה</TableHead>
              <TableHead>אישור לקוח</TableHead>
              <TableHead>סטטוס</TableHead>
              <TableHead>זרימה</TableHead>
              <TableHead>פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {referrals.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">אין הפניות</TableCell></TableRow>}
            {referrals.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.partner?.company_name ?? "—"}</TableCell>
                <TableCell>{r.partner ? (PARTNER_CATEGORY as Record<string, string>)[r.partner.category] ?? r.partner.category : "—"}</TableCell>
                <TableCell>{formatDateHe(r.sent_at)}</TableCell>
                <TableCell><ConsentBadge status={r.consent_status} /></TableCell>
                <TableCell><ReferralStatusBadge status={r.status} /></TableCell>
                <TableCell><StatusFlow status={r.status} /></TableCell>
                <TableCell>
                  <Select value={r.status} onValueChange={(v) => updateStatus.mutate({ id: r.id, status: v })}>
                    <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(REFERRAL_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" dir="rtl">
          <SheetHeader><SheetTitle>הפניה חדשה</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4 px-4">
            <div className="space-y-1.5">
              <Label>שותף</Label>
              <Select value={draft.partner_id} onValueChange={(v) => setDraft({ ...draft, partner_id: v })}>
                <SelectTrigger><SelectValue placeholder="בחר שותף" /></SelectTrigger>
                <SelectContent>
                  {partners.length === 0 && <div className="px-2 py-3 text-sm text-muted-foreground text-center">אין שותפים פעילים</div>}
                  {partners.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.company_name} · {(PARTNER_CATEGORY as Record<string, string>)[p.category] ?? p.category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>הערות</Label>
              <Textarea rows={4} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            </div>
            {draft.partner_id && (() => {
              const sel = partners.find((p) => p.id === draft.partner_id);
              const fields = ((sel?.allowed_client_fields as unknown as AllowedField[]) ?? []);
              const granted = hasStandingConsent(consents, sel?.category);
              return (
                <>
                  <div
                    className={cn(
                      "rounded-md border p-2.5 text-xs font-medium",
                      granted ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800",
                    )}
                  >
                    {granted
                      ? "ללקוח יש הסכמה תקפה לתחום זה — ההפניה תישלח מיד לשותף"
                      : "אין הסכמה תקפה לתחום — ההפניה תמתין לאישור הלקוח באזור האישי, והשותף לא ייחשף לנתונים עד לאישור"}
                  </div>
                  <AllowedFieldsPreview value={fields} />
                  {sel && <DomainRequirementsPanel category={sel.category} allowedFields={fields} clientId={clientId} />}
                </>
              );
            })()}
          </div>
          <SheetFooter className="px-4 mt-4">
            <Button onClick={() => create.mutate()} disabled={create.isPending || !draft.partner_id}>
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin ms-2" />}שלח הפניה
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </Card>
  );
}
