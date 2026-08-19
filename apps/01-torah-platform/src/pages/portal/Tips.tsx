import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Edit2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Using the `tips` table: id, body, category, created_at, is_active

const CATEGORIES: Record<string, string> = {
  halacha: "הלכה",
  mussar: "מוסר",
  parsha: "פרשת השבוע",
  general: "כללי",
};

type Tip = {
  id: string;
  body: string;
  category: string | null;
  is_active: boolean | null;
  created_at: string;
};

const emptyForm = { body: "", category: "general", is_active: true };

export default function Tips() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editTip, setEditTip] = useState<Tip | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: tips = [], isLoading } = useQuery({
    queryKey: ["portal-tips"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tips")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Tip[];
    },
  });

  const openCreate = () => {
    setEditTip(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (tip: Tip) => {
    setEditTip(tip);
    setForm({ body: tip.body, category: tip.category || "general", is_active: tip.is_active ?? true });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (editTip) {
        const { error } = await supabase
          .from("tips")
          .update({ body: form.body, category: form.category, is_active: form.is_active })
          .eq("id", editTip.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("tips")
          .insert({ body: form.body, category: form.category, is_active: form.is_active, created_at: new Date().toISOString() });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editTip ? "טיפ עודכן" : "טיפ נוסף");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["portal-tips"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tips").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("נמחק");
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ["portal-tips"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("tips").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("סטטוס עודכן");
      qc.invalidateQueries({ queryKey: ["portal-tips"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl">טיפים יומיים</h1>
        <Button onClick={openCreate}>
          <Plus className="ml-2 h-4 w-4" />
          טיפ חדש
        </Button>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTip ? "עריכת טיפ" : "טיפ חדש"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>קטגוריה</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>תוכן *</Label>
              <Textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                rows={5}
                placeholder="תוכן הטיפ..."
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active-check"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="active-check" className="cursor-pointer">
                פעיל / מפורסם
              </Label>
            </div>
            <Button
              className="w-full"
              onClick={() => save.mutate()}
              disabled={save.isPending || !form.body}
            >
              {save.isPending ? "שומר..." : "שמור"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>מחיקת טיפ</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">האם אתה בטוח שברצונך למחוק טיפ זה?</p>
          <div className="flex gap-2 mt-4">
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => deleteId && del.mutate(deleteId)}
              disabled={del.isPending}
            >
              מחק
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>
              ביטול
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tips list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">רשימת טיפים ({tips.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">טוען...</div>
          ) : tips.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">אין טיפים עדיין</div>
          ) : (
            <div className="divide-y">
              {/* Header row */}
              <div className="grid grid-cols-[1fr_120px_100px_120px_120px] gap-2 px-4 py-2 text-sm font-medium text-muted-foreground">
                <span>תוכן</span>
                <span>קטגוריה</span>
                <span>סטטוס</span>
                <span>תאריך</span>
                <span>פעולות</span>
              </div>
              {tips.map((tip) => (
                <div
                  key={tip.id}
                  className="grid grid-cols-[1fr_120px_100px_120px_120px] gap-2 px-4 py-3 items-center hover:bg-muted/30"
                >
                  <p className="text-sm line-clamp-2">{tip.body}</p>
                  <span>
                    <Badge variant="outline">
                      {CATEGORIES[tip.category || ""] || tip.category || "כללי"}
                    </Badge>
                  </span>
                  <span>
                    <Badge variant={tip.is_active ? "default" : "secondary"}>
                      {tip.is_active ? "פעיל" : "לא פעיל"}
                    </Badge>
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {new Date(tip.created_at).toLocaleDateString("he-IL")}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => toggleActive.mutate({ id: tip.id, is_active: !tip.is_active })}
                      title={tip.is_active ? "הסתר" : "הפעל"}
                    >
                      {tip.is_active ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEdit(tip)}
                      title="עריכה"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteId(tip.id)}
                      title="מחיקה"
                    >
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
