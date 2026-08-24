import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Save, ExternalLink, Plug, CheckCircle2, XCircle, Phone, Copy, KeyRound, Mail, MessageCircle, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { myTenantQuery, tenantProfilesQuery, staffInvitesQuery, type TenantSettings, type IntegrationSettings, type NotificationSettings, type VoiceSettings, type EmailSettings, type WhatsappSettings } from "@/features/settings/queries";
import { meProfileQuery } from "@/features/clients/queries";
import { CustomizeTab } from "@/features/customize/CustomizeTab";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "הגדרות | זכויות פרו" }] }),
  component: SettingsPage,
});



function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">הגדרות</h2>
        <p className="text-muted-foreground text-sm mt-1">ניהול משתמשים, שותפים, זכאויות ואינטגרציות</p>
      </div>
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="users">צוות והרשאות</TabsTrigger>
          <TabsTrigger value="partners">שותפים</TabsTrigger>
          <TabsTrigger value="entitlements">זכאויות</TabsTrigger>
          <TabsTrigger value="integrations">אינטגרציות</TabsTrigger>
          <TabsTrigger value="voice">מערכת קולית</TabsTrigger>
          <TabsTrigger value="email">סנכרון מייל</TabsTrigger>
          <TabsTrigger value="whatsapp">וואטסאפ</TabsTrigger>
          <TabsTrigger value="customize">התאמה אישית + AI</TabsTrigger>
          <TabsTrigger value="notifications">התראות</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4"><UsersTab /></TabsContent>
        <TabsContent value="partners" className="mt-4">
          <Card><CardContent className="p-6 flex items-center justify-between">
            <p className="text-sm">ניהול שותפים מתבצע במסך הייעודי.</p>
            <Button asChild><Link to="/partners">פתח שותפים <ExternalLink className="h-4 w-4 me-1" /></Link></Button>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="entitlements" className="mt-4">
          <Card><CardContent className="p-6 flex items-center justify-between">
            <p className="text-sm">ניהול וייבוא זכאויות מתבצע במסך הייעודי.</p>
            <Button asChild><Link to="/entitlements">פתח זכאויות <ExternalLink className="h-4 w-4 me-1" /></Link></Button>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="integrations" className="mt-4"><IntegrationsTab /></TabsContent>
        <TabsContent value="voice" className="mt-4"><VoiceTab /></TabsContent>
        <TabsContent value="email" className="mt-4"><EmailTab /></TabsContent>
        <TabsContent value="whatsapp" className="mt-4"><WhatsappTab /></TabsContent>
        <TabsContent value="customize" className="mt-4"><CustomizeTab /></TabsContent>
        <TabsContent value="notifications" className="mt-4"><NotificationsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// Staff roles (flagship spec item 6). The DB enforces every rule below via
// RLS + the profiles privilege-guard trigger; this screen only mirrors it.
const ROLE_LABELS: Record<string, string> = {
  admin: "מנהל ראשי",
  manager: "מנהל",
  agent: "סוכן",
  viewer: "צופה (קריאה בלבד)",
};

const ROLE_CAPABILITIES: { role: string; desc: string }[] = [
  { role: "admin", desc: "שליטה מלאה: צוות ותפקידים, הגדרות והאינטגרציות, שותפים וקטלוגים, וכל נתוני הלקוחות" },
  { role: "manager", desc: "כל נתוני הלקוחות + הגדרות המשרד, שותפים וקטלוגים. לא מנהל צוות ותפקידים" },
  { role: "agent", desc: "עבודה שוטפת על תיקי לקוחות: פרטים, מסמכים, הודעות, משימות והפניות. ללא הגדרות" },
  { role: "viewer", desc: "צפייה בלבד בכל המסכים — שום כתיבה, מחיקה או העלאת קבצים" },
];

