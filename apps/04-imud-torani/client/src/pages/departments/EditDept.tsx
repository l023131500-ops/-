import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ContentBlock, LayerKind, BlockMeta } from "@shared/schema";
import { Plus, Trash2, Lock, Unlock, Settings2, SplitSquareVertical } from "lucide-react";

export const LAYER_LABELS: Record<LayerKind, string> = {
  main: "טקסט מרכזי",
  rashi: 'רש"י (פנימי)',
  tosafot: "תוספות (חיצוני)",
  commentaryA: "פרשן א׳",
  commentaryB: "פרשן ב׳",
  footnote: "הערת שוליים",
  sidenote: 'מ"מ / הערת צד',
  heading: "כותרת",
  subheading: "כותרת משנה",
  openingWord: "מילת פתיחה",
  question: "שאלה",
  answer: "תשובה",
  source: "מקור / ציטוט",
  poem: "בית שיר / פיוט",
};

/**
 * מחלקת עריכה — עריכת בלוקי התוכן, כותרות מותאמות, חלוקה לפרקים ומעברים.
 * כל בלוק ניתן לנעילה (הגנה על טקסט קדוש) ולהגדרות מתקדמות.
 */
export function EditDept({
  blocks, layers, onChange, uid, focusBlockId,
}: {
  blocks: ContentBlock[];
  layers: LayerKind[];
  onChange: (fn: (b: ContentBlock[]) => ContentBlock[]) => void;
  uid: () => string;
  focusBlockId: string | null;
}) {
  const [openMeta, setOpenMeta] = useState<string | null>(null);

  function add(layer: LayerKind) {
    onChange((prev) => [...prev, { id: uid(), layer, text: "" }]);
  }
  function update(id: string, text: string) {
    onChange((prev) => prev.map((b) => (b.id === id ? { ...b, text } : b)));
  }
  function setMeta(id: string, patch: Partial<BlockMeta>) {
    onChange((prev) => prev.map((b) => (b.id === id ? { ...b, meta: { ...b.meta, ...patch } } : b)));
  }
  function remove(id: string) {
    onChange((prev) => prev.filter((b) => b.id !== id));
  }
  function move(id: string, dir: -1 | 1) {
    onChange((prev) => {
      const i = prev.findIndex((b) => b.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  const isHeading = (l: LayerKind) => l === "heading" || l === "subheading";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {layers.map((l) => (
          <button
            key={l}
            onClick={() => add(l)}
            className="flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover-elevate"
            data-testid={`button-add-${l}`}
          >
            <Plus className="h-3.5 w-3.5" /> {LAYER_LABELS[l]}
          </button>
        ))}
      </div>

      {blocks.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          הוסף בלוק תוכן מהכפתורים למעלה כדי להתחיל.
        </p>
      )}

      {blocks.map((b, i) => {
        const focused = b.id === focusBlockId;
        const locked = b.meta?.locked;
        return (
          <div
            key={b.id}
            id={`edit-block-${b.id}`}
            className={`rounded-lg border bg-card p-2.5 transition-colors ${focused ? "border-primary ring-2 ring-primary/40" : "border-card-border"}`}
            data-testid={`block-${i}`}
          >
            <div className="mb-1.5 flex items-center justify-between">
              <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                {LAYER_LABELS[b.layer]}
                {(b.meta?.pageBreakBefore || b.meta?.columnBreakBefore) && (
                  <SplitSquareVertical className="ms-1 inline h-3 w-3" />
                )}
              </span>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => setMeta(b.id, { locked: !locked })}
                  className="rounded p-1 text-muted-foreground hover-elevate"
                  title={locked ? "בטל נעילה" : "נעל בלוק (הגנה מפני שינוי)"}
                  data-testid={`button-lock-${i}`}
                >
                  {locked ? <Lock className="h-3.5 w-3.5 text-primary" /> : <Unlock className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => setOpenMeta(openMeta === b.id ? null : b.id)}
                  className="rounded p-1 text-muted-foreground hover-elevate" title="הגדרות בלוק" data-testid={`button-meta-${i}`}>
                  <Settings2 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => move(b.id, -1)} className="rounded p-1 text-muted-foreground hover-elevate" data-testid={`button-up-${i}`} aria-label="הזזה למעלה">▲</button>
                <button onClick={() => move(b.id, 1)} className="rounded p-1 text-muted-foreground hover-elevate" data-testid={`button-down-${i}`} aria-label="הזזה למטה">▼</button>
                <button onClick={() => remove(b.id)} className="rounded p-1 hover-elevate" data-testid={`button-remove-${i}`} aria-label="מחיקת בלוק">
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </button>
              </div>
            </div>

            <Textarea
              value={b.text}
              onChange={(e) => update(b.id, e.target.value)}
              placeholder={isHeading(b.layer) ? "כותרת…" : "הזן / הדבק טקסט…"}
              rows={isHeading(b.layer) ? 1 : 4}
              dir="rtl"
              disabled={locked}
              className={`resize-y font-serif text-[15px] leading-relaxed ${locked ? "opacity-60" : ""}`}
              data-testid={`textarea-${i}`}
            />
            {locked && (
              <p className="mt-1 text-[11px] text-primary">בלוק נעול — בטל נעילה כדי לערוך. (הגנה על טקסט קדוש)</p>
            )}

            {/* הגדרות בלוק מתקדמות */}
            {openMeta === b.id && (
              <div className="mt-2 space-y-2 rounded-md border border-border bg-background p-2.5">
                {isHeading(b.layer) && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="mb-1 block text-[11px] font-semibold">רמת כותרת</Label>
                        <Select value={String(b.meta?.level ?? (b.layer === "heading" ? 1 : 2))}
                          onValueChange={(v) => setMeta(b.id, { level: Number(v) })}>
                          <SelectTrigger data-testid={`select-level-${i}`}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 — פרק</SelectItem>
                            <SelectItem value="2">2 — סימן</SelectItem>
                            <SelectItem value="3">3 — סעיף</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="mb-1 block text-[11px] font-semibold">יישור</Label>
                        <Select value={b.meta?.headingAlign ?? "center"}
                          onValueChange={(v) => setMeta(b.id, { headingAlign: v as any })}>
                          <SelectTrigger data-testid={`select-halign-${i}`}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="center">ממורכז</SelectItem>
                            <SelectItem value="right">ימין</SelectItem>
                            <SelectItem value="left">שמאל</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="mb-1 block text-[11px] font-semibold">גודל כותרת (em) — ריק = ברירת מחדל</Label>
                      <Input type="number" inputMode="decimal" step="0.05" min="0.8" max="3"
                        value={b.meta?.headingSize ?? ""}
                        onChange={(e) => setMeta(b.id, { headingSize: e.target.value ? Number(e.target.value) : undefined })}
                        dir="ltr" data-testid={`input-hsize-${i}`} />
                    </div>
                    <div className="flex items-center justify-between rounded border border-border px-2 py-1.5">
                      <Label className="text-xs">מודגש</Label>
                      <Switch checked={b.meta?.headingBold !== false}
                        onCheckedChange={(v) => setMeta(b.id, { headingBold: v })} data-testid={`switch-hbold-${i}`} />
                    </div>
                  </>
                )}
                {/* מעברים — לכל בלוק */}
                <div className="flex items-center justify-between rounded border border-border px-2 py-1.5">
                  <Label className="text-xs">מעבר עמוד לפני בלוק זה</Label>
                  <Switch checked={!!b.meta?.pageBreakBefore}
                    onCheckedChange={(v) => setMeta(b.id, { pageBreakBefore: v })} data-testid={`switch-pagebreak-${i}`} />
                </div>
                <div className="flex items-center justify-between rounded border border-border px-2 py-1.5">
                  <Label className="text-xs">מעבר טור/מקטע לפני בלוק זה</Label>
                  <Switch checked={!!b.meta?.columnBreakBefore}
                    onCheckedChange={(v) => setMeta(b.id, { columnBreakBefore: v })} data-testid={`switch-colbreak-${i}`} />
                </div>
                <div className="flex items-center justify-between rounded border border-border px-2 py-1.5">
                  <Label className="text-xs">הישאר עם הבא (אל תפריד כותרת מגופה)</Label>
                  <Switch checked={!!b.meta?.keepWithNext}
                    onCheckedChange={(v) => setMeta(b.id, { keepWithNext: v })} data-testid={`switch-keepnext-${i}`} />
                </div>
                {/* סימן/מספר להלכה/סימן/הערה */}
                {(b.layer === "footnote" || b.layer === "heading" || b.layer === "subheading" || b.layer === "question") && (
                  <div>
                    <Label className="mb-1 block text-[11px] font-semibold">סימן/מספר (אופציונלי)</Label>
                    <Input value={b.meta?.marker ?? ""} onChange={(e) => setMeta(b.id, { marker: e.target.value })}
                      placeholder="למשל: א׳ / סימן ג׳" data-testid={`input-marker-${i}`} />
                  </div>
                )}
                {/* מראה-מקום */}
                {(b.layer === "source" || b.layer === "main") && (
                  <div>
                    <Label className="mb-1 block text-[11px] font-semibold">מראה-מקום (אופציונלי)</Label>
                    <Input value={b.meta?.ref ?? ""} onChange={(e) => setMeta(b.id, { ref: e.target.value })}
                      placeholder="למשל: שבת דף ל״א ע״א" data-testid={`input-ref-${i}`} />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
