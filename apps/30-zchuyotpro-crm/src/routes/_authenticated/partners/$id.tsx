import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Save, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { partnerQuery, partnerReferralsQuery, useInvalidatePartners } from "@/features/partners/queries";
import { AllowedFieldsChecklist } from "@/features/partners/components/AllowedFieldsChecklist";
import type { AllowedField } from "@/features/partners/constants";
import { PARTNER_CATEGORY, REFERRAL_STATUS } from "@/features/clients/constants";
import { ReferralStatusBadge } from "@/features/clients/components/badges";
import { formatDateHe } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/partners/$id")({
  head: () => ({ meta: [{ title: "עריכת שותף | זכויות פרו" }] }),
  component: PartnerEditPage,
});

function PartnerEditPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: partner } = useSuspenseQuery(partnerQuery(id));
  const { data: referrals } = useSuspenseQuery(partnerReferralsQuery(id));
  const invalidate = useInvalidatePartners();

  const [form, setForm] = useState({
    company_name: partner.company_name,
    contact_name: partner.contact_name ?? "",
    email: partner.email,
    phone: partner.phone ?? "",
    category: partner.category,
    is_active: partner.is_active,
    auth_user_id: partner.auth_user_id ?? "",
    allowed_client_fields: ((partner.allowed_client_fields as unknown as AllowedField[]) ?? []),
  });
  useEffect(() => {
    setForm({
      company_name: partner.company_name,
      contact_name: partner.contact_name ?? "",
      email: partner.email,
      phone: partner.phone ?? "",
      category: partner.category,
      is_active: partner.is_active,
      auth_user_id: partner.auth_user_id ?? "",
      allowed_client_fields: ((partner.allowed_client_fields as unknown as AllowedField[]) ?? []),
    });
  }, [partner]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("partners").update({
        company_name: form.company_name.trim(),
        contact_name: form.contact_name.trim() || null,
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        category: form.category,
        is_active: form.is_active,
        auth_user_id: form.auth_user_id.trim() || null,
        allowed_client_fields: form.allowed_client_fields,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("נשמר"); invalidate(); },
    onError: (e: Error) => toast.error("שגיאה", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("partners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("נמחק"); invalidate(); navigate({ to: "/partners" }); },
    onError: (e: Error) => toast.error("שגיאה", { description: e.message }),
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/partners" })}><ArrowRight className="h-4 w-4" /></Button>
          <div>
            <h2 className="text-2xl font-bold">{partner.company_name}</h2>
            <p className="text-sm text-muted-foreground">{(PARTNER_CATEGORY as Record<string, string>)[partner.category] ?? partner.category}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="outline" size="sm"><Trash2 className="h-4 w-4 ms-2" /> מחק</Button></AlertDialogTrigger>
            <AlertDialogContent dir="rtl">
              <AlertDialogHeader><AlertDialogTitle>למחוק את השותף?</AlertDialogTitle><AlertDialogDescription>הפניות שכבר נשלחו יימחקו גם הן.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>ביטול</AlertDialogCancel><AlertDialogAction onClick={() => remove.mutate()}>מחק</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin ms-2" /> : <Save className="h-4 w-4 ms-2" />} שמור
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>פרטי שותף</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5"><Label>שם חברה</Label><Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>איש קשר</Label><Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>אימייל</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>טלפון</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>קטגוריה</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(PARTNER_CATEGORY).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>סטטוס</Label>
                <div className="flex items-center gap-3 h-9">
                  <Switch checked={form.is_active} onCheckedChange={(c) => setForm({ ...form, is_active: c })} />
                  <span className="text-sm">{form.is_active ? "פעיל" : "לא פעיל"}</span>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>מזהה משתמש לפורטל (auth_user_id)</Label>
              <Input dir="ltr" placeholder="UUID של חשבון השותף במערכת" value={form.auth_user_id} onChange={(e) => setForm({ ...form, auth_user_id: e.target.value })} />
              <p className="text-xs text-muted-foreground">לאחר שהשותף נרשם, הדבק כאן את ה-UUID שלו כדי להעניק לו גישה לפורטל.</p>
            </div>
            <p className="text-xs text-muted-foreground">שותף במערכת מתאריך {formatDateHe(partner.created_at)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>הרשאות גישה למידע</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">בחר אילו שדות מידע על הלקוח יוצגו לשותף כאשר תופנה אליו הפניה.</p>
            <AllowedFieldsChecklist value={form.allowed_client_fields} onChange={(v) => setForm({ ...form, allowed_client_fields: v })} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>היסטוריית הפניות ({referrals.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>תיק</TableHead>
                <TableHead>לקוח</TableHead>
                <TableHead>תאריך</TableHead>
                <TableHead>סטטוס</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {referrals.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">אין הפניות</TableCell></TableRow>}
              {referrals.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.client?.file_number ?? "—"}</TableCell>
                  <TableCell>{r.client ? <Link to="/clients/$id" params={{ id: r.client.id }} className="hover:underline">{r.client.first_name} {r.client.last_name}</Link> : "—"}</TableCell>
                  <TableCell>{formatDateHe(r.sent_at)}</TableCell>
                  <TableCell><ReferralStatusBadge status={r.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {/* keep referenced for status label */}
      <div className="hidden">{Object.values(REFERRAL_STATUS).join("")}</div>
    </div>
  );
}
