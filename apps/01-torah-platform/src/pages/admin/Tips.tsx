import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Trash2, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Using `tips` table: id (uuid), body, category, created_at, is_active

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

export default function AdminTips() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewTip, setPreviewTip] = useState<Tip | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: tips = [], isLoading } = useQuery({
    queryKey: ["admin-tips"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tips")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Tip[];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("tips").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("סטטוס עודכן");
      qc.invalidateQueries({ queryKey: ["admin-tips"] });
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
      qc.invalidateQueries({ queryKey: ["admin-tips"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkActivate = useMutation({
    mutationFn: async (is_active: boolean) => {
      if (selected.size === 0) return;
      const ids = Array.from(selected);
      const { error } = await supabase.from("tips").update({ is_active }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("פעולה בוצעה");
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["admin-tips"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkDelete = useMutation({
    mutationFn: async () => {
      if (selected.size === 0) return;
      const ids = Array.from(selected);
      const { error } = await supabase.from("tips").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("נמחקו");
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["admin-tips"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === tips.length) setSelected(new Set());
    else setSelected(new Set(tips.map((t) => t.id)));
  };

  const activeCount = tips.filter((t) => t.is_active).length;

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl">ניהול טיפים – כלל המערכת</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{tips.length}</div>
            <div className="text-sm text-muted-foreground">סה"כ טיפים</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
            <div className="text-sm text-muted-foreground">פעילים</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{tips.length - activeCount}</div>
            <div className="text-sm text-muted-foreground">לא פעילים</div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">{selected.size} נבחרו</span>
          <Button size="sm" variant="outline" onClick={() => bulkActivate.mutate(true)}>
            <Eye className="h-4 w-4 ml-1" />
            הפעל נבחרים
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkActivate.mutate(false)}>
            <EyeOff className="h-4 w-4 ml-1" />
            השבת נבחרים
          </Button>
          <Button size="sm" variant="destructive" onClick={() => bulkDelete.mutate()}>
            <Trash2 className="h-4 w-4 ml-1" />
            מחק נבחרים
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            בטל בחירה
          </Button>
        </div>
      )}

      {/* Preview dialog */}
      <Dialog open={!!previewTip} onOpenChange={(o) => !o && setPreviewTip(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>תצוגת טיפ</DialogTitle>
          </DialogHeader>
          <Badge variant="outline" className="w-fit">
            {previewTip && (CATEGORIES[previewTip.category || ""] || previewTip.category || "כללי")}
          </Badge>
          <p className="text-sm leading-relaxed whitespace-pre-wrap mt-2">{previewTip?.body}</p>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>מחיקת טיפ</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">האם אתה בטוח?</p>
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
          <CardTitle className="text-lg">כל הטיפים</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">טוען...</div>
          ) : tips.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">אין טיפים</div>
          ) : (
            <div className="divide-y">
              {/* Header */}
              <div className="grid grid-cols-[32px_1fr_120px_100px_120px_100px] gap-2 px-4 py-2 text-sm font-medium text-muted-foreground">
                <button onClick={toggleSelectAll}>
                  {selected.size === tips.length && tips.length > 0
                    ? <CheckSquare className="h-4 w-4" />
                    : <Square className="h-4 w-4" />}
                </button>
                <span>תוכן</span>
                <span>קטגוריה</span>
                <span>סטטוס</span>
                <span>תאריך</span>
                <span>פעולות</span>
              </div>
              {tips.map((tip) => (
                <div
                  key={tip.id}
                  className={`grid grid-cols-[32px_1fr_120px_100px_120px_100px] gap-2 px-4 py-3 items-center hover:bg-muted/30 ${selected.has(tip.id) ? "bg-muted/50" : ""}`}
                >
                  <button onClick={() => toggleSelect(tip.id)}>
                    {selected.has(tip.id)
                      ? <CheckSquare className="h-4 w-4 text-primary" />
                      : <Square className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  <p
                    className="text-sm line-clamp-2 cursor-pointer hover:text-primary"
                    onClick={() => setPreviewTip(tip)}
                  >
                    {tip.body}
                  </p>
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
                    >
                      {tip.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteId(tip.id)}>
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
