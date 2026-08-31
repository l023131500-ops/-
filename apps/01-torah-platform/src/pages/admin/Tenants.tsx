import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Building2, KeyRound, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { buildInviteUrl, sanitizePublicUrls } from "@/lib/site";

const TYPES = [
  { v: "religious_council", l: "מועצה דתית" },
  { v: "organization", l: "ארגון" },
  { v: "synagogue", l: "בית כנסת" },
  { v: "maggid", l: "מגיד שיעור" },
  { v: "rabbi", l: "רב" },
  { v: "mori_horaah", l: "מורה הוראה" },
];

const generatePassword = () => {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

export default function Tenants() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", type: "organization", display_name: "", email: "", initial_password: generatePassword() });
  const [createdInvite, setCreatedInvite] = useState<any>(null);

  const { data } = useQuery({
    queryKey: ["all-tenants"],
    queryFn: async () => {
      const { data } = await supabase.from("tenants").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { name, slug, type, display_name, email, initial_password } = form;
      const { data: tenant, error } = await supabase.from("tenants")
        .insert({ name, slug, type, display_name, status: "pending" })
        .select().single();
      if (error) throw error;
      const { data: invite, error: iErr } = await supabase.from("tenant_invites")
        .insert({ tenant_id: tenant.id, email: email.trim().toLowerCase(), full_name: display_name || name, initial_password, role: "tenant_admin" })
        .select().single();
      if (iErr) throw iErr;
      return { tenant, invite };
    },
    onSuccess: ({ invite }) => {
      toast.success("ארגון נוסף — ממתין לאישור, הזמנת כניסה נוצרה");
      setOpen(false);
      setCreatedInvite(invite);
      setForm({ name: "", slug: "", type: "organization", display_name: "", email: "", initial_password: generatePassword() });
      qc.invalidateQueries({ queryKey: ["all-tenants"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const copyInviteDetails = (inv: any) => {
    const url = buildInviteUrl(inv.invite_code, inv.email);
    const raw = `🎓 פורטל חדש – איגוד השיעורים\n\nשלום ${inv.full_name},\nנפתח עבורך פורטל אישי במערכת.\n\n🔗 לחץ להפעלה (הקוד והמייל ימולאו אוטומטית):\n${url}\n\n📧 מייל: ${inv.email}\n🔑 קוד הזמנה: ${inv.invite_code}\n🔒 סיסמה ראשונית: ${inv.initial_password}\n\nניתן לשנות את הסיסמה לאחר הכניסה.`;
    navigator.clipboard.writeText(sanitizePublicUrls(raw));
    toast.success("פרטי ההזמנה הועתקו! ניתן לשלוח בוואטסאפ או במייל");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl">ארגונים</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="ml-2 h-4 w-4" /> ארגון חדש</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>הוספת ארגון</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>שם פנימי *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>שם תצוגה</Label><Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} /></div>
              <div><Label>Slug (כתובת) *</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="kehilat-shalom" /></div>
              <div>
                <Label>סוג</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>מייל איש קשר *</Label><Input type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" /></div>
              <div>
                <Label className="flex items-center justify-between">
                  <span>סיסמה ראשונית *</span>
                  <button type="button" onClick={() => setForm(f => ({ ...f, initial_password: generatePassword() }))} className="text-xs text-primary hover:underline font-medium">צור סיסמה חדשה</button>
                </Label>
                <Input value={form.initial_password} onChange={(e) => setForm({ ...form, initial_password: e.target.value })} dir="ltr" className="font-mono tracking-wider" />
              </div>
              <p className="text-xs text-muted-foreground">הארגון ייווצר במצב "ממתין לאישור" יחד עם הזמנת כניסה למנהל הארגון.</p>
              <Button onClick={() => create.mutate()} disabled={!form.name || !form.slug || !form.email || create.isPending}>
                <KeyRound className="ml-2 h-4 w-4" />{create.isPending ? "יוצר..." : "צור והנפק הזמנה"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!createdInvite} onOpenChange={(o) => !o && setCreatedInvite(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" />ההזמנה נוצרה בהצלחה</DialogTitle></DialogHeader>
          {createdInvite && (
            <div className="space-y-3 text-sm">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div><span className="text-muted-foreground">מייל: </span><span dir="ltr">{createdInvite.email}</span></div>
                <div><span className="text-muted-foreground">קוד הזמנה: </span><code className="bg-card px-2 py-0.5 rounded">{createdInvite.invite_code}</code></div>
                <div><span className="text-muted-foreground">סיסמה: </span><code className="bg-card px-2 py-0.5 rounded">{createdInvite.initial_password}</code></div>
                <div className="text-xs text-muted-foreground pt-2 border-t border-border">שלח למנהל הארגון את הקוד והסיסמה. הוא יפעיל בכתובת: <code dir="ltr">/invite</code></div>
              </div>
              <Button onClick={() => copyInviteDetails(createdInvite)} className="w-full gap-2"><Copy className="h-4 w-4" />העתק הודעה מוכנה לשליחה</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(data || []).map((t: any) => (
          <Link key={t.id} to={`/admin/tenants/${t.id}`}>
            <Card className="h-full hover:shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3 mb-3"><Building2 className="h-8 w-8 text-primary" /><div className="flex-1">
                  <div className="font-medium">{t.display_name || t.name}</div>
                  <div className="text-sm text-muted-foreground">{t.slug}</div>
                </div></div>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary">{TYPES.find((x) => x.v === t.type)?.l || t.type}</Badge>
                  <Badge variant={t.status === "active" ? "success" : "outline"}>{t.status}</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
