import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
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
import { Loader2, Save, ExternalLink, Plug, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { myTenantQuery, myProfileQuery, tenantProfilesQuery, type TenantSettings, type IntegrationSettings, type NotificationSettings } from "@/features/settings/queries";

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
          <TabsTrigger value="users">משתמשים</TabsTrigger>
          <TabsTrigger value="partners">שותפים</TabsTrigger>
          <TabsTrigger value="entitlements">זכאויות</TabsTrigger>
          <TabsTrigger value="integrations">אינטגרציות</TabsTrigger>
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
        <TabsContent value="notifications" className="mt-4"><NotificationsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function UsersTab() {
  const { data: profiles, isLoading } = useQuery(tenantProfilesQuery());
  const { data: tenant } = useQuery(myTenantQuery());
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("agent");
  const [loading, setLoading] = useState(false);

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const { error } = await supabase.rpc("admin_update_member_role", { p_profile_id: id, p_role: role });
      if (error) {
        // Falls back to the pre-existing direct update until migration
        // 20260819235500_admin_update_member_role.sql is deployed to the
        // live project (this session cannot deploy it -- see DECISIONS.md).
        // PGRST202 = "function not found in schema cache", PostgREST's code
        // for calling an RPC that does not exist yet on the target DB. The
        // message check is a second, code-independent net for the same
        // condition, since misclassifying this as a real error would silently
        // break the currently-working "admin edits own role" path in prod.
        const isMissingFunction =
          error.code === "PGRST202" || /find the function|schema cache/i.test(error.message || "");
        if (isMissingFunction) {
          const { error: fallbackError } = await supabase
            .from("profiles")
            .update({ role: role as "admin" | "agent" | "viewer" })
            .eq("id", id);
          if (fallbackError) throw fallbackError;
          return;
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("התפקיד עודכן");
      qc.invalidateQueries({ queryKey: ["tenant-profiles"] });
    },
    onError: (e: Error) => toast.error("עדכון נכשל", { description: e.message }),
  });

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant?.id) return;
    setLoading(true);
    const tempPassword = Math.random().toString(36).slice(2) + "Aa1!";
    const { error } = await supabase.auth.signUp({
      email,
      password: tempPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: name, tenant_id: tenant.id },
      },
    });
    setLoading(false);
    if (error) { toast.error("שגיאה ביצירת משתמש", { description: error.message }); return; }
    toast.success("המשתמש נוצר", { description: `סיסמה זמנית: ${tempPassword}` });
    setOpen(false); setEmail(""); setName("");
    qc.invalidateQueries({ queryKey: ["tenant-profiles"] });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            משתמשי הארגון
            {tenant?.plan && (
              <Badge variant="secondary" className="font-normal">{tenant.plan}</Badge>
            )}
          </CardTitle>
          {tenant?.name && (
            <div className="text-xs text-muted-foreground mt-1">{tenant.name}</div>
          )}
        </div>
        <Button size="sm" onClick={() => setOpen(!open)}>{open ? "ביטול" : "+ הוסף משתמש"}</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {open && (
          <form onSubmit={invite} className="grid gap-3 sm:grid-cols-4 p-3 bg-muted/40 rounded">
            <div><Label>שם מלא</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
            <div><Label>אימייל</Label><Input type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div>
              <Label>תפקיד</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">מנהל</SelectItem>
                  <SelectItem value="agent">סוכן</SelectItem>
                  <SelectItem value="viewer">צופה</SelectItem>
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
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>שם</TableHead>
                <TableHead>תפקיד</TableHead>
                <TableHead>מזהה משתמש</TableHead>
                <TableHead>הצטרף</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(profiles ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.full_name}</TableCell>
                  <TableCell>
                    <Select value={p.role} onValueChange={(v) => updateRole.mutate({ id: p.id, role: v })}>
                      <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">מנהל</SelectItem>
                        <SelectItem value="agent">סוכן</SelectItem>
                        <SelectItem value="viewer">צופה</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell dir="ltr" className="font-mono text-xs text-muted-foreground">
                    {p.auth_user_id ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString("he-IL")}
                  </TableCell>
                </TableRow>
              ))}
              {(profiles ?? []).length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">אין משתמשים</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function IntegrationsTab() {
  const { data: tenant, isLoading } = useQuery(myTenantQuery());
  const { data: me } = useQuery(myProfileQuery());
  const isAdmin = me?.role === "admin";
  const qc = useQueryClient();
  const settings = (tenant?.settings ?? {}) as TenantSettings;
  const integrations = settings.integrations ?? {};
  const [form, setForm] = useState<IntegrationSettings>(integrations);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!tenant?.id || !isAdmin) return;
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
        {!isAdmin && (
          <p className="text-sm text-muted-foreground">
            צפייה בלבד — רק מנהל הארגון יכול לערוך אינטגרציות ואסימוני חיבור.
          </p>
        )}
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
                  disabled={!isAdmin}
                  onChange={(e) => setForm({ ...form, [s.key]: e.target.value })}
                />
              </div>
            </div>
          );
        })}
        <Button onClick={save} disabled={saving || !isAdmin}>
          {saving && <Loader2 className="h-4 w-4 animate-spin me-1" />}
          <Save className="h-4 w-4 me-1" /> שמור הגדרות
        </Button>
      </CardContent>
    </Card>
  );
}

function NotificationsTab() {
  const { data: tenant, isLoading } = useQuery(myTenantQuery());
  const { data: me } = useQuery(myProfileQuery());
  const isAdmin = me?.role === "admin";
  const qc = useQueryClient();
  const settings = (tenant?.settings ?? {}) as TenantSettings;
  const [form, setForm] = useState<NotificationSettings>(settings.notifications ?? {});
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!tenant?.id || !isAdmin) return;
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

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">הגדרות התראות</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {!isAdmin && (
          <p className="text-sm text-muted-foreground">
            צפייה בלבד — רק מנהל הארגון יכול לערוך הגדרות התראות.
          </p>
        )}
        {toggles.map((t) => (
          <div key={t.key} className="flex items-center justify-between border-b pb-2">
            <Label htmlFor={t.key}>{t.label}</Label>
            <Switch
              id={t.key}
              checked={!!form[t.key]}
              disabled={!isAdmin}
              onCheckedChange={(v) => setForm({ ...form, [t.key]: v })}
            />
          </div>
        ))}
        <Button onClick={save} disabled={saving || !isAdmin}>
          {saving && <Loader2 className="h-4 w-4 animate-spin me-1" />}
          <Save className="h-4 w-4 me-1" /> שמור
        </Button>
      </CardContent>
    </Card>
  );
}
