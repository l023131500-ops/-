import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, ShieldCheck, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

// kashrut_certifications: business_name (required), business_type, address, city,
// hechsher_level, certifier, valid_from, valid_until, certificate_url, status, notes.
// public/Kashrut.tsx reads exactly this table (status='active') but until now no
// screen anywhere ever wrote to it, so the public page was permanently empty for
// every tenant.

// architecture.md line 87 documents kashrut_certifications as "תעודות, אישורים,
// התראות" (certificates, approvals, ALERTS) and §5.2 council bullet repeats
// "רשימת תעודות + התראות" -- valid_until existed since the table was created but
// nothing anywhere ever flagged an approaching/passed expiry to the tenant admin.
// Computed client-side from valid_until (no new table/migration needed): a
// certificate is "expiring soon" inside EXPIRY_WARNING_DAYS and "expired" once
// valid_until is in the past, regardless of the manually-set status field (which
// tenants often forget to update by hand -- the date is the source of truth here).
const EXPIRY_WARNING_DAYS = 30;

function daysUntil(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

const STATUS_OPTIONS = [
  { value: "active", label: "בתוקף" },
  { value: "pending", label: "ממתין לחידוש" },
  { value: "expired", label: "פג תוקף" },
];

const emptyForm = {
  business_name: "",
  business_type: "",
  address: "",
  city: "",
  hechsher_level: "",
  certifier: "",
  valid_from: "",
  valid_until: "",
  certificate_url: "",
  status: "active",
  notes: "",
};

export default function Kashrut() {
  const { tenant } = useTenant();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["kashrut-certifications", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("kashrut_certifications")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .order("business_name");
      return data || [];
    },
  });

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (k: any) => {
    setEditId(k.id);
    setForm({
      business_name: k.business_name || "",
      business_type: k.business_type || "",
      address: k.address || "",
      city: k.city || "",
      hechsher_level: k.hechsher_level || "",
      certifier: k.certifier || "",
      valid_from: k.valid_from || "",
      valid_until: k.valid_until || "",
      certificate_url: k.certificate_url || "",
      status: k.status || "active",
      notes: k.notes || "",
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("חסר ארגון");
      const payload = {
        business_name: form.business_name,
        business_type: form.business_type || null,
        address: form.address || null,
        city: form.city || null,
        hechsher_level: form.hechsher_level || null,
        certifier: form.certifier || null,
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
        certificate_url: form.certificate_url || null,
        status: form.status,
        notes: form.notes || null,
      };
      if (editId) {
        const { error } = await supabase.from("kashrut_certifications").update(payload).eq("id", editId).eq("tenant_id", tenant.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("kashrut_certifications").insert({ ...payload, tenant_id: tenant.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "תעודה עודכנה" : "תעודה נוספה");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["kashrut-certifications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("kashrut_certifications").delete().eq("id", id).eq("tenant_id", tenant!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("נמחק");
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ["kashrut-certifications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusVariant = (s: string) => (s === "active" ? "success" : s === "expired" ? "destructive" : "outline");
  const statusLabel = (s: string) => STATUS_OPTIONS.find((o) => o.value === s)?.label || s;

  // Expiry alerts: only certificates the tenant still treats as live (not
  // already marked expired/pending-renewal by hand) are worth alerting on --
  // avoids nagging about a cert that's already been dealt with.
  const expired = (data || []).filter((k: any) => k.valid_until && k.status === "active" && daysUntil(k.valid_until) < 0);
  const expiringSoon = (data || []).filter(
    (k: any) => k.valid_until && k.status === "active" && daysUntil(k.valid_until) >= 0 && daysUntil(k.valid_until) <= EXPIRY_WARNING_DAYS,
  );
  const expiryState = (k: any): "expired" | "soon" | null => {
    if (!k.valid_until || k.status !== "active") return null;
    const d = daysUntil(k.valid_until);
    if (d < 0) return "expired";
    if (d <= EXPIRY_WARNING_DAYS) return "soon";
    return null;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl">תעודות כשרות</h1>
        <Button onClick={openCreate}>
          <Plus className="ml-2 h-4 w-4" />
          תעודה חדשה
        </Button>
      </div>

      {(expired.length > 0 || expiringSoon.length > 0) && (
        <Card className="mb-6 border-yellow-300 bg-yellow-50/70 dark:bg-yellow-950/20">
          <CardContent className="py-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
              <div className="text-sm space-y-1">
                {expired.length > 0 && (
                  <div>
                    <span className="font-medium text-destructive">{expired.length} תעודות פג תוקפן: </span>
                    {expired.map((k: any) => k.business_name).join(", ")}
                  </div>
                )}
                {expiringSoon.length > 0 && (
                  <div>
                    <span className="font-medium">{expiringSoon.length} תעודות עומדות לפוג ({EXPIRY_WARNING_DAYS} הימים הקרובים): </span>
                    {expiringSoon.map((k: any) => k.business_name).join(", ")}
                  </div>
                )}
                <div className="text-muted-foreground">מומלץ לעדכן את התעודות מול הגוף המכשיר ולסמן כ״פג תוקף״ / לחדש את התאריך.</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "עריכת תעודה" : "תעודת כשרות חדשה"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>שם העסק *</Label>
              <Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} placeholder="מסעדת..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>סוג העסק</Label>
                <Input value={form.business_type} onChange={(e) => setForm({ ...form, business_type: e.target.value })} placeholder="מסעדה / מאפייה / מכולת..." />
              </div>
              <div>
                <Label>רמת כשרות</Label>
                <Input value={form.hechsher_level} onChange={(e) => setForm({ ...form, hechsher_level: e.target.value })} placeholder="מהדרין / רגיל..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>כתובת</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div>
                <Label>עיר</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>גוף מכשיר</Label>
              <Input value={form.certifier} onChange={(e) => setForm({ ...form, certifier: e.target.value })} placeholder="הרבנות הראשית / בד״ץ..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>בתוקף מ־</Label>
                <Input type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} />
              </div>
              <div>
                <Label>בתוקף עד</Label>
                <Input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>סטטוס</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>קישור לתעודה (אופציונלי)</Label>
              <Input value={form.certificate_url} onChange={(e) => setForm({ ...form, certificate_url: e.target.value })} placeholder="https://..." />
            </div>
            <div>
              <Label>הערות</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
            </div>
            <Button
              className="w-full"
              onClick={() => save.mutate()}
              disabled={save.isPending || !form.business_name}
            >
              {save.isPending ? "שומר..." : "שמור"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>מחיקת תעודה</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">האם אתה בטוח שברצונך למחוק תעודת כשרות זו?</p>
          <div className="flex gap-2 mt-4">
            <Button variant="destructive" className="flex-1" onClick={() => deleteId && del.mutate(deleteId)} disabled={del.isPending}>
              מחק
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>
              ביטול
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        {(data || []).map((k: any) => (
          <Card key={k.id}>
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-8 w-8 text-primary shrink-0" />
                <div>
                  <div className="font-medium">{k.business_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {k.hechsher_level}{k.hechsher_level && k.city ? " · " : ""}{k.city}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={statusVariant(k.status)}>{statusLabel(k.status)}</Badge>
                {expiryState(k) === "expired" && <Badge variant="destructive">פג תוקף בפועל</Badge>}
                {expiryState(k) === "soon" && <Badge className="bg-yellow-500 hover:bg-yellow-500">עומד לפוג</Badge>}
                <Button size="icon" variant="ghost" onClick={() => openEdit(k)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setDeleteId(k.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {(data?.length || 0) === 0 && <div className="text-muted-foreground">אין תעודות כשרות עדיין</div>}
      </div>
    </div>
  );
}
