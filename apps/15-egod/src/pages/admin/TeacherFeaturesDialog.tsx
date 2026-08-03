import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
const sb = supabase as any;
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

export const FEATURE_KEYS: { key: string; label: string; group: string }[] = [
  { key: "lessons", label: "ניהול שיעורים", group: "תוכן" },
  { key: "schedule", label: "הספק לימודי יומי", group: "תוכן" },
  { key: "study_daily", label: "תיעוד הספק יומי", group: "תוכן" },
  { key: "participants", label: "ניהול משתתפים", group: "קהילה" },
  { key: "attendance", label: "מעקב נוכחות", group: "קהילה" },
  { key: "prayer_times", label: "זמני תפילה", group: "תוכן" },
  { key: "materials_upload", label: "העלאת חומרי עזר", group: "תוכן" },
  { key: "public_profile", label: "אתר תדמית ציבורי", group: "פרסום" },
  { key: "donations", label: "כפתור תרומה", group: "פרסום" },
  { key: "messages_inbox", label: "תיבת פניות", group: "תקשורת" },
  { key: "forums_view", label: "צפייה בפורומים", group: "פורומים" },
  { key: "forums_post", label: "פרסום בפורומים", group: "פורומים" },
  { key: "custom_sections", label: "מקטעים מותאמים אישית", group: "פרסום" },
];

interface Props {
  teacher: any;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const TeacherFeaturesDialog = ({ teacher, open, onOpenChange }: Props) => {
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [forumAccess, setForumAccess] = useState<Record<string, { can_view: boolean; can_post: boolean; can_comment: boolean }>>({});
  const [categories, setCategories] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [{ data: f }, { data: a }, { data: cats }] = await Promise.all([
        sb.from("teacher_features").select("*").eq("teacher_id", teacher.id),
        sb.from("teacher_forum_access").select("*").eq("teacher_id", teacher.id),
        supabase.from("forum_categories").select("*").order("sort_order"),
      ]);
      const fmap: Record<string, boolean> = {};
      FEATURE_KEYS.forEach((k) => { fmap[k.key] = true; });
      (f || []).forEach((row: any) => { fmap[row.feature_key] = row.enabled; });
      setFeatures(fmap);
      const amap: Record<string, any> = {};
      (cats || []).forEach((c: any) => { amap[c.id] = { can_view: true, can_post: true, can_comment: true }; });
      (a || []).forEach((row: any) => { amap[row.category_id] = { can_view: row.can_view, can_post: row.can_post, can_comment: row.can_comment }; });
      setForumAccess(amap);
      setCategories(cats || []);
    })();
  }, [open, teacher.id]);

  const save = async () => {
    setSaving(true);
    try {
      const featRows = FEATURE_KEYS.map((k) => ({ teacher_id: teacher.id, feature_key: k.key, enabled: features[k.key] !== false }));
      const { error: e1 } = await sb.from("teacher_features").upsert(featRows, { onConflict: "teacher_id,feature_key" });
      if (e1) throw e1;
      const accessRows = categories.map((c) => ({
        teacher_id: teacher.id,
        category_id: c.id,
        can_view: forumAccess[c.id]?.can_view !== false,
        can_post: forumAccess[c.id]?.can_post !== false,
        can_comment: forumAccess[c.id]?.can_comment !== false,
      }));
      if (accessRows.length) {
        const { error: e2 } = await sb.from("teacher_forum_access").upsert(accessRows, { onConflict: "teacher_id,category_id" });
        if (e2) throw e2;
      }
      toast.success("ההרשאות נשמרו");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const grouped = FEATURE_KEYS.reduce((acc: Record<string, typeof FEATURE_KEYS>, f) => {
    (acc[f.group] = acc[f.group] || []).push(f); return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-gradient-to-br from-card via-card to-secondary/5 border-2 border-secondary/30" dir="rtl">
        <DialogHeader className="border-b border-secondary/20 pb-3">
          <DialogTitle className="font-heading text-2xl flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-secondary" />
            הרשאות ופונקציות – {teacher.full_name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">בחר אילו פיצ'רים ופורומים פעילים עבור {teacher.full_name}</p>
        </DialogHeader>

        <div className="space-y-5 mt-3">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <h3 className="font-heading font-bold text-foreground mb-2 flex items-center gap-2">
                <span className="w-1 h-5 bg-secondary rounded-full" />{group}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-muted/30 rounded-xl p-3">
                {items.map((it) => (
                  <label key={it.key} className="flex items-center justify-between gap-2 p-2 bg-card rounded-lg border border-border cursor-pointer hover:border-secondary/40">
                    <span className="text-sm text-foreground">{it.label}</span>
                    <Switch checked={features[it.key] !== false} onCheckedChange={(v) => setFeatures((f) => ({ ...f, [it.key]: v }))} />
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div>
            <h3 className="font-heading font-bold text-foreground mb-2 flex items-center gap-2">
              <span className="w-1 h-5 bg-secondary rounded-full" />הרשאות פורומים
            </h3>
            <div className="bg-muted/30 rounded-xl p-3 space-y-2 max-h-64 overflow-y-auto">
              {categories.map((c) => {
                const a = forumAccess[c.id] || { can_view: true, can_post: true, can_comment: true };
                const set = (k: keyof typeof a, v: boolean) => setForumAccess((p) => ({ ...p, [c.id]: { ...a, [k]: v } }));
                return (
                  <div key={c.id} className="bg-card rounded-lg border border-border p-3">
                    <p className="font-medium text-sm mb-2">{c.name} {c.is_restricted && <Badge variant="outline" className="mr-1 text-xs">מוגבל</Badge>}</p>
                    <div className="flex gap-4 text-xs">
                      <label className="flex items-center gap-1"><Switch checked={a.can_view} onCheckedChange={(v) => set("can_view", v)} />צפייה</label>
                      <label className="flex items-center gap-1"><Switch checked={a.can_post} onCheckedChange={(v) => set("can_post", v)} />פרסום פוסטים</label>
                      <label className="flex items-center gap-1"><Switch checked={a.can_comment} onCheckedChange={(v) => set("can_comment", v)} />תגובות</label>
                    </div>
                  </div>
                );
              })}
              {categories.length === 0 && <p className="text-xs text-muted-foreground p-2">אין פורומים מוגדרים. צור פורומים בעמוד "ניהול פורומים".</p>}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 pt-3 border-t border-secondary/20">
          <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          <Button onClick={save} disabled={saving} className="bg-gradient-to-l from-secondary to-gold-dark text-secondary-foreground">
            {saving ? "שומר..." : "שמור הרשאות"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TeacherFeaturesDialog;