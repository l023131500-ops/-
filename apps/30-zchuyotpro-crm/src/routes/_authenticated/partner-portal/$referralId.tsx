import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { myPartnerQuery, portalReferralQuery, dispatchNotify } from "@/features/partners/queries";
import { familyQuery, financialQuery, housingQuery, vehiclesQuery, clientEntitlementsQuery, documentsQuery, messagesQuery, meProfileQuery } from "@/features/clients/queries";
import { ALLOWED_CLIENT_FIELDS, type AllowedField } from "@/features/partners/constants";
import { REFERRAL_STATUS, MARITAL_STATUS, CHANNEL } from "@/features/clients/constants";
import { ReferralStatusBadge } from "@/features/clients/components/badges";
import { formatDateHe, formatDateTimeHe } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/partner-portal/$referralId")({
  head: () => ({ meta: [{ title: "פרטי הפניה | פורטל שותפים" }] }),
  component: PortalDetail,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm mt-0.5">{value ?? "—"}</div>
    </div>
  );
}

function PortalDetail() {
  const { referralId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: partner } = useSuspenseQuery(myPartnerQuery());
  const { data: referral } = useSuspenseQuery(portalReferralQuery(referralId));
  const { data: me } = useSuspenseQuery(meProfileQuery());

  const allowed = ((partner?.allowed_client_fields as unknown as AllowedField[]) ?? []);
  const can = (k: AllowedField) => allowed.includes(k);
  const client = referral.client!;

  // Conditional data queries — partner only sees what they're allowed.
  const family = useQuery({ ...familyQuery(client.id), enabled: can("family_members") });
  const financial = useQuery({ ...financialQuery(client.id), enabled: can("financial_profile") });
  const housing = useQuery({ ...housingQuery(client.id), enabled: can("housing_profile") });
  const vehicles = useQuery({ ...vehiclesQuery(client.id), enabled: can("vehicles") });
  const cEnts = useQuery({ ...clientEntitlementsQuery(client.id), enabled: can("entitlements") });
  const docs = useQuery({ ...documentsQuery(client.id), enabled: can("documents") });
  const messages = useQuery(messagesQuery(client.id));

  const [status, setStatus] = useState(referral.status);
  const [partnerNotes, setPartnerNotes] = useState(referral.partner_notes ?? "");
  const [rejectionReason, setRejectionReason] = useState(referral.rejection_reason ?? "");
  const [msg, setMsg] = useState("");

  const updateStatus = useMutation({
    mutationFn: async () => {
      if (status === "completed" && !partnerNotes.trim()) throw new Error("נדרשות הערות בעת השלמה");
      if (status === "rejected" && !rejectionReason.trim()) throw new Error("נדרשת סיבת דחייה");
      const { error } = await supabase.from("partner_referrals").update({
        status,
        partner_notes: partnerNotes.trim() || null,
        rejection_reason: status === "rejected" ? rejectionReason.trim() : null,
        completed_at: status === "completed" ? new Date().toISOString() : null,
      }).eq("id", referralId);
      if (error) throw error;
      void dispatchNotify("notify-admin", { referralId, newStatus: status, notes: partnerNotes.trim() || null });
    },
    onSuccess: () => { toast.success("הסטטוס עודכן"); qc.invalidateQueries({ queryKey: ["portal-referral", referralId] }); qc.invalidateQueries({ queryKey: ["portal-referrals"] }); },
    onError: (e: Error) => toast.error("שגיאה", { description: e.message }),
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!msg.trim()) throw new Error("הקלד הודעה");
      const { error } = await supabase.from("messages").insert({
        tenant_id: client.tenant_id,
        client_id: client.id,
        partner_id: partner!.id,
        channel: "internal",
        direction: "outbound",
        status: "sent",
        content: msg.trim(),
        sent_by: me?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => { setMsg(""); toast.success("ההודעה נשלחה"); qc.invalidateQueries({ queryKey: ["messages", client.id] }); },
    onError: (e: Error) => toast.error("שגיאה", { description: e.message }),
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/partner-portal" })}><ArrowRight className="h-4 w-4" /></Button>
          <div>
            <h2 className="text-2xl font-bold">{can("full_name") ? `${client.first_name} ${client.last_name}` : `תיק ${client.file_number}`}</h2>
            <p className="text-sm text-muted-foreground">תיק {client.file_number} · נשלח {formatDateHe(referral.sent_at)}</p>
          </div>
        </div>
        <ReferralStatusBadge status={referral.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Section title="פרטי לקוח">
            <div className="grid grid-cols-2 gap-3">
              {can("full_name") && <Field label={ALLOWED_CLIENT_FIELDS.full_name} value={`${client.first_name} ${client.last_name}`} />}
              {can("id_number") && <Field label={ALLOWED_CLIENT_FIELDS.id_number} value={client.id_number} />}
              {can("phone") && <Field label={ALLOWED_CLIENT_FIELDS.phone} value={client.phone} />}
              {can("email") && <Field label={ALLOWED_CLIENT_FIELDS.email} value={client.email} />}
              {can("birth_date") && <Field label={ALLOWED_CLIENT_FIELDS.birth_date} value={client.birth_date ? formatDateHe(client.birth_date) : null} />}
              {can("marital_status") && <Field label={ALLOWED_CLIENT_FIELDS.marital_status} value={client.marital_status ? (MARITAL_STATUS as Record<string, string>)[client.marital_status] : null} />}
            </div>
          </Section>

          {can("family_members") && family.data && (
            <Section title="בני משפחה">
              {family.data.length === 0 ? <p className="text-sm text-muted-foreground">אין נתונים</p> : (
                <Table><TableHeader><TableRow><TableHead>שם</TableHead><TableHead>קשר</TableHead><TableHead>תז</TableHead></TableRow></TableHeader>
                  <TableBody>{family.data.map((f) => <TableRow key={f.id}><TableCell>{f.first_name} {f.last_name}</TableCell><TableCell>{f.relation}</TableCell><TableCell className="font-mono text-xs">{f.id_number ?? "—"}</TableCell></TableRow>)}</TableBody></Table>
              )}
            </Section>
          )}

          {can("financial_profile") && (
            <Section title="פרופיל פיננסי">
              {!financial.data ? <p className="text-sm text-muted-foreground">אין נתונים</p> : (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="סטטוס תעסוקה" value={financial.data.employment_status} />
                  <Field label="הכנסה נטו חודשית" value={financial.data.net_monthly_income ? `₪${Number(financial.data.net_monthly_income).toLocaleString()}` : null} />
                  <Field label="הכנסה ברוטו חודשית" value={financial.data.gross_monthly_income ? `₪${Number(financial.data.gross_monthly_income).toLocaleString()}` : null} />
                  <Field label="הכנסת בן/בת זוג" value={financial.data.spouse_income ? `₪${Number(financial.data.spouse_income).toLocaleString()}` : null} />
                </div>
              )}
            </Section>
          )}

          {can("housing_profile") && (
            <Section title="פרופיל דיור">
              {!housing.data ? <p className="text-sm text-muted-foreground">אין נתונים</p> : (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="סוג מגורים" value={housing.data.housing_type} />
                  <Field label="שכ״ד חודשי" value={housing.data.monthly_rent ? `₪${Number(housing.data.monthly_rent).toLocaleString()}` : null} />
                  <Field label="משכנתא" value={housing.data.has_mortgage ? "כן" : "לא"} />
                </div>
              )}
            </Section>
          )}

          {can("vehicles") && vehicles.data && (
            <Section title="רכבים">
              {vehicles.data.length === 0 ? <p className="text-sm text-muted-foreground">אין רכבים</p> : (
                <Table><TableHeader><TableRow><TableHead>לוחית</TableHead><TableHead>יצרן/דגם</TableHead><TableHead>שנה</TableHead></TableRow></TableHeader>
                  <TableBody>{vehicles.data.map((v) => <TableRow key={v.id}><TableCell className="font-mono">{v.license_plate}</TableCell><TableCell>{v.make} {v.model}</TableCell><TableCell>{v.year ?? "—"}</TableCell></TableRow>)}</TableBody></Table>
              )}
            </Section>
          )}

          {can("entitlements") && cEnts.data && (
            <Section title="זכאויות">
              {cEnts.data.length === 0 ? <p className="text-sm text-muted-foreground">אין נתונים</p> : (
                <div className="text-sm">{cEnts.data.length} זכאויות פעילות</div>
              )}
            </Section>
          )}

          {can("documents") && docs.data && (
            <Section title="מסמכים">
              {docs.data.length === 0 ? <p className="text-sm text-muted-foreground">אין מסמכים</p> : (
                <ul className="space-y-1 text-sm">{docs.data.map((d) => <li key={d.id} className="flex items-center justify-between rounded-md border p-2"><span>{d.file_name}</span><span className="text-xs text-muted-foreground">{formatDateHe(d.created_at)}</span></li>)}</ul>
              )}
            </Section>
          )}
        </div>

        <div className="space-y-4">
          <Section title="עדכון סטטוס">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>סטטוס</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(REFERRAL_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>הערות{status === "completed" && " *"}</Label><Textarea rows={3} value={partnerNotes} onChange={(e) => setPartnerNotes(e.target.value)} /></div>
              {status === "rejected" && <div className="space-y-1.5"><Label>סיבת דחייה *</Label><Textarea rows={2} value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} /></div>}
              <Button className="w-full" onClick={() => updateStatus.mutate()} disabled={updateStatus.isPending}>
                {updateStatus.isPending && <Loader2 className="h-4 w-4 animate-spin ms-2" />}עדכן
              </Button>
            </div>
          </Section>

          <Section title="שלח הודעה ללקוח">
            <div className="space-y-3">
              <div className="space-y-2 max-h-48 overflow-y-auto pe-1">
                {messages.data?.slice(-5).map((m) => (
                  <div key={m.id} className="rounded-md border bg-muted/30 p-2 text-xs">
                    <div className="text-muted-foreground mb-1">{(CHANNEL as Record<string, string>)[m.channel] ?? m.channel} · {formatDateTimeHe(m.created_at)}</div>
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  </div>
                ))}
              </div>
              <Textarea rows={3} placeholder="כתוב הודעה ללקוח..." value={msg} onChange={(e) => setMsg(e.target.value)} />
              <Button className="w-full" onClick={() => sendMessage.mutate()} disabled={sendMessage.isPending || !msg.trim()}>
                {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin ms-2" /> : <Send className="h-4 w-4 ms-2" />} שלח
              </Button>
            </div>
          </Section>
        </div>
      </div>
      <Input className="hidden" />
    </div>
  );
}
