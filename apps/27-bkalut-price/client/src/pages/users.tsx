import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, UserCog, Trash2, ShieldCheck, Search } from "lucide-react";
import { AdminGate } from "@/components/admin-gate";

interface AppUser {
  id: number;
  fullName: string;
  email: string;
  username: string | null;
  phone: string;
  role: string;
  status: string;
  productAccess: string[];
  plan: string;
  finClientId: number | null;
  credentialsDeliveredAt: string | null;
  passwordPlain: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface FinClient { id: number; fullName: string; phone?: string; email?: string }

const ROLES = [
  { value: "user", label: "משתמש" },
  { value: "admin", label: "אדמין" },
  { value: "coach", label: "מאמן" },
];
const STATUSES = [
  { value: "active", label: "פעיל" },
  { value: "pending", label: "ממתין" },
  { value: "disabled", label: "מושעה" },
];
const PRODUCTS = [
  { value: "bkalut", label: "בקלות זכויות" },
  { value: "financial", label: "ניהול פיננסי" },
];

interface FormState {
  fullName: string;
  email: string;
  username: string;
  phone: string;
  password: string;
  role: string;
  status: string;
  productAccess: string[];
  plan: string;
  finClientId: number | null;
  notes: string;
}

function emptyForm(): FormState {
  return {
    fullName: "",
    email: "",
    username: "",
    phone: "",
    password: "",
    role: "user",
    status: "active",
    productAccess: ["bkalut"],
    plan: "basic",
    finClientId: null,
    notes: "",
  };
}

function generatePassword(): string {
  const alpha = "abcdefghjkmnpqrstuvwxyz";
  const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const digits = "23456789";
  let out = "";
  const pool = alpha + ALPHA + digits;
  for (let i = 0; i < 4; i++) out += ALPHA[Math.floor(Math.random() * ALPHA.length)];
  for (let i = 0; i < 4; i++) out += digits[Math.floor(Math.random() * digits.length)];
  for (let i = 0; i < 2; i++) out += pool[Math.floor(Math.random() * pool.length)];
  return out;
}

function UsersInner() {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [creating, setCreating] = useState(false);

  const usersQuery = useQuery<AppUser[]>({ queryKey: ["/api/admin/users"] });

  const filtered = useMemo(() => {
    const list = usersQuery.data ?? [];
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter((u) =>
      [u.fullName, u.email, u.phone, u.role, u.status].some((v) => (v || "").toLowerCase().includes(term)),
    );
  }, [usersQuery.data, q]);

  return (
    <div dir="rtl" className="space-y-6" data-testid="page-users">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">ניהול משתמשים</p>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">משתמשי המערכת</h1>
          <p className="text-sm text-muted-foreground max-w-2xl mt-1">
            ניהול חשבונות צוות, מאמנים ולקוחות פנימיים. גישה למוצרי בקלות זכויות וניהול פיננסי נשלטת לפי משתמש.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute right-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              className="pr-9 w-64"
              placeholder="חיפוש לפי שם, מייל, טלפון"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              data-testid="input-users-search"
            />
          </div>
          <Dialog open={creating} onOpenChange={setCreating}>
            <DialogTrigger asChild>
              <Button className="gap-1.5" data-testid="button-add-user">
                <Plus className="w-4 h-4" />
                משתמש חדש
              </Button>
            </DialogTrigger>
            <UserDialog
              key={creating ? "create" : "create-closed"}
              title="הוספת משתמש"
              initial={emptyForm()}
              onClose={() => setCreating(false)}
              onSubmit={async (form) => {
                await apiRequest("POST", "/api/admin/users", form);
                await queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
                setCreating(false);
              }}
            />
          </Dialog>
        </div>
      </header>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-right">
            <tr>
              <th className="py-2 px-3 font-medium">שם</th>
              <th className="py-2 px-3 font-medium">פרטי קשר</th>
              <th className="py-2 px-3 font-medium">תפקיד</th>
              <th className="py-2 px-3 font-medium">סטטוס</th>
              <th className="py-2 px-3 font-medium">גישה למוצרים</th>
              <th className="py-2 px-3 font-medium w-32 text-left">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {usersQuery.isLoading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">טוען...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">לא נמצאו משתמשים. אפשר להוסיף משתמש חדש.</td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="border-t border-border" data-testid={`row-user-${u.id}`}>
                  <td className="py-2 px-3 font-medium">{u.fullName}</td>
                  <td className="py-2 px-3 text-muted-foreground" dir="ltr">
                    <div>{u.email || "—"}</div>
                    <div className="text-xs">{u.phone || ""}</div>
                  </td>
                  <td className="py-2 px-3">{ROLES.find((r) => r.value === u.role)?.label ?? u.role}</td>
                  <td className="py-2 px-3">
                    <Badge variant={u.status === "active" ? "default" : "secondary"} className="text-[11px]">
                      {STATUSES.find((s) => s.value === u.status)?.label ?? u.status}
                    </Badge>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex flex-wrap gap-1">
                      {u.productAccess?.length
                        ? u.productAccess.map((p) => (
                            <Badge key={p} variant="outline" className="text-[11px]">
                              {PRODUCTS.find((x) => x.value === p)?.label ?? p}
                            </Badge>
                          ))
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-left">
                    <Dialog open={editing?.id === u.id} onOpenChange={(open) => setEditing(open ? u : null)}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="gap-1" data-testid={`button-edit-user-${u.id}`}>
                          <UserCog className="w-4 h-4" />
                          ערוך
                        </Button>
                      </DialogTrigger>
                      {editing?.id === u.id && (
                        <UserDialog
                          title={`עריכת ${u.fullName}`}
                          initial={{
                            fullName: u.fullName,
                            email: u.email ?? "",
                            username: u.username ?? "",
                            phone: u.phone ?? "",
                            password: "",
                            role: u.role,
                            status: u.status,
                            productAccess: u.productAccess ?? [],
                            plan: u.plan ?? "basic",
                            finClientId: u.finClientId ?? null,
                            notes: u.notes ?? "",
                          }}
                          existingUser={u}
                          onClose={() => setEditing(null)}
                          onSubmit={async (form) => {
                            await apiRequest("PATCH", `/api/admin/users/${u.id}`, form);
                            await queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
                            setEditing(null);
                          }}
                          onDelete={async () => {
                            if (!confirm("למחוק את המשתמש?")) return;
                            await apiRequest("DELETE", `/api/admin/users/${u.id}`);
                            await queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
                            setEditing(null);
                          }}
                        />
                      )}
                    </Dialog>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <Card className="p-5 text-sm text-muted-foreground bg-muted/20">
        <div className="flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 mt-0.5 text-foreground/70 shrink-0" />
          <span>
            נתוני המשתמשים נשמרים ב-SQLite מקומי של המערכת. הגדרות התחברות חיצוניות (Supabase Auth, SSO, OTP)
            יוטמעו בייצור — ראו את עמוד <strong>אוטומציות</strong> ובו הגדרות אבטחה.
          </span>
        </div>
      </Card>
    </div>
  );
}

interface UserDialogProps {
  title: string;
  initial: FormState;
  onClose: () => void;
  onSubmit: (form: FormState) => Promise<void>;
  onDelete?: () => Promise<void>;
  existingUser?: AppUser;
}

function UserDialog({ title, initial, onClose, onSubmit, onDelete, existingUser }: UserDialogProps) {
  const [form, setForm] = useState<FormState>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendStatus, setSendStatus] = useState<string | null>(null);
  const finClientsQuery = useQuery<FinClient[]>({ queryKey: ["/api/financial/clients"] });

  function toggleProduct(value: string) {
    setForm((f) => {
      const has = f.productAccess.includes(value);
      return { ...f, productAccess: has ? f.productAccess.filter((x) => x !== value) : [...f.productAccess, value] };
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogContent dir="rtl" className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-3" data-testid="form-user-dialog">
        <div className="space-y-1.5">
          <Label htmlFor="u-fullName">שם מלא</Label>
          <Input
            id="u-fullName"
            required
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            data-testid="input-fullname"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="u-email">דוא"ל</Label>
            <Input
              id="u-email"
              type="email"
              dir="ltr"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              data-testid="input-email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-phone">טלפון</Label>
            <Input
              id="u-phone"
              dir="ltr"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              data-testid="input-phone"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>תפקיד</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger data-testid="select-role"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>סטטוס</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger data-testid="select-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>גישה למוצרים</Label>
          <div className="flex flex-wrap gap-2">
            {PRODUCTS.map((p) => {
              const active = form.productAccess.includes(p.value);
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => toggleProduct(p.value)}
                  className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover-elevate"}`}
                  aria-pressed={active}
                  data-testid={`toggle-product-${p.value}`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 border-t pt-3">
          <div className="space-y-1.5">
            <Label htmlFor="u-username">שם משתמש (לכניסה)</Label>
            <Input
              id="u-username"
              dir="ltr"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="למשל המייל/טלפון"
              data-testid="input-username"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-password">סיסמה</Label>
            <div className="flex gap-1">
              <Input
                id="u-password"
                dir="ltr"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={existingUser ? "השאר ריק ללא שינוי" : "סיסמה התחלתית"}
                data-testid="input-password"
              />
              <Button type="button" size="sm" variant="outline" onClick={() => setForm((f) => ({ ...f, password: generatePassword() }))}>
                גרע
              </Button>
            </div>
            <div className="text-[11px] text-muted-foreground">
              הסיסמה תישמר מוצפנת (Hash) בלבד. עד השליחה לאדמיניסטרציה / הלקוח נשמרת גם גרסה תקנית למשלוח.
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>מסלול</Label>
            <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">בסיסי</SelectItem>
                <SelectItem value="premium">פרימיום</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>קשיור ללקוח פיננסי</Label>
            <Select
              value={form.finClientId ? String(form.finClientId) : "none"}
              onValueChange={(v) => setForm({ ...form, finClientId: v === "none" ? null : Number(v) })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">אין קשיור</SelectItem>
                {(finClientsQuery.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.fullName} · {c.phone || ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="u-notes">הערות</Label>
          <Textarea
            id="u-notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            data-testid="input-notes"
          />
        </div>
        {existingUser && (
          <div className="rounded-md border border-dashed border-card-border p-3 bg-muted/30 space-y-2">
            <div className="text-sm font-medium">שליחת פרטי כניסה</div>
            <div className="text-xs text-muted-foreground">
              מצב: {existingUser.passwordPlain ? "סיסמה זמינה לשליחה חד פעמית." : existingUser.credentialsDeliveredAt ? `נשלחו בתאריך ${existingUser.credentialsDeliveredAt}.` : "לא נשלחו עדיין."}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={!existingUser.passwordPlain}
                onClick={async () => {
                  setSendStatus("שולח...");
                  try {
                    const r = await apiRequest("POST", `/api/admin/users/${existingUser.id}/send-credentials`, { channel: "email" });
                    const j = await r.json();
                    setSendStatus(j.ok ? `נשלח דרך הוובהוק · HTTP ${j.httpStatus} · log #${j.logId}` : `נכשל: ${j.note || j.message}`);
                    await queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
                  } catch (e) {
                    setSendStatus(e instanceof Error ? e.message : "שגיאה");
                  }
                }}
                data-testid="button-send-credentials"
              >
                שלח פרטי כניסה לוובהוק
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setForm((f) => ({ ...f, password: generatePassword() }));
                }}
              >
                צור סיסמה חדשה
              </Button>
            </div>
            {sendStatus && <div className="text-xs text-foreground/80">{sendStatus}</div>}
          </div>
        )}

        {error && <div className="text-sm text-destructive">{error}</div>}

        <div className="flex items-center justify-between gap-2 pt-2">
          {onDelete ? (
            <Button type="button" variant="ghost" className="text-destructive gap-1" onClick={onDelete} data-testid="button-delete-user">
              <Trash2 className="w-4 h-4" /> מחיקה
            </Button>
          ) : <span />}
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose}>ביטול</Button>
            <Button type="submit" disabled={busy} data-testid="button-save-user">
              {busy ? "שומר..." : "שמירה"}
            </Button>
          </div>
        </div>
      </form>
    </DialogContent>
  );
}

export default function UsersPage() {
  return (
    <AdminGate>
      <UsersInner />
    </AdminGate>
  );
}