function UsersTab() {
  const { data: profiles, isLoading } = useQuery(tenantProfilesQuery());
  const { data: tenant } = useQuery(myTenantQuery());
  const { data: me } = useQuery(meProfileQuery());
  const { data: invites } = useQuery(staffInvitesQuery());
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("agent");
  const [loading, setLoading] = useState(false);

  const isAdmin = me?.role === "admin";
  const canManage = me?.role === "admin" || me?.role === "manager";
  const settings = (tenant?.settings ?? {}) as TenantSettings;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["tenant-profiles"] });
    qc.invalidateQueries({ queryKey: ["staff-invites"] });
  };

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      // .select() verifies rows were actually affected: before the
      // staff-access-control migration this update silently hit 0 rows.
      const { data, error } = await supabase
        .from("profiles")
        .update({ role: role as "admin" | "manager" | "agent" | "viewer" })
        .eq("id", id)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("לא עודכן — נדרשת הרשאת מנהל ראשי");
    },
    onSuccess: () => {
      toast.success("התפקיד עודכן");
      invalidate();
    },
    onError: (e: Error) => toast.error("עדכון התפקיד נכשל", { description: e.message }),
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from("profiles").delete().eq("id", id).select("id");
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("לא הוסר — נדרשת הרשאת מנהל ראשי");
    },
    onSuccess: () => {
      toast.success("חבר הצוות הוסר", { description: "חשבון ההתחברות נשאר קיים אך אין לו עוד גישה למשרד" });
      invalidate();
    },
    onError: (e: Error) => toast.error("הסרה נכשלה", { description: e.message }),
  });

  const removeInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("staff_invites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ההזמנה בוטלה");
      invalidate();
    },
    onError: (e: Error) => toast.error("ביטול ההזמנה נכשל", { description: e.message }),
  });

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant?.id) return;
    setLoading(true);

    // Record an invitation first — signup claims it by email and receives the
    // chosen role (the old flow always produced 'agent' regardless of the
    // select). If the invites table is not there yet (migration pending on
    // the project), fall back to the legacy metadata path so inviting keeps
    // working; role will then be 'agent' until the migration is applied.
    const { error: inviteErr } = await supabase.from("staff_invites").insert({
      tenant_id: tenant.id,
      email: email.trim().toLowerCase(),
      role: role as "admin" | "manager" | "agent" | "viewer",
      invited_by: me?.id ?? null,
    });
    if (inviteErr && !/does not exist|schema cache/i.test(inviteErr.message)) {
      setLoading(false);
      toast.error("יצירת ההזמנה נכשלה", { description: inviteErr.message });
      return;
    }

    const tempPassword = Math.random().toString(36).slice(2) + "Aa1!";
    const { error } = await supabase.auth.signUp({
      email,
      password: tempPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: inviteErr
          ? { full_name: name, tenant_id: tenant.id }
          : { full_name: name },
      },
    });
    setLoading(false);
    if (error) { toast.error("שגיאה ביצירת משתמש", { description: error.message }); return; }
    toast.success("המשתמש נוצר", { description: `סיסמה זמנית: ${tempPassword}` });
    setOpen(false); setEmail(""); setName("");
    invalidate();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">צוות המשרד</CardTitle>
          {isAdmin && (
            <Button size="sm" onClick={() => setOpen(!open)}>{open ? "ביטול" : "+ הזמן חבר צוות"}</Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {open && isAdmin && (
            <form onSubmit={invite} className="grid gap-3 sm:grid-cols-4 p-3 bg-muted/40 rounded">
              <div><Label>שם מלא</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
              <div><Label>אימייל</Label><Input type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <div>
                <Label>תפקיד</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={loading} className="w-full">
                  {loading && <Loader2 className="h-4 w-4 animate-spin me-1" />} צור משתמש
                </Button>
              </div>
            </form>
          )}
          {(invites ?? []).length > 0 && (
            <div className="rounded border bg-muted/20 p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">הזמנות ממתינות</p>
              {(invites ?? []).map((inv) => (
                <div key={inv.id} className="flex items-center justify-between text-sm">
                  <span dir="ltr">{inv.email}</span>
                  <span className="flex items-center gap-2">
                    <Badge variant="secondary">{ROLE_LABELS[inv.role] ?? inv.role}</Badge>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeInvite.mutate(inv.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </span>
                </div>
              ))}
            </div>
          )}
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>שם</TableHead>
                  <TableHead>תפקיד</TableHead>
                  <TableHead>הצטרף</TableHead>
                  {isAdmin && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(profiles ?? []).map((p) => {
                  const isSelf = p.auth_user_id === me?.auth_user_id;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {p.full_name}
                        {isSelf && <Badge variant="outline" className="ms-2 text-[10px]">אני</Badge>}
                      </TableCell>
                      <TableCell>
                        {isAdmin && !isSelf ? (
                          <Select value={p.role} onValueChange={(v) => updateRole.mutate({ id: p.id, role: v })}>
                            <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(ROLE_LABELS).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="secondary">{ROLE_LABELS[p.role] ?? p.role}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString("he-IL")}
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          {!isSelf && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive"
                              onClick={() => {
                                if (window.confirm(`להסיר את ${p.full_name} מצוות המשרד?`)) removeMember.mutate(p.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
                {(profiles ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={isAdmin ? 4 : 3} className="text-center text-sm text-muted-foreground py-6">אין משתמשים</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {canManage && <AccessScopeCard tenantId={tenant?.id} settings={settings} />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> מה כל תפקיד רואה ועושה</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {ROLE_CAPABILITIES.map((r) => (
              <div key={r.role} className="flex gap-3 text-sm border-b pb-2 last:border-b-0">
                <Badge variant="secondary" className="shrink-0 self-start">{ROLE_LABELS[r.role]}</Badge>
                <span className="text-muted-foreground">{r.desc}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            הכללים נאכפים ברמת מסד הנתונים (RLS), לא רק במסכים — גם גישה ישירה ל-API כפופה להם.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Per-tenant client scoping (flagship spec item 6): when on, agents and
// viewers see only clients assigned to them (or not yet assigned) — across
// every screen, enforced by the staff_sees_client() RLS helper.
function AccessScopeCard({ tenantId, settings }: { tenantId?: string; settings: TenantSettings }) {
  const qc = useQueryClient();
  const [restrict, setRestrict] = useState(!!settings.access?.restrict_to_assigned);
  const [saving, setSaving] = useState(false);
  useEffect(() => setRestrict(!!settings.access?.restrict_to_assigned), [settings.access?.restrict_to_assigned]);

  async function save(value: boolean) {
    if (!tenantId) return;
    setRestrict(value);
    setSaving(true);
    const newSettings: TenantSettings = { ...settings, access: { ...settings.access, restrict_to_assigned: value } };
    const { data, error } = await supabase.from("tenants").update({ settings: newSettings }).eq("id", tenantId).select("id");
    setSaving(false);
    if (error || !data || data.length === 0) {
      setRestrict(!value);
      toast.error("שמירה נכשלה", { description: error?.message ?? "נדרשת הרשאת מנהל" });
      return;
    }
    toast.success(value ? "מעכשיו סוכנים וצופים רואים רק לקוחות שהוקצו להם" : "כל הצוות רואה את כל הלקוחות");
    qc.invalidateQueries({ queryKey: ["my-tenant"] });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">תחום ראייה של הצוות</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="restrict-assigned">סוכנים וצופים רואים רק לקוחות שהוקצו להם</Label>
            <p className="text-xs text-muted-foreground mt-1">
              כבוי: כל הצוות רואה את כל לקוחות המשרד (ברירת המחדל). דלוק: סוכן רואה רק
              תיקים שהוקצו לו — וגם תיקים שטרם הוקצו לאף אחד, כדי שפניות חדשות לא ייעלמו.
              מנהלים רואים תמיד הכל. נאכף ברמת מסד הנתונים על כל המסכים, הדוחות והחיפוש.
            </p>
          </div>
          <Switch id="restrict-assigned" checked={restrict} disabled={saving} onCheckedChange={save} />
        </div>
      </CardContent>
    </Card>
  );
}

function IntegrationsTab() {
  const { data: tenant, isLoading } = useQuery(myTenantQuery());
  const qc = useQueryClient();
  const settings = (tenant?.settings ?? {}) as TenantSettings;
  const integrations = settings.integrations ?? {};
  const [form, setForm] = useState<IntegrationSettings>(integrations);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!tenant?.id) return;
    setSaving(true);
    const newSettings: TenantSettings = { ...settings, integrations: form };
    const { error } = await supabase.from("tenants").update({ settings: newSettings }).eq("id", tenant.id);
    setSaving(false);
    if (error) { toast.error("שמירה נכשלה", { description: error.message }); return; }
    toast.success("ההגדרות נשמרו");
    qc.invalidateQueries({ queryKey: ["my-tenant"] });
  }

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  const services = [
    { key: "n8n_base_url" as const, label: "n8n Webhook Base URL", placeholder: "https://n8n.example.com" },
    { key: "whatsapp_instance_id" as const, label: "WhatsApp Instance ID (Green API)", placeholder: "instance-xxxx" },
    { key: "whatsapp_api_token" as const, label: "WhatsApp API Token (Green API)", placeholder: "••••" },
    { key: "nedarim_token" as const, label: "Nedarim Plus API Token", placeholder: "••••" },
    { key: "imot_token" as const, label: "Imot HaMashiach connection", placeholder: "••••" },
    { key: "email_sender" as const, label: "Email sender address", placeholder: "no-reply@example.com" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Plug className="h-4 w-4" /> אינטגרציות</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {services.map((s) => {
          const value = form[s.key] ?? "";
          const status = value ? "connected" : "not_configured";
          return (
            <div key={s.key} className="grid gap-2 sm:grid-cols-[1fr_140px]">
              <div>
                <Label className="flex items-center gap-2">
                  {s.label}
                  {status === "connected" ? (
                    <Badge className="bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200 gap-1">
                      <CheckCircle2 className="h-3 w-3" /> מחובר
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" /> לא מוגדר</Badge>
                  )}
                </Label>
                <Input
                  dir="ltr"
                  placeholder={s.placeholder}
                  value={value}
                  onChange={(e) => setForm({ ...form, [s.key]: e.target.value })}
                />
              </div>
            </div>
          );
        })}
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin me-1" />}
          <Save className="h-4 w-4 me-1" /> שמור הגדרות
        </Button>
      </CardContent>
    </Card>
  );
}

const ID_METHOD_LABELS: Record<string, string> = {
  phone_id: "טלפון + תעודת זהות (מומלץ)",
  phone: "טלפון בלבד — תעודת זהות רק כשהמספר לא מזוהה",
  id: "תעודת זהות בלבד",
};

function VoiceTab() {
  const { data: tenant, isLoading } = useQuery(myTenantQuery());
  const qc = useQueryClient();
  const settings = (tenant?.settings ?? {}) as TenantSettings;
  const [form, setForm] = useState<VoiceSettings>(settings.voice ?? {});
  const [saving, setSaving] = useState(false);
  // window is unavailable during SSR — resolve the public origin on the client
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  async function save() {
    if (!tenant?.id) return;
    if (form.enabled && !form.api_secret) {
      toast.error("להפעלת השלוחה יש ליצור מפתח סודי");
      return;
    }
    setSaving(true);
    const newSettings: TenantSettings = { ...settings, voice: form };
    const { error } = await supabase.from("tenants").update({ settings: newSettings }).eq("id", tenant.id);
    setSaving(false);
    if (error) { toast.error("שמירה נכשלה", { description: error.message }); return; }
    toast.success("הגדרות המערכת הקולית נשמרו");
    qc.invalidateQueries({ queryKey: ["my-tenant"] });
  }

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  const apiLink = tenant && form.api_secret && origin
    ? `${origin}${import.meta.env.BASE_URL}api/public/yemot-ivr?tenant=${tenant.id}&key=${form.api_secret}`
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Phone className="h-4 w-4" /> מערכת קולית — ימות המשיח</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          שלוחה טלפונית ללקוחות: זיהוי אוטומטי לפי טלפון ותעודת זהות, רישום הוצאה או הכנסה ליומן
          התזרים (מסומן במקור &quot;קו טלפוני&quot;), שמיעת סיכום החודש ומצב התקציב. כל פעולה נרשמת גם
          בציר ההודעות של הלקוח.
        </p>

        <div className="flex items-center justify-between border-b pb-3">
          <Label htmlFor="voice-enabled">הפעלת השלוחה הקולית</Label>
          <Switch
            id="voice-enabled"
            checked={!!form.enabled}
            onCheckedChange={(v) => setForm({ ...form, enabled: v })}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>מספר המערכת בימות המשיח</Label>
            <Input dir="ltr" placeholder="03-1234567" value={form.yemot_phone ?? ""}
              onChange={(e) => setForm({ ...form, yemot_phone: e.target.value })} />
          </div>
          <div>
            <Label>מספר השלוחה</Label>
            <Input dir="ltr" placeholder="9" value={form.yemot_extension ?? ""}
              onChange={(e) => setForm({ ...form, yemot_extension: e.target.value })} />
          </div>
        </div>

        <div>
          <Label>שיטת זיהוי הלקוח</Label>
          <Select
            value={form.id_method ?? "phone_id"}
            onValueChange={(v) => setForm({ ...form, id_method: v as VoiceSettings["id_method"] })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(ID_METHOD_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="flex items-center gap-2"><KeyRound className="h-3.5 w-3.5" /> מפתח סודי לשלוחה</Label>
          <div className="flex gap-2">
            <Input dir="ltr" readOnly value={form.api_secret ?? ""} placeholder="טרם נוצר מפתח" />
            <Button type="button" variant="outline" onClick={() => {
              const secret = crypto.randomUUID().replace(/-/g, "");
              setForm({ ...form, api_secret: secret });
              toast.info("נוצר מפתח חדש — יש לשמור ולעדכן את הקישור בימות");
            }}>
              {form.api_secret ? "החלף מפתח" : "צור מפתח"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            המפתח משובץ בקישור השלוחה ומשמש כסיסמת הגישה שלה. החלפתו מנתקת קישור ישן.
          </p>
        </div>

        {apiLink && (
          <div>
            <Label>קישור ה-API להגדרה בימות המשיח</Label>
            <div className="flex gap-2">
              <Input dir="ltr" readOnly className="text-xs" value={apiLink} />
              <Button type="button" variant="outline" size="icon" onClick={() => {
                void navigator.clipboard.writeText(apiLink);
                toast.success("הקישור הועתק");
              }}><Copy className="h-4 w-4" /></Button>
            </div>
            <div className="text-xs text-muted-foreground mt-2 space-y-1">
              <p>בניהול השלוחה בימות המשיח (קובץ ext.ini של השלוחה) יש להגדיר:</p>
              <pre dir="ltr" className="bg-muted/50 rounded p-2 overflow-x-auto">{`type=api\napi_link=${apiLink}`}</pre>
              <p>לאחר השמירה כאן — כל שיחה לשלוחה תזוהה ותירשם אוטומטית לתיק הלקוח.</p>
            </div>
          </div>
        )}

        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin me-1" />}
          <Save className="h-4 w-4 me-1" /> שמור הגדרות
        </Button>
      </CardContent>
    </Card>
  );
}

function EmailTab() {
  const { data: tenant, isLoading } = useQuery(myTenantQuery());
  const qc = useQueryClient();
  const settings = (tenant?.settings ?? {}) as TenantSettings;
  const [form, setForm] = useState<EmailSettings>(settings.email ?? {});
  const [saving, setSaving] = useState(false);
  // window is unavailable during SSR — resolve the public origin on the client
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  async function save() {
    if (!tenant?.id) return;
    if (form.enabled && !form.inbound_secret) {
      toast.error("להפעלת הסנכרון יש ליצור מפתח סודי לקליטת מיילים");
      return;
    }
    setSaving(true);
    const newSettings: TenantSettings = { ...settings, email: form };
    const { error } = await supabase.from("tenants").update({ settings: newSettings }).eq("id", tenant.id);
    setSaving(false);
    if (error) { toast.error("שמירה נכשלה", { description: error.message }); return; }
    toast.success("הגדרות סנכרון המייל נשמרו");
    qc.invalidateQueries({ queryKey: ["my-tenant"] });
  }

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  const inboundUrl = tenant && form.inbound_secret && origin
    ? `${origin}${import.meta.env.BASE_URL}api/public/email-inbound?tenant=${tenant.id}&key=${form.inbound_secret}`
    : null;
  const senderConfigured = !!settings.integrations?.email_sender?.trim();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" /> סנכרון מייל דו־כיווני</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          יוצא: הודעת מייל שנשלחת מציר התקשורת של הלקוח נשלחת אליו בפועל (Resend).
          נכנס: כל מייל שמגיע לכתובת המשרד נקלט אוטומטית — שולח מזוהה נרשם בציר ההודעות
          של הלקוח, שולח לא מוכר נפתח כפנייה בלוח הפניות. שום מייל לא הולך לאיבוד.
        </p>

        <div className="flex items-center justify-between border-b pb-3">
          <Label htmlFor="email-enabled">הפעלת קליטת מיילים נכנסים</Label>
          <Switch
            id="email-enabled"
            checked={!!form.enabled}
            onCheckedChange={(v) => setForm({ ...form, enabled: v })}
          />
        </div>

        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <Label htmlFor="email-live">שליחה חיה (מחוץ למצב טסט)</Label>
            <p className="text-xs text-muted-foreground mt-1">
              כבוי = מצב טסט: מיילים יוצאים נרשמים בציר עם סימון &quot;טסט&quot; ולא נשלחים בפועל.
              שליחה חיה דורשת גם הפעלה כאן וגם EMAIL_LIVE_MODE=live בהגדרות הסביבה של הפלטפורמה.
            </p>
          </div>
          <Switch
            id="email-live"
            checked={!!form.live_enabled}
            onCheckedChange={(v) => setForm({ ...form, live_enabled: v })}
          />
        </div>

        <div>
          <Label>כתובת Reply-To (אליה יגיעו תשובות הלקוח)</Label>
          <Input dir="ltr" placeholder="office@example.com" value={form.reply_to ?? ""}
            onChange={(e) => setForm({ ...form, reply_to: e.target.value })} />
          <p className="text-xs text-muted-foreground mt-1">
            כתובת השולח עצמה מוגדרת בלשונית &quot;אינטגרציות&quot; (Email sender address){senderConfigured ? "" : " — טרם הוגדרה שם"}.
          </p>
        </div>

        <div>
          <Label className="flex items-center gap-2"><KeyRound className="h-3.5 w-3.5" /> מפתח סודי לקליטת מיילים</Label>
          <div className="flex gap-2">
            <Input dir="ltr" readOnly value={form.inbound_secret ?? ""} placeholder="טרם נוצר מפתח" />
            <Button type="button" variant="outline" onClick={() => {
              const secret = crypto.randomUUID().replace(/-/g, "");
              setForm({ ...form, inbound_secret: secret });
              toast.info("נוצר מפתח חדש — יש לשמור ולעדכן את כתובת ה-Webhook אצל ספק המייל");
            }}>
              {form.inbound_secret ? "החלף מפתח" : "צור מפתח"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            המפתח משובץ בכתובת ה-Webhook ומשמש כסיסמת הגישה שלה. החלפתו מנתקת קישור ישן.
          </p>
        </div>

        {inboundUrl && (
          <div>
            <Label>כתובת Webhook לקליטת מייל נכנס</Label>
            <div className="flex gap-2">
              <Input dir="ltr" readOnly className="text-xs" value={inboundUrl} />
              <Button type="button" variant="outline" size="icon" onClick={() => {
                void navigator.clipboard.writeText(inboundUrl);
                toast.success("הכתובת הועתקה");
              }}><Copy className="h-4 w-4" /></Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              הדביקו את הכתובת אצל ספק המייל הנכנס (Resend Inbound / n8n / CloudMailin) כיעד
              ה-Webhook. המערכת מזהה אוטומטית גם מבנה Resend וגם JSON שטוח (from / subject / text).
            </p>
          </div>
        )}

        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin me-1" />}
          <Save className="h-4 w-4 me-1" /> שמור הגדרות
        </Button>
      </CardContent>
    </Card>
  );
}

function WhatsappTab() {
  const { data: tenant, isLoading } = useQuery(myTenantQuery());
  const qc = useQueryClient();
  const settings = (tenant?.settings ?? {}) as TenantSettings;
  const [form, setForm] = useState<WhatsappSettings>(settings.whatsapp ?? {});
  const [saving, setSaving] = useState(false);
  // window is unavailable during SSR — resolve the public origin on the client
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  async function save() {
    if (!tenant?.id) return;
    if (form.enabled && !form.inbound_secret) {
      toast.error("להפעלת הסנכרון יש ליצור מפתח סודי לקליטת הודעות");
      return;
    }
    setSaving(true);
    const newSettings: TenantSettings = { ...settings, whatsapp: form };
    const { error } = await supabase.from("tenants").update({ settings: newSettings }).eq("id", tenant.id);
    setSaving(false);
    if (error) { toast.error("שמירה נכשלה", { description: error.message }); return; }
    toast.success("הגדרות הוואטסאפ נשמרו");
    qc.invalidateQueries({ queryKey: ["my-tenant"] });
  }

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  const inboundUrl = tenant && form.inbound_secret && origin
    ? `${origin}${import.meta.env.BASE_URL}api/public/whatsapp-inbound?tenant=${tenant.id}&key=${form.inbound_secret}`
    : null;
  const credsConfigured =
    !!settings.integrations?.whatsapp_instance_id?.trim() && !!settings.integrations?.whatsapp_api_token?.trim();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><MessageCircle className="h-4 w-4" /> וואטסאפ דו־כיווני (Green API)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          יוצא: הודעת וואטסאפ שנשלחת מציר התקשורת של הלקוח נשלחת אליו בפועל דרך מכשיר
          הוואטסאפ של המשרד (Green API). נכנס: כל הודעה שמגיעה למספר המשרד נקלטת
          אוטומטית — שולח מזוהה לפי טלפון נרשם בציר ההודעות של הלקוח, שולח לא מוכר
          נפתח כפנייה בלוח הפניות. שום הודעה לא הולכת לאיבוד.
        </p>

        <div className="flex items-center justify-between border-b pb-3">
          <Label htmlFor="wa-enabled">הפעלת קליטת הודעות נכנסות</Label>
          <Switch
            id="wa-enabled"
            checked={!!form.enabled}
            onCheckedChange={(v) => setForm({ ...form, enabled: v })}
          />
        </div>

        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <Label htmlFor="wa-live">שליחה חיה (מחוץ למצב טסט)</Label>
            <p className="text-xs text-muted-foreground mt-1">
              כבוי = מצב טסט: הודעות יוצאות נרשמות בציר עם סימון &quot;טסט&quot; ולא נשלחות בפועל.
              שליחה חיה דורשת גם הפעלה כאן וגם WHATSAPP_LIVE_MODE=live בהגדרות הסביבה של הפלטפורמה.
            </p>
          </div>
          <Switch
            id="wa-live"
            checked={!!form.live_enabled}
            onCheckedChange={(v) => setForm({ ...form, live_enabled: v })}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          פרטי החיבור ל-Green API (Instance ID + API Token) מוגדרים בלשונית
          &quot;אינטגרציות&quot;{credsConfigured ? "" : " — טרם הוגדרו שם"}.
        </p>

        <div>
          <Label className="flex items-center gap-2"><KeyRound className="h-3.5 w-3.5" /> מפתח סודי לקליטת הודעות</Label>
          <div className="flex gap-2">
            <Input dir="ltr" readOnly value={form.inbound_secret ?? ""} placeholder="טרם נוצר מפתח" />
            <Button type="button" variant="outline" onClick={() => {
              const secret = crypto.randomUUID().replace(/-/g, "");
              setForm({ ...form, inbound_secret: secret });
              toast.info("נוצר מפתח חדש — יש לשמור ולעדכן את כתובת ה-Webhook בהגדרות המופע ב-Green API");
            }}>
              {form.inbound_secret ? "החלף מפתח" : "צור מפתח"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            המפתח משובץ בכתובת ה-Webhook ומשמש כסיסמת הגישה שלה. החלפתו מנתקת קישור ישן.
          </p>
        </div>

        {inboundUrl && (
          <div>
            <Label>כתובת Webhook לקליטת הודעות נכנסות</Label>
            <div className="flex gap-2">
              <Input dir="ltr" readOnly className="text-xs" value={inboundUrl} />
              <Button type="button" variant="outline" size="icon" onClick={() => {
                void navigator.clipboard.writeText(inboundUrl);
                toast.success("הכתובת הועתקה");
              }}><Copy className="h-4 w-4" /></Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              הדביקו את הכתובת בהגדרות המופע ב-Green API (שדה Webhook URL) והפעילו שם
              קבלת הודעות נכנסות (incomingWebhook). המערכת מזהה אוטומטית גם את מבנה
              Green API וגם JSON שטוח (from / text / id).
            </p>
          </div>
        )}

        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin me-1" />}
          <Save className="h-4 w-4 me-1" /> שמור הגדרות
        </Button>
      </CardContent>
    </Card>
  );
}

function NotificationsTab() {
  const { data: tenant, isLoading } = useQuery(myTenantQuery());
  const qc = useQueryClient();
  const settings = (tenant?.settings ?? {}) as TenantSettings;
  const [form, setForm] = useState<NotificationSettings>(settings.notifications ?? {});
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!tenant?.id) return;
    setSaving(true);
    const newSettings: TenantSettings = { ...settings, notifications: form };
    const { error } = await supabase.from("tenants").update({ settings: newSettings }).eq("id", tenant.id);
    setSaving(false);
    if (error) { toast.error("שמירה נכשלה", { description: error.message }); return; }
    toast.success("ההגדרות נשמרו");
    qc.invalidateQueries({ queryKey: ["my-tenant"] });
  }

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  const toggles = [
    { key: "admin_email_new_referral" as const, label: "התראת מייל למנהל על הפניה חדשה" },
    { key: "admin_email_inbound_msg" as const, label: "התראת מייל למנהל על הודעה נכנסת" },
    { key: "agent_email_assigned_client" as const, label: "התראת מייל לסוכן על הקצאת לקוח" },
  ];

  // default-on (missing key = enabled) — see NotificationSettings
  const clientToggles = [
    { key: "client_consent_email" as const, label: "מייל ללקוח כשבקשת אישור העברת-מידע ממתינה לו" },
    { key: "client_consent_whatsapp" as const, label: "וואטסאפ ללקוח כשבקשת אישור העברת-מידע ממתינה לו" },
  ];

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">הגדרות התראות</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {toggles.map((t) => (
          <div key={t.key} className="flex items-center justify-between border-b pb-2">
            <Label htmlFor={t.key}>{t.label}</Label>
            <Switch
              id={t.key}
              checked={!!form[t.key]}
              onCheckedChange={(v) => setForm({ ...form, [t.key]: v })}
            />
          </div>
        ))}
        <div className="pt-2">
          <p className="text-sm font-medium">התראות ללקוח</p>
          <p className="text-xs text-muted-foreground mt-1">
            הפניה לשותף ללא הסכמה תקפה ממתינה לאישור הלקוח באזור האישי. ההתראות כאן מודיעות
            לו על כך בערוצים האמיתיים, עם קישור ישיר למסך האישור. השליחה בפועל כפופה למצב
            הטסט של לשוניות המייל והוואטסאפ — בלי הפעלת שליחה חיה שם, ההודעה רק נרשמת בציר.
          </p>
        </div>
        {clientToggles.map((t) => (
          <div key={t.key} className="flex items-center justify-between border-b pb-2">
            <Label htmlFor={t.key}>{t.label}</Label>
            <Switch
              id={t.key}
              checked={form[t.key] !== false}
              onCheckedChange={(v) => setForm({ ...form, [t.key]: v })}
            />
          </div>
        ))}
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin me-1" />}
          <Save className="h-4 w-4 me-1" /> שמור
        </Button>
      </CardContent>
    </Card>
  );
}
