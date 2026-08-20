import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Plus, Trash2, Save, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdminGate } from "@/components/admin-gate";

interface ParamTopic {
  id: number;
  title: string;
  category: string;
  subCategory: string;
  profileConditions: string[];
  description: string;
  tags: string[];
  priority: number;
  source: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

function ParamsTopicsInner() {
  const { toast } = useToast();
  const { data, isLoading } = useQuery<ParamTopic[]>({ queryKey: ["/api/admin/params-topics"] });
  const { data: catalogSettings } = useQuery<{ exactStateSearchEnabled: boolean }>({ queryKey: ["/api/admin/catalog-settings"] });

  const toggleExactState = useMutation({
    mutationFn: async (enabled: boolean) => {
      const r = await apiRequest("PATCH", "/api/admin/catalog-settings", { exactStateSearchEnabled: enabled });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/catalog-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/catalog-settings"] });
      toast({ title: "ההגדרה נשמרה" });
    },
    onError: () => toast({ title: "שמירת ההגדרה נכשלה", variant: "destructive" }),
  });

  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Partial<ParamTopic>>({});

  const rows = data ?? [];

  const categories = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => { if (r.category) s.add(r.category); });
    return Array.from(s).sort((a, b) => a.localeCompare(b, "he"));
  }, [rows]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (category && r.category !== category) return false;
      if (!ql) return true;
      const hay = [
        r.title,
        r.category,
        r.subCategory,
        r.description,
        r.notes,
        r.source,
        ...(r.profileConditions ?? []),
        ...(r.tags ?? []),
      ].join(" ").toLowerCase();
      return hay.includes(ql);
    });
  }, [rows, q, category]);

  function openEdit(row?: ParamTopic) {
    if (row) {
      setEditId(row.id);
      setDraft({ ...row });
    } else {
      setEditId(0);
      setDraft({
        title: "",
        category: "",
        subCategory: "",
        profileConditions: [],
        description: "",
        tags: [],
        priority: 50,
        source: "",
        notes: "",
      });
    }
  }

  function closeEdit() {
    setEditId(null);
    setDraft({});
  }

  async function save() {
    const isNew = editId === 0;
    const payload = {
      title: draft.title ?? "",
      category: draft.category ?? "",
      subCategory: draft.subCategory ?? "",
      profileConditions: draft.profileConditions ?? [],
      description: draft.description ?? "",
      tags: draft.tags ?? [],
      priority: Number.isFinite(draft.priority) ? Number(draft.priority) : 50,
      source: draft.source ?? "",
      notes: draft.notes ?? "",
    };
    try {
      if (isNew) {
        await apiRequest("POST", "/api/admin/params-topics", payload);
      } else {
        await apiRequest("PATCH", `/api/admin/params-topics/${editId}`, payload);
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/params-topics"] });
      toast({ title: isNew ? "נוסף למאגר" : "נשמר" });
      closeEdit();
    } catch (err: any) {
      toast({ title: "שגיאה", description: err?.message || "נסו שוב", variant: "destructive" });
    }
  }

  async function remove(id: number) {
    if (!window.confirm("למחוק את הרשומה?")) return;
    try {
      await apiRequest("DELETE", `/api/admin/params-topics/${id}`);
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/params-topics"] });
      toast({ title: "נמחק" });
    } catch (err: any) {
      toast({ title: "שגיאה במחיקה", description: err?.message || "נסו שוב", variant: "destructive" });
    }
  }

  return (
    <div dir="rtl" className="space-y-6" data-testid="page-params-topics">
      <header className="space-y-2">
        <Badge variant="outline" className="text-xs">פנימי · לצוות בקלות</Badge>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" /> מאגר פרמטרים ונושאים
        </h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          רשימה מקיפה וניתנת להרחבה של תנאי פרופיל (משפחתי, כלכלי, בריאותי, תעסוקה, דיור ועוד) והנושאים הקשורים אליהם.
          המאגר משמש את הצוות לתכנון התאמות עתידיות ולמיפוי תכנים — לא נחשף בציבור.
        </p>
      </header>

      <Card className="p-4 border border-primary/30 bg-primary/5" data-testid="card-exact-state-toggle">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold">כפתור "חיפוש לפי מצב מדויק" באתר הציבורי</h3>
            <p className="text-xs text-muted-foreground mt-1">
              מציג כפתור בעמוד קטלוג הזכויות הציבורי שמאפשר לגולשים לבחור מצב מדויק (חיפוש לפי תנאים) מתוך מאגר הפרמטרים. הציבור רואה רק כותרת, קטגוריה וטיזר תיאור — לא הערות פנימיות.
            </p>
          </div>
          <Switch
            checked={catalogSettings?.exactStateSearchEnabled !== false}
            onCheckedChange={(v) => toggleExactState.mutate(v)}
            data-testid="switch-exact-state-search"
          />
        </div>
      </Card>

      <Card className="p-4 border border-card-border">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              data-testid="params-search"
              placeholder="חיפוש: למשל ‘אלמן’, ‘ילד נכה’, ‘דיור’..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pr-9"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">קטגוריות:</span>
            <button
              type="button"
              onClick={() => setCategory(null)}
              className={`px-2.5 py-1 rounded-md text-xs border ${category === null ? "bg-primary text-primary-foreground border-primary" : "border-border hover-elevate"}`}
            >
              הכל ({rows.length})
            </button>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c === category ? null : c)}
                className={`px-2.5 py-1 rounded-md text-xs border ${category === c ? "bg-primary text-primary-foreground border-primary" : "border-border hover-elevate"}`}
              >
                {c}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => openEdit()} data-testid="params-add-new">
            <Plus className="w-4 h-4 ml-1" /> הוספת רשומה
          </Button>
        </div>
      </Card>

      {editId !== null && (
        <Card className="p-5 border border-primary/40 bg-primary/5 space-y-3" data-testid="params-editor">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-semibold">{editId === 0 ? "רשומה חדשה" : `עריכה #${editId}`}</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={closeEdit}>ביטול</Button>
              <Button size="sm" onClick={save} data-testid="params-save">
                <Save className="w-4 h-4 ml-1" /> שמירה
              </Button>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">כותרת</Label>
              <Input value={String(draft.title ?? "")} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">קטגוריה</Label>
              <Input value={String(draft.category ?? "")} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="למשל: בריאות, דיור" />
            </div>
            <div>
              <Label className="text-xs">תת-קטגוריה</Label>
              <Input value={String(draft.subCategory ?? "")} onChange={(e) => setDraft({ ...draft, subCategory: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">עדיפות (0-100)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={Number.isFinite(draft.priority) ? Number(draft.priority) : 50}
                onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })}
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">תנאי פרופיל (פסיק מפריד)</Label>
              <Input
                value={(draft.profileConditions ?? []).join(", ")}
                onChange={(e) => setDraft({ ...draft, profileConditions: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                placeholder="למשל: single_parent, low_income, child_disability"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">תיאור הזכות / הסיוע</Label>
              <Textarea
                value={String(draft.description ?? "")}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                className="min-h-[90px]"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">תגים (פסיק מפריד)</Label>
              <Input
                value={(draft.tags ?? []).join(", ")}
                onChange={(e) => setDraft({ ...draft, tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              />
            </div>
            <div>
              <Label className="text-xs">מקור / גוף מטפל</Label>
              <Input value={String(draft.source ?? "")} onChange={(e) => setDraft({ ...draft, source: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">הערות פנימיות</Label>
              <Input value={String(draft.notes ?? "")} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            </div>
          </div>
        </Card>
      )}

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">טוען...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">לא נמצאו רשומות.</p>
        ) : (
          filtered.map((r) => (
            <Card key={r.id} className="p-4 border border-card-border space-y-2 flex flex-col" data-testid={`param-topic-${r.id}`}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm">{r.title}</h3>
                <Badge variant="outline" className="text-[10px]">עדיפות {r.priority}</Badge>
              </div>
              <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                {r.category && <span className="rounded-full bg-muted px-2 py-0.5">{r.category}</span>}
                {r.subCategory && <span className="rounded-full bg-muted px-2 py-0.5">{r.subCategory}</span>}
              </div>
              {r.description && (
                <p className="text-xs text-foreground/80 leading-relaxed line-clamp-3">{r.description}</p>
              )}
              {r.profileConditions && r.profileConditions.length > 0 && (
                <div className="flex flex-wrap gap-1 text-[10px]">
                  {r.profileConditions.map((c, idx) => (
                    <span key={idx} className="rounded bg-primary/10 text-primary px-1.5 py-0.5">{c}</span>
                  ))}
                </div>
              )}
              {r.tags && r.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                  {r.tags.map((t, idx) => (
                    <span key={idx} className="rounded border border-border px-1.5 py-0.5">#{t}</span>
                  ))}
                </div>
              )}
              {r.source && (
                <div className="text-[11px] text-muted-foreground">מקור: {r.source}</div>
              )}
              <div className="flex justify-end gap-1 mt-auto">
                <Button variant="outline" size="sm" onClick={() => openEdit(r)}>עריכה</Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(r.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
      <p className="text-[11px] text-muted-foreground text-center">
        סה״כ {filtered.length} מתוך {rows.length} רשומות. ניתן להרחיב את המאגר ללא הגבלה — מבנה ה־DB מתאים לאלפי רשומות.
      </p>
    </div>
  );
}

export default function ParamsTopicsPage() {
  return (
    <AdminGate>
      <ParamsTopicsInner />
    </AdminGate>
  );
}
