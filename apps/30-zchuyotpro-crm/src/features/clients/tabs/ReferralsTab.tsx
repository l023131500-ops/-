import { Fragment, useState } from "react";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { referralsQuery, partnersQuery, clientQuery, meProfileQuery, useInvalidateClient } from "@/features/clients/queries";
import { dispatchNotify } from "@/features/partners/queries";
import { triggerN8nWebhook } from "@/lib/n8n";
import { AllowedFieldsPreview } from "@/features/partners/components/AllowedFieldsChecklist";
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
  const invalidate = useInvalidateClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ partner_id: string; notes: string }>({ partner_id: "", notes: "" });

  const create = useMutation({
    mutationFn: async () => {
      if (!draft.partner_id) throw new Error("בחר שותף");
      const { data: ref, error } = await supabase.from("partner_referrals").insert({
        tenant_id: client.tenant_id,
        client_id: clientId,
        partner_id: draft.partner_id,
        status: "sent",
        notes: draft.notes || null,
        referred_by: me?.id ?? null,
      }).select("id").single();
      if (error) throw error;
      void dispatchNotify("notify-partner", { referralId: ref.id });
      void triggerN8nWebhook("partner-referral", {
        referralId: ref.id,
        partnerId: draft.partner_id,
        clientId,
        tenantId: client.tenant_id,
      });
    },
    onSuccess: () => { toast.success("הפניה נשלחה"); invalidate(clientId); setOpen(false); setDraft({ partner_id: "", notes: "" }); },
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
              <TableHead>סטטוס</TableHead>
              <TableHead>זרימה</TableHead>
              <TableHead>פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {referrals.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">אין הפניות</TableCell></TableRow>}
            {referrals.map((r) => {
              const hasDetails = r.notes || r.partner_notes || r.rejection_reason;
              return (
                <Fragment key={r.id}>
                  <TableRow>
                    <TableCell className="font-medium">{r.partner?.company_name ?? "—"}</TableCell>
                    <TableCell>{r.partner ? (PARTNER_CATEGORY as Record<string, string>)[r.partner.category] ?? r.partner.category : "—"}</TableCell>
                    <TableCell>{formatDateHe(r.sent_at)}</TableCell>
                    <TableCell><ReferralStatusBadge status={r.status} /></TableCell>
                    <TableCell><StatusFlow status={r.status} /></TableCell>
                    <TableCell>
                      <Select value={r.status} onValueChange={(v) => updateStatus.mutate({ id: r.id, status: v })}>
                        <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(REFERRAL_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                  {hasDetails && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={6} className="py-2 bg-muted/20">
                        <div className="space-y-1.5 text-xs">
                          {r.notes && <div><span className="text-muted-foreground">הערות פנימיות: </span><span className="whitespace-pre-wrap">{r.notes}</span></div>}
                          {r.partner_notes && <div><span className="text-muted-foreground">הערות השותף: </span><span className="whitespace-pre-wrap">{r.partner_notes}</span></div>}
                          {r.rejection_reason && <div className="text-red-700 dark:text-red-400"><span className="text-muted-foreground">סיבת דחייה: </span><span className="whitespace-pre-wrap">{r.rejection_reason}</span></div>}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
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
              return <AllowedFieldsPreview value={fields} />;
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
