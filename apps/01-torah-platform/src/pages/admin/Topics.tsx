import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Eye, EyeOff, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// public.lesson_topics: id, slug, name, parent_id, description, icon, sort_order, is_active
// Read by public/FindLesson.tsx + public/LessonsDirectory.tsx topic dropdowns; RLS write is
// already is_super_admin-gated (topics_write_ins/upd/del) — this screen was the missing piece.

type Topic = {
  id: string;
  slug: string;
  name: string;
  parent_id: string | null;
  description: string | null;
  icon: string | null;
  sort_order: number | null;
  is_active: boolean | null;
};

const emptyForm = { name: "", slug: "", description: "", icon: "", sort_order: 0 };

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9֐-׿]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminTopics() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Topic | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: topics = [], isLoading } = useQuery({
    queryKey: ["admin-topics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_topics")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as Topic[];
    },
  });

  const openCreate = () => {
    setForm(emptyForm);
    setCreating(true);
  };

  const openEdit = (t: Topic) => {
    setForm({
      name: t.name,
      slug: t.slug,
      description: t.description || "",
      icon: t.icon || "",
      sort_order: t.sort_order ?? 0,
    });
    setEditing(t);
  };

  const create = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("שם הנושא חובה");
      const slug = form.slug.trim() || slugify(form.name);
      const { error } = await supabase.from("lesson_topics").insert({
        name: form.name.trim(),
        slug,
        description: form.description.trim() || null,
        icon: form.icon.trim() || null,
        sort_order: Number(form.sort_order) || 0,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("נושא נוסף");
      setCreating(false);
      qc.invalidateQueries({ queryKey: ["admin-topics"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      if (!form.name.trim()) throw new Error("שם הנושא חובה");
      const { error } = await supabase
        .from("lesson_topics")
        .update({
          name: form.name.trim(),
          slug: form.slug.trim() || slugify(form.name),
          description: form.description.trim() || null,
          icon: form.icon.trim() || null,
          sort_order: Number(form.sort_order) || 0,
        })
        .eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("נושא עודכן");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-topics"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("lesson_topics").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-topics"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lesson_topics").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("נושא נמחק");
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ["admin-topics"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activeCount = topics.filter((t) => t.is_active).length;

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl">מאגר נושאי שיעורים</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 ml-1" />
          נושא חדש
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{topics.length}</div>
            <div className="text-sm text-muted-foreground">סה"כ נושאים</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
            <div className="text-sm text-muted-foreground">פעילים (מוצגים בטפסים)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{topics.length - activeCount}</div>
            <div className="text-sm text-muted-foreground">מוסתרים</div>
          </CardContent>
        </Card>
      </div>

      {/* Create / Edit dialog */}
      <Dialog
        open={creating || !!editing}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false);
            setEditing(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "עריכת נושא" : "נושא חדש"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>שם הנושא</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="לדוגמה: הלכות שבת" />
            </div>
            <div>
              <Label>מזהה (slug) — יווצר אוטומטית אם ריק</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="halachot-shabbat" dir="ltr" />
            </div>
            <div>
              <Label>תיאור (אופציונלי)</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>אייקון (שם lucide, אופציונלי)</Label>
                <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} dir="ltr" />
              </div>
              <div>
                <Label>סדר תצוגה</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => (editing ? update.mutate() : create.mutate())}
              disabled={create.isPending || update.isPending}
            >
              {editing ? "שמור" : "הוסף"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>מחיקת נושא</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            הנושא ייעלם מכל טפסי הבחירה. שיעורים קיימים שכבר משויכים לנושא זה לא יימחקו. האם להמשיך?
          </p>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">כל הנושאים</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">טוען...</div>
          ) : topics.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">אין נושאים במאגר</div>
          ) : (
            <div className="divide-y">
              <div className="grid grid-cols-[32px_1fr_120px_100px_100px_120px] gap-2 px-4 py-2 text-sm font-medium text-muted-foreground">
                <span />
                <span>שם</span>
                <span>מזהה</span>
                <span>סדר</span>
                <span>סטטוס</span>
                <span>פעולות</span>
              </div>
              {topics.map((t) => (
                <div
                  key={t.id}
                  className="grid grid-cols-[32px_1fr_120px_100px_100px_120px] gap-2 px-4 py-3 items-center hover:bg-muted/30"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                  <span className="text-sm font-medium">{t.name}</span>
                  <span className="text-xs text-muted-foreground" dir="ltr">
                    {t.slug}
                  </span>
                  <span className="text-sm text-muted-foreground">{t.sort_order ?? 0}</span>
                  <span>
                    <Badge variant={t.is_active ? "default" : "secondary"}>{t.is_active ? "פעיל" : "מוסתר"}</Badge>
                  </span>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => toggleActive.mutate({ id: t.id, is_active: !t.is_active })}
                      disabled={toggleActive.isPending}
                      title={t.is_active ? "הסתר" : "הפעל"}
                    >
                      {t.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => openEdit(t)} title="עריכה">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteId(t.id)} title="מחיקה">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
