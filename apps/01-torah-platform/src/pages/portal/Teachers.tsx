import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, GraduationCap, Phone, Mail, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

// architecture.md §5.2 organization: "ניהול מגידי שיעור משויכים לארגון".
// public.teachers has a tenant_id column but only ever had a public SELECT
// policy (is_active AND is_approved) and zero write policy -- an organization
// had no way to see or manage its own teacher roster (unapproved/inactive
// rows included). Migration 20260831260000 added tenant-scoped read/write
// RLS (mirrors synagogues_tenant_*); this screen is the first UI to use it.

const emptyForm = {
  full_name: "",
  display_name: "",
  bio: "",
  phone: "",
  whatsapp: "",
  email: "",
  city: "",
  neighborhood: "",
  audiences: "",
  subjects: "",
  languages: "",
  styles: "",
  is_active: true,
  is_approved: true,
};

const toArray = (s: string) => s.split(",").map((v) => v.trim()).filter(Boolean);
const toCsv = (a: string[] | null | undefined) => (a || []).join(", ");

export default function PortalTeachers() {
  const { tenant } = useTenant();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["portal-teachers", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("teachers")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .order("full_name");
      return data || [];
    },
  });

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (t: any) => {
    setEditId(t.id);
    setForm({
      full_name: t.full_name || "",
      display_name: t.display_name || "",
      bio: t.bio || "",
      phone: t.phone || "",
      whatsapp: t.whatsapp || "",
      email: t.email || "",
      city: t.city || "",
      neighborhood: t.neighborhood || "",
      audiences: toCsv(t.audiences),
      subjects: toCsv(t.subjects),
      languages: toCsv(t.languages),
      styles: toCsv(t.styles),
      is_active: t.is_active ?? true,
      is_approved: t.is_approved ?? true,
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("חסר ארגון");
      const payload = {
        full_name: form.full_name,
        display_name: form.display_name || null,
        bio: form.bio || null,
        phone: form.phone || null,
        whatsapp: form.whatsapp || null,
        email: form.email || null,
        city: form.city || null,
        neighborhood: form.neighborhood || null,
        audiences: toArray(form.audiences),
        subjects: toArray(form.subjects),
        languages: toArray(form.languages),
        styles: toArray(form.styles),
        is_active: form.is_active,
        is_approved: form.is_approved,
      };
      if (editId) {
        const { error } = await supabase.from("teachers").update(payload).eq("id", editId).eq("tenant_id", tenant.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("teachers").insert({ ...payload, tenant_id: tenant.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "המגיד עודכן" : "המגיד נוסף");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["portal-teachers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("teachers").delete().eq("id", id).eq("tenant_id", tenant!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("נמחק");
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ["portal-teachers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl">מגידי שיעור בארגון</h1>
        <Button onClick={openCreate}>
          <Plus className="ml-2 h-4 w-4" />
          מגיד שיעור חדש
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "עריכת מגיד שיעור" : "מגיד שיעור חדש"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>שם מלא *</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="הרב..." />
            </div>
            <div>
              <Label>שם תצוגה</Label>
              <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>טלפון</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label>וואטסאפ</Label>
                <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>מייל</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr" />
              </div>
              <div>
                <Label>עיר</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>שכונה</Label>
              <Input value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} />
            </div>
            <div>
              <Label>נושאים (מופרדים בפסיק)</Label>
              <Input value={form.subjects} onChange={(e) => setForm({ ...form, subjects: e.target.value })} placeholder="הלכה, פרשת שבוע, מוסר" />
            </div>
            <div>
              <Label>קהלי יעד (מופרדים בפסיק)</Label>
              <Input value={form.audiences} onChange={(e) => setForm({ ...form, audiences: e.target.value })} placeholder="גברים, נשים, נוער" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>שפות (מופרדות בפסיק)</Label>
                <Input value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} placeholder="עברית, אנגלית" />
              </div>
              <div>
                <Label>סגנונות (מופרדים בפסיק)</Label>
                <Input value={form.styles} onChange={(e) => setForm({ ...form, styles: e.target.value })} placeholder="עיוני, מעשי" />
              </div>
            </div>
            <div>
              <Label>קורות חיים / תיאור</Label>
              <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>פעיל</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_approved} onCheckedChange={(v) => setForm({ ...form, is_approved: v })} />
                <Label>מאושר לתצוגה ציבורית</Label>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => save.mutate()}
              disabled={save.isPending || !form.full_name}
            >
              {save.isPending ? "שומר..." : "שמור"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>מחיקת מגיד שיעור</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">האם אתה בטוח שברצונך למחוק מגיד שיעור זה?</p>
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
        {(data || []).map((t: any) => {
          const isOpen = expandedId === t.id;
          return (
            <Card key={t.id}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <button
                    className="flex items-center gap-3 flex-1 text-right"
                    onClick={() => setExpandedId(isOpen ? null : t.id)}
                  >
                    <GraduationCap className="h-8 w-8 text-primary shrink-0" />
                    <div>
                      <div className="font-medium">{t.display_name || t.full_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {(t.subjects || []).slice(0, 3).join(", ")}{t.city ? ` · ${t.city}` : ""}
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    {!t.is_active && <Badge variant="outline">לא פעיל</Badge>}
                    {!t.is_approved && <Badge variant="outline">ממתין לאישור</Badge>}
                    <Button size="icon" variant="ghost" onClick={() => openEdit(t)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteId(t.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setExpandedId(isOpen ? null : t.id)}>
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                {isOpen && (
                  <div className="mt-3 pt-3 border-t space-y-1.5 text-sm text-muted-foreground">
                    {(t.city || t.neighborhood) && <div className="flex items-center gap-2"><MapPin className="h-3 w-3" /> {t.city}{t.neighborhood ? ` (${t.neighborhood})` : ""}</div>}
                    {t.phone && <div className="flex items-center gap-2"><Phone className="h-3 w-3" /> {t.phone}</div>}
                    {t.email && <div className="flex items-center gap-2"><Mail className="h-3 w-3" /> {t.email}</div>}
                    {(t.audiences?.length > 0) && <div>קהלי יעד: {t.audiences.join(", ")}</div>}
                    {(t.languages?.length > 0) && <div>שפות: {t.languages.join(", ")}</div>}
                    {(t.styles?.length > 0) && <div>סגנונות: {t.styles.join(", ")}</div>}
                    {t.bio && <p className="text-foreground/85 pt-1">{t.bio}</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {(data?.length || 0) === 0 && <div className="text-muted-foreground">אין מגידי שיעור רשומים עדיין</div>}
      </div>
    </div>
  );
}
