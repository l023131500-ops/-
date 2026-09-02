import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, UserRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

const emptyForm = { full_name: "", phone: "", whatsapp: "", email: "", lesson_id: "", notes: "" };

export default function Participants() {
  const { tenant } = useTenant();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["participants", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase.from("participants").select("*, lessons(title)").eq("tenant_id", tenant!.id).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ["participants-lessons", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("lessons").select("id, title").eq("tenant_id", tenant!.id).eq("is_active", true).order("title");
      if (error) throw error;
      return data || [];
    },
  });

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (p: any) => {
    setEditId(p.id);
    setForm({
      full_name: p.full_name || "",
      phone: p.phone || "",
      whatsapp: p.whatsapp || "",
      email: p.email || "",
      lesson_id: p.lesson_id || "",
      notes: p.notes || "",
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("חסר ארגון");
      const payload = {
        full_name: form.full_name,
        phone: form.phone || null,
        whatsapp: form.whatsapp || null,
        email: form.email || null,
        lesson_id: form.lesson_id || null,
        notes: form.notes || null,
      };
      if (editId) {
        const { error } = await supabase.from("participants").update(payload).eq("id", editId).eq("tenant_id", tenant.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("participants").insert({ ...payload, tenant_id: tenant.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "משתתף עודכן" : "משתתף נוסף");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["participants"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("participants").delete().eq("id", id).eq("tenant_id", tenant!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("נמחק");
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ["participants"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl">משתתפים</h1>
        <Button onClick={openCreate}>
          <Plus className="ml-2 h-4 w-4" />
          משתתף חדש
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "עריכת משתתף" : "משתתף חדש"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>שם מלא *</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="שם המשתתף"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>טלפון</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="050-0000000" />
              </div>
              <div>
                <Label>וואטסאפ</Label>
                <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="050-0000000" />
              </div>
            </div>
            <div>
              <Label>אימייל</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" />
            </div>
            <div>
              <Label>שיעור</Label>
              <Select value={form.lesson_id} onValueChange={(v) => setForm({ ...form, lesson_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר שיעור (אופציונלי)" />
                </SelectTrigger>
                <SelectContent>
                  {lessons.map((l: any) => (
                    <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>הערות</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="הערות..." />
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
            <DialogTitle>מחיקת משתתף</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">האם אתה בטוח שברצונך למחוק משתתף זה?</p>
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
        {(data || []).map((p: any) => (
          <Card key={p.id}>
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserRound className="h-8 w-8 text-primary shrink-0" />
                <div>
                  <div className="font-medium">{p.full_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {p.lessons?.title}{p.lessons?.title && p.phone ? " · " : ""}{p.phone}
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setDeleteId(p.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {(data?.length || 0) === 0 && <div className="text-muted-foreground">אין משתתפים עדיין</div>}
      </div>
    </div>
  );
}
