import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Heart, Calendar, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

// azkarot: public/Azkarot.tsx already lets a family submit a new row (deceased_name +
// hebrew date + contact), and azkarot_upcoming() already exposes the public-safe
// columns to anonymous visitors — but no screen anywhere let tenant staff SEE the
// full submitted records (family contact info), fix a typo, set next_azkara_date, or
// remove a duplicate/spam entry. This is that management screen.

const emptyForm = {
  deceased_name: "",
  deceased_father_name: "",
  date_of_death_hebrew: "",
  date_of_death: "",
  next_azkara_date: "",
  family_contact_name: "",
  family_contact_phone: "",
  notes: "",
};

export default function PortalAzkarot() {
  const { tenant } = useTenant();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["portal-azkarot", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("azkarot")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .order("next_azkara_date", { ascending: true, nullsFirst: false });
      return data || [];
    },
  });

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (a: any) => {
    setEditId(a.id);
    setForm({
      deceased_name: a.deceased_name || "",
      deceased_father_name: a.deceased_father_name || "",
      date_of_death_hebrew: a.date_of_death_hebrew || "",
      date_of_death: a.date_of_death || "",
      next_azkara_date: a.next_azkara_date || "",
      family_contact_name: a.family_contact_name || "",
      family_contact_phone: a.family_contact_phone || "",
      notes: a.notes || "",
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("חסר ארגון");
      const payload = {
        deceased_name: form.deceased_name,
        deceased_father_name: form.deceased_father_name || null,
        date_of_death_hebrew: form.date_of_death_hebrew || null,
        date_of_death: form.date_of_death || null,
        next_azkara_date: form.next_azkara_date || null,
        family_contact_name: form.family_contact_name || null,
        family_contact_phone: form.family_contact_phone || null,
        notes: form.notes || null,
      };
      if (editId) {
        const { error } = await supabase.from("azkarot").update(payload).eq("id", editId).eq("tenant_id", tenant.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("azkarot").insert({ ...payload, tenant_id: tenant.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "האזכרה עודכנה" : "האזכרה נוספה");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["portal-azkarot"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("azkarot").delete().eq("id", id).eq("tenant_id", tenant!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("נמחק");
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ["portal-azkarot"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl">אזכרות ויארצייט</h1>
        <Button onClick={openCreate}>
          <Plus className="ml-2 h-4 w-4" />
          אזכרה חדשה
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "עריכת אזכרה" : "אזכרה חדשה"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>שם הנפטר/ת *</Label>
                <Input value={form.deceased_name} onChange={(e) => setForm({ ...form, deceased_name: e.target.value })} />
              </div>
              <div>
                <Label>שם האב</Label>
                <Input value={form.deceased_father_name} onChange={(e) => setForm({ ...form, deceased_father_name: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>תאריך פטירה עברי</Label>
                <Input value={form.date_of_death_hebrew} onChange={(e) => setForm({ ...form, date_of_death_hebrew: e.target.value })} placeholder="ט״ו בשבט תשפ״ה" />
              </div>
              <div>
                <Label>תאריך פטירה לועזי</Label>
                <Input type="date" value={form.date_of_death} onChange={(e) => setForm({ ...form, date_of_death: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>יארצייט הבא (לועזי)</Label>
              <Input type="date" value={form.next_azkara_date} onChange={(e) => setForm({ ...form, next_azkara_date: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>איש קשר במשפחה</Label>
                <Input value={form.family_contact_name} onChange={(e) => setForm({ ...form, family_contact_name: e.target.value })} />
              </div>
              <div>
                <Label>טלפון</Label>
                <Input value={form.family_contact_phone} onChange={(e) => setForm({ ...form, family_contact_phone: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>הערות</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
            <Button
              className="w-full"
              onClick={() => save.mutate()}
              disabled={save.isPending || !form.deceased_name}
            >
              {save.isPending ? "שומר..." : "שמור"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>מחיקת אזכרה</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">האם אתה בטוח שברצונך למחוק רשומה זו?</p>
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
        {(data || []).map((a: any) => (
          <Card key={a.id}>
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Heart className="h-8 w-8 text-primary shrink-0" />
                  <div>
                    <div className="font-medium">
                      {a.deceased_name}{a.deceased_father_name ? ` ז״ל בן ${a.deceased_father_name}` : " ז״ל"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {a.date_of_death_hebrew || (a.date_of_death ? new Date(a.date_of_death).toLocaleDateString("he-IL") : "")}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(a)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setDeleteId(a.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              {(a.next_azkara_date || a.family_contact_phone) && (
                <div className="mt-3 pt-3 border-t space-y-1.5 text-sm text-muted-foreground">
                  {a.next_azkara_date && <div className="flex items-center gap-2"><Calendar className="h-3 w-3" /> יארצייט הבא: {new Date(a.next_azkara_date).toLocaleDateString("he-IL")}</div>}
                  {a.family_contact_phone && <div className="flex items-center gap-2"><Phone className="h-3 w-3" /> {a.family_contact_name ? `${a.family_contact_name} · ` : ""}{a.family_contact_phone}</div>}
                  {a.notes && <p className="text-foreground/85 pt-1">{a.notes}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {(data?.length || 0) === 0 && <div className="text-muted-foreground">אין אזכרות רשומות עדיין</div>}
      </div>
    </div>
  );
}
