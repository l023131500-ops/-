import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Bell, Trash2, Eye, EyeOff, Pin, PinOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

// announcements: title/body/category/publish_date/expires_at + is_pinned/is_published
// (architecture.md §5.2 synagogue "מודעות פנימיות" + council "מודעות לציבור").
// Table + generic tenant_read/tenant_write RLS existed live since 20260519000002
// but zero React screen anywhere ever referenced the table.

const CATEGORIES: { value: string; label: string }[] = [
  { value: "general", label: "כללי" },
  { value: "urgent", label: "דחוף" },
  { value: "event", label: "אירוע" },
  { value: "condolence", label: "אבל ותנחומים" },
];

const categoryLabel = (v: string | null) => CATEGORIES.find((c) => c.value === v)?.label || "כללי";

const emptyForm = { title: "", body: "", category: "general", publish_date: "", expires_at: "" };

export default function PortalAnnouncements() {
  const { tenant } = useTenant();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["portal-announcements", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("announcements")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
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
      title: row.title || "",
      body: row.body || "",
      category: row.category || "general",
      publish_date: row.publish_date || "",
      expires_at: row.expires_at || "",
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("חסר ארגון");
      const payload = {
        tenant_id: tenant.id,
        title: form.title,
        body: form.body || null,
        category: form.category,
        publish_date: form.publish_date || null,
        expires_at: form.expires_at || null,
      };
      if (editId) {
        const { error } = await supabase.from("announcements").update(payload).eq("id", editId).eq("tenant_id", tenant.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("announcements").insert({ ...payload, is_published: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "המודעה עודכנה" : "המודעה פורסמה");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["portal-announcements"] });
    },
    onError: (e: Error) => toast.error("שגיאה: " + e.message),
  });

  const togglePublish = useMutation({
    mutationFn: async (row: any) => {
      const { error } = await supabase
        .from("announcements")
        .update({ is_published: !row.is_published })
        .eq("id", row.id)
        .eq("tenant_id", tenant!.id);
      if (error) throw error;
    },
    onSuccess: (_d, row: any) => {
      toast.success(row.is_published ? "המודעה הוסרה מהפרסום" : "המודעה פורסמה");
      qc.invalidateQueries({ queryKey: ["portal-announcements"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePin = useMutation({
    mutationFn: async (row: any) => {
      const { error } = await supabase
        .from("announcements")
        .update({ is_pinned: !row.is_pinned })
        .eq("id", row.id)
        .eq("tenant_id", tenant!.id);
      if (error) throw error;
    },
    onSuccess: (_d, row: any) => {
      toast.success(row.is_pinned ? "הוסר מהצמדה" : "המודעה הוצמדה");
      qc.invalidateQueries({ queryKey: ["portal-announcements"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("announcements").delete().eq("id", id).eq("tenant_id", tenant!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("נמחקה");
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ["portal-announcements"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl">מודעות</h1>
        <Button onClick={openCreate}>
          <Plus className="ml-2 h-4 w-4" />
          מודעה חדשה
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "עריכת מודעה" : "מודעה חדשה"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>כותרת *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="כותרת המודעה" />
            </div>
            <div>
              <Label>תוכן</Label>
              <Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={4} placeholder="תוכן המודעה" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>קטגוריה</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>תאריך פרסום</Label>
                <Input type="date" value={form.publish_date} onChange={(e) => setForm({ ...form, publish_date: e.target.value })} />
              </div>
              <div>
                <Label>בתוקף עד</Label>
                <Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
              </div>
            </div>
            <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending || !form.title}>
              {save.isPending ? "שומר..." : editId ? "שמור שינויים" : "פרסם מודעה"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>מחיקת מודעה</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">האם אתה בטוח שברצונך למחוק מודעה זו?</p>
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

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(data || []).map((a: any) => (
          <Card key={a.id} className={a.is_pinned ? "border-primary" : undefined}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-2 gap-2">
                <Badge variant="outline" className="text-xs">
                  {categoryLabel(a.category)}
                </Badge>
                <Badge variant={a.is_published ? "success" : "outline"} className="text-xs">
                  {a.is_published ? "מפורסמת" : "טיוטה"}
                </Badge>
              </div>
              <button className="font-medium mb-1 text-right w-full hover:underline" onClick={() => openEdit(a)}>
                {a.title}
              </button>
              {a.body && <div className="text-sm text-muted-foreground mb-2 line-clamp-3">{a.body}</div>}
              <div className="text-xs text-muted-foreground mb-3">{a.publish_date || ""}</div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => togglePin.mutate(a)} disabled={togglePin.isPending}>
                  {a.is_pinned ? <PinOff className="ml-2 h-4 w-4" /> : <Pin className="ml-2 h-4 w-4" />}
                  {a.is_pinned ? "בטל הצמדה" : "הצמד"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => togglePublish.mutate(a)} disabled={togglePublish.isPending}>
                  {a.is_published ? <EyeOff className="ml-2 h-4 w-4" /> : <Eye className="ml-2 h-4 w-4" />}
                  {a.is_published ? "בטל פרסום" : "פרסם"}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setDeleteId(a.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {(data?.length || 0) === 0 && (
          <div className="text-muted-foreground flex items-center gap-2">
            <Bell className="h-4 w-4" /> אין מודעות עדיין
          </div>
        )}
      </div>
    </div>
  );
}
