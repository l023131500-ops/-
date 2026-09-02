import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, KeyRound, Trash2, Mail, Phone, UserCog } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const ROLES = [
  { value: "super_admin", label: "מנהל ראשי (כל המערכת)" },
  { value: "tenant_admin", label: "מנהל ארגון" },
  { value: "moderator", label: "מנחה" },
  { value: "member", label: "חבר" },
  { value: "viewer", label: "צופה" },
];

type AppUser = {
  id: string;
  full_name: string | null;
  display_name: string | null;
  phone: string | null;
  email?: string;
  last_sign_in_at?: string;
  roles: { role: string; tenant_id: string | null; tenant: { name: string } | null }[];
  created_at: string;
};

async function callAdmin(action: string, payload: Record<string, any> = {}) {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new Error("לא מחובר");
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  let json: any;
  try {
    json = await res.json();
  } catch {
    throw new Error(res.ok ? "שגיאה" : `שגיאת שרת (${res.status})`);
  }
  if (!json.ok) throw new Error(json.error || "שגיאה");
  return json;
}

export default function Users() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [pwUser, setPwUser] = useState<AppUser | null>(null);
  const [roleUser, setRoleUser] = useState<AppUser | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users-list"],
    queryFn: () => callAdmin("list"),
  });

  const users: AppUser[] = data?.users || [];
  const tenants: { id: string; name: string; slug: string }[] = data?.tenants || [];

  const delMut = useMutation({
    mutationFn: (user_id: string) => callAdmin("delete", { user_id }),
    onSuccess: () => { toast.success("נמחק"); qc.invalidateQueries({ queryKey: ["admin-users-list"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl">משתמשים וגישות</h1>
          <p className="text-muted-foreground text-sm mt-1">ניהול לקוחות, סיסמאות והרשאות</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="ml-2 h-4 w-4" /> משתמש חדש</Button>
          </DialogTrigger>
          <CreateUserDialog tenants={tenants} onDone={() => { setCreateOpen(false); qc.invalidateQueries({ queryKey: ["admin-users-list"] }); }} />
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-3">
          {users.length === 0 && (
            <Card><CardContent className="py-8 text-center text-muted-foreground">אין משתמשים עדיין. צור את הראשון.</CardContent></Card>
          )}
          {users.map((u) => (
            <Card key={u.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-medium text-lg">{u.display_name || u.full_name || "(ללא שם)"}</div>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
                      {u.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{u.email}</span>}
                      {u.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{u.phone}</span>}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {u.roles.length === 0 ? (
                        <Badge variant="outline">ללא תפקיד</Badge>
                      ) : (
                        u.roles.map((r, i) => (
                          <Badge key={i} variant={r.role === "super_admin" ? "default" : "secondary"}>
                            {ROLES.find((x) => x.value === r.role)?.label || r.role}
                            {r.tenant?.name && ` · ${r.tenant.name}`}
                          </Badge>
                        ))
                      )}
                    </div>
                    {u.last_sign_in_at && (
                      <div className="text-xs text-muted-foreground mt-1">
                        כניסה אחרונה: {new Date(u.last_sign_in_at).toLocaleString("he-IL")}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setRoleUser(u)}>
                      <UserCog className="ml-1 h-3 w-3" /> תפקיד
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPwUser(u)}>
                      <KeyRound className="ml-1 h-3 w-3" /> סיסמה
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm(`למחוק את ${u.display_name || u.email}?`)) delMut.mutate(u.id);
                      }}
                      disabled={delMut.isPending}
                    >
                      <Trash2 className="ml-1 h-3 w-3" /> מחק
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Password Dialog */}
      <Dialog open={!!pwUser} onOpenChange={(o) => !o && setPwUser(null)}>
        {pwUser && <PasswordDialog user={pwUser} onDone={() => setPwUser(null)} />}
      </Dialog>

      {/* Role Dialog */}
      <Dialog open={!!roleUser} onOpenChange={(o) => !o && setRoleUser(null)}>
        {roleUser && (
          <RoleDialog
            user={roleUser}
            tenants={tenants}
            onDone={() => { setRoleUser(null); qc.invalidateQueries({ queryKey: ["admin-users-list"] }); }}
          />
        )}
      </Dialog>
    </div>
  );
}

function CreateUserDialog({ tenants, onDone }: { tenants: any[]; onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("member");
  const [tenantId, setTenantId] = useState<string>("");

  const mut = useMutation({
    mutationFn: () => callAdmin("create", {
      email, password, full_name: fullName, phone: phone || null,
      role, tenant_id: role === "super_admin" ? null : (tenantId || null),
    }),
    onSuccess: () => {
      toast.success(`נוצר משתמש: ${email}`);
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>יצירת משתמש חדש</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>שם מלא *</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="ישראל ישראלי" /></div>
        <div><Label>דוא״ל *</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" /></div>
        <div><Label>סיסמה ראשונית * (6 תווים לפחות)</Label><Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="הקלד סיסמה ראשונית" /></div>
        <div><Label>טלפון</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="050-..." /></div>
        <div>
          <Label>תפקיד</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {role !== "super_admin" && (
          <div>
            <Label>ארגון (טננט)</Label>
            <Select value={tenantId} onValueChange={setTenantId}>
              <SelectTrigger><SelectValue placeholder="בחר ארגון" /></SelectTrigger>
              <SelectContent>
                {tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button onClick={() => mut.mutate()} disabled={mut.isPending || !email || !password || !fullName}>
          {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "צור משתמש"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function RoleDialog({ user, tenants, onDone }: { user: AppUser; tenants: any[]; onDone: () => void }) {
  const NEW_ENTRY = "__new__";
  const [selected, setSelected] = useState<string>(user.roles.length ? "0" : NEW_ENTRY);
  const existing = selected === NEW_ENTRY ? null : user.roles[Number(selected)];
  const [role, setRole] = useState(existing?.role || "member");
  const [tenantId, setTenantId] = useState<string>(existing?.tenant_id || "");

  const pick = (v: string) => {
    setSelected(v);
    const entry = v === NEW_ENTRY ? null : user.roles[Number(v)];
    setRole(entry?.role || "member");
    setTenantId(entry?.tenant_id || "");
  };

  // update_role deletes-then-inserts scoped to the tenant_id it's sent, not
  // the tenant_id the edited row happened to have -- so when editing an
  // existing entry the tenant must stay fixed to that entry's tenant (else
  // "editing" would silently leave the old row in place and add a new one
  // in the newly-picked tenant instead of moving it).
  const effectiveTenantId = existing ? (existing.tenant_id || "") : tenantId;

  const mut = useMutation({
    mutationFn: () => callAdmin("update_role", {
      user_id: user.id, role, tenant_id: role === "super_admin" ? null : (effectiveTenantId || null),
    }),
    onSuccess: () => { toast.success("התפקיד עודכן"); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>ניהול תפקיד — {user.display_name || user.email}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        {user.roles.length > 0 && (
          <div>
            <Label>תפקיד קיים לעריכה</Label>
            <Select value={selected} onValueChange={pick}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {user.roles.map((r, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {ROLES.find((x) => x.value === r.role)?.label || r.role}
                    {r.tenant?.name && ` · ${r.tenant.name}`}
                  </SelectItem>
                ))}
                <SelectItem value={NEW_ENTRY}>+ הוסף תפקיד חדש</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <Label>תפקיד</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {role !== "super_admin" && existing && (
          <div>
            <Label>ארגון (טננט)</Label>
            <div className="text-sm px-3 py-2 rounded-md border bg-muted/40">
              {existing.tenant?.name || "— (לא ניתן לשנות טננט לתפקיד קיים; הוסיפו תפקיד חדש במקום)"}
            </div>
          </div>
        )}
        {role !== "super_admin" && !existing && (
          <div>
            <Label>ארגון (טננט)</Label>
            <Select value={tenantId} onValueChange={setTenantId}>
              <SelectTrigger><SelectValue placeholder="בחר ארגון" /></SelectTrigger>
              <SelectContent>
                {tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="text-sm text-muted-foreground">
          {existing
            ? "השמירה תעדכן את התפקיד עבור אותו טננט."
            : "השמירה תוסיף תפקיד חדש למשתמש (בנוסף לקיימים)."}
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => mut.mutate()} disabled={mut.isPending || (role !== "super_admin" && !effectiveTenantId)}>
          {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "עדכן תפקיד"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function PasswordDialog({ user, onDone }: { user: AppUser; onDone: () => void }) {
  const [pw, setPw] = useState("");
  const mut = useMutation({
    mutationFn: () => callAdmin("update_password", { user_id: user.id, new_password: pw }),
    onSuccess: () => { toast.success("הסיסמה עודכנה"); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>שינוי סיסמה — {user.display_name || user.email}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>סיסמה חדשה (6 תווים לפחות)</Label>
          <Input type="text" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="הקלד סיסמה" />
        </div>
        <div className="text-sm text-muted-foreground">
          המשתמש יוכל להתחבר מיד עם הסיסמה החדשה. הסיסמה הישנה לא תעבוד יותר.
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => mut.mutate()} disabled={mut.isPending || pw.length < 6}>
          {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "עדכן סיסמה"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
