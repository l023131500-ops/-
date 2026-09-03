import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Eye, EyeOff, ChevronDown, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// public.material_categories: id, name, parent_id, sort_order, is_active.
// Read by portal/Materials.tsx (upload form) + admin/Content.tsx (filter);
// RLS write is super-admin-only (material_categories_write) — this screen
// is the missing piece (architecture.md §5.3 "ניהול קטגוריות חומרי עזר").

type Category = {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number | null;
  is_active: boolean | null;
};

const emptyForm = { name: "", sort_order: 0 };

export default function AdminMaterialCategories() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Category | null>(null);
  const [creatingUnder, setCreatingUnder] = useState<string | null | "top">(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["admin-material-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("material_categories")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as Category[];
    },
  });

  const top = categories.filter((c) => !c.parent_id);
  const subsOf = (id: string) => categories.filter((c) => c.parent_id === id);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openCreate = (parentId: string | "top") => {
    setForm(emptyForm);
    setCreatingUnder(parentId);
  };

  const openEdit = (c: Category) => {
    setForm({ name: c.name, sort_order: c.sort_order ?? 0 });
    setEditing(c);
  };

  const create = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("שם הקטגוריה חובה");
      const { error } = await supabase.from("material_categories").insert({
        name: form.name.trim(),
        parent_id: creatingUnder === "top" ? null : creatingUnder,
        sort_order: Number(form.sort_order) || 0,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("קטגוריה נוספה");
      setCreatingUnder(null);
      qc.invalidateQueries({ queryKey: ["admin-material-categories"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      if (!form.name.trim()) throw new Error("שם הקטגוריה חובה");
      const { error } = await supabase
        .from("material_categories")
        .update({ name: form.name.trim(), sort_order: Number(form.sort_order) || 0 })
        .eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("קטגוריה עודכנה");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-material-categories"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("material_categories").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-material-categories"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("material_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("קטגוריה נמחקה");
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ["admin-material-categories"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activeTopCount = top.filter((c) => c.is_active).length;

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl">קטגוריות חומרי עזר</h1>
        <Button onClick={() => openCreate("top")}>
          <Plus className="h-4 w-4 ml-1" />
          קטגוריה חדשה
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{top.length}</div>
            <div className="text-sm text-muted-foreground">קטגוריות ראשיות</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{activeTopCount}</div>
            <div className="text-sm text-muted-foreground">פעילות (מוצגות בטפסים)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{categories.length - top.length}</div>
            <div className="text-sm text-muted-foreground">סה"כ תתי־קטגוריות</div>
          </CardContent>
        </Card>
      </div>

      {/* Create / Edit dialog */}
      <Dialog
        open={!!creatingUnder || !!editing}
        onOpenChange={(o) => {
          if (!o) {
            setCreatingUnder(null);
            setEditing(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? "עריכת קטגוריה"
                : creatingUnder === "top"
                ? "קטגוריה ראשית חדשה"
                : "תת־קטגוריה חדשה"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>שם</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="לדוגמה: הלכות שבת" />
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
            <DialogTitle>מחיקת קטגוריה</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            תתי־קטגוריות ישירות תחתיה יימחקו גם הן. חומרי עזר קיימים שכבר משויכים לקטגוריה זו לא יימחקו. האם להמשיך?
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
          <CardTitle className="text-lg">כל הקטגוריות</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">טוען...</div>
          ) : top.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">אין קטגוריות עדיין</div>
          ) : (
            <div className="divide-y">
              {top.map((c) => {
                const subs = subsOf(c.id);
                const isOpen = expanded.has(c.id);
                return (
                  <div key={c.id}>
                    <div className="grid grid-cols-[32px_1fr_100px_100px_140px] gap-2 px-4 py-3 items-center hover:bg-muted/30">
                      <button onClick={() => toggleExpand(c.id)} className="text-muted-foreground">
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                      </button>
                      <span className="text-sm font-medium">
                        {c.name}
                        {subs.length > 0 && <span className="text-xs text-muted-foreground mr-2">({subs.length})</span>}
                      </span>
                      <span className="text-sm text-muted-foreground">{c.sort_order ?? 0}</span>
                      <span>
                        <Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "פעיל" : "מוסתר"}</Badge>
                      </span>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openCreate(c.id)} title="הוסף תת־קטגוריה">
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => toggleActive.mutate({ id: c.id, is_active: !c.is_active })}
                          disabled={toggleActive.isPending}
                          title={c.is_active ? "הסתר" : "הפעל"}
                        >
                          {c.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(c)} title="עריכה">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteId(c.id)} title="מחיקה">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    {isOpen && subs.length > 0 && (
                      <div className="bg-muted/20">
                        {subs.map((s) => (
                          <div
                            key={s.id}
                            className="grid grid-cols-[32px_1fr_100px_100px_140px] gap-2 pr-8 pl-4 py-2 items-center hover:bg-muted/30 border-t"
                          >
                            <span />
                            <span className="text-sm">{s.name}</span>
                            <span className="text-sm text-muted-foreground">{s.sort_order ?? 0}</span>
                            <span>
                              <Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? "פעיל" : "מוסתר"}</Badge>
                            </span>
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => toggleActive.mutate({ id: s.id, is_active: !s.is_active })}
                                disabled={toggleActive.isPending}
                                title={s.is_active ? "הסתר" : "הפעל"}
                              >
                                {s.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => openEdit(s)} title="עריכה">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => setDeleteId(s.id)} title="מחיקה">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
