import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ScrollText, Trash2, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { localDateString } from "@/lib/utils";
import { toast } from "sonner";

// architecture.md §5.2 "רב / מורה הוראה": "הלכה יומית". public.halacha_daily
// (tenant_id/date/title/body/source/category/audio_url) + generic
// tenant_read/tenant_write RLS already existed since 20260519000002, and
// pages/public/HalachaDaily.tsx already reads it for the public listing --
// but no screen anywhere ever wrote to it, so a rabbi/mori_horaah tenant had
// no way to publish a daily halacha at all.

const emptyForm = { date: localDateString(), title: "", body: "", source: "", category: "" };

export default function PortalHalachaDaily() {
  const { tenant } = useTenant();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["portal-halacha-daily", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("halacha_daily")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .order("date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (row: any) => {
    setEditId(row.id);
    setForm({
      date: row.date || localDateString(),
      title: row.title || "",
      body: row.body || "",
      source: row.source || "",
      category: row.category || "",
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("חסר ארגון");
      const payload = {
        tenant_id: tenant.id,
        date: form.date,
        title: form.title,
        body: form.body,
        source: form.source || null,
        category: form.category || null,
      };
      if (editId) {
        const { error } = await supabase.from("halacha_daily").update(payload).eq("id", editId).eq("tenant_id", tenant.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("halacha_daily").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "ההלכה עודכנה" : "ההלכה פורסמה");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["portal-halacha-daily", tenant?.id] });
    },
    onError: (e: Error) => toast.error("שגיאה: " + e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("halacha_daily").delete().eq("id", id).eq("tenant_id", tenant!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("נמחקה");
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ["portal-halacha-daily", tenant?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl">הלכה יומית</h1>
        <Button onClick={openCreate}>
          <Plus className="ml-2 h-4 w-4" />
          הלכה חדשה
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "עריכת הלכה" : "הלכה חדשה"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>תאריך *</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <Label>קטגוריה</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="הלכות שבת..." />
              </div>
            </div>
            <div>
              <Label>כותרת *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="כותרת ההלכה" />
            </div>
            <div>
              <Label>תוכן *</Label>
              <Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={6} placeholder="תוכן ההלכה" />
            </div>
            <div>
              <Label>מקור</Label>
              <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="שולחן ערוך, משנה ברורה..." />
            </div>
            <Button
              className="w-full"
              onClick={() => save.mutate()}
              disabled={save.isPending || !form.title || !form.body || !form.date}
            >
              {save.isPending ? "שומר..." : editId ? "שמור שינויים" : "פרסם הלכה"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>מחיקת הלכה</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">האם אתה בטוח שברצונך למחוק הלכה זו?</p>
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

      <div className="space-y-3">
        {(data || []).map((h: any) => (
          <Card key={h.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" /> {new Date(h.date).toLocaleDateString("he-IL")}
                  {h.category && <span className="rounded-full border px-2 py-0.5">{h.category}</span>}
                </div>
                <Button size="icon" variant="ghost" onClick={() => setDeleteId(h.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <button className="font-medium mb-1 text-right w-full hover:underline" onClick={() => openEdit(h)}>
                {h.title}
              </button>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">{h.body}</div>
              {h.source && <div className="text-xs text-muted-foreground mt-2">מקור: {h.source}</div>}
            </CardContent>
          </Card>
        ))}
        {(data?.length || 0) === 0 && (
          <div className="text-muted-foreground flex items-center gap-2">
            <ScrollText className="h-4 w-4" /> אין הלכות עדיין
          </div>
        )}
      </div>
    </div>
  );
}
