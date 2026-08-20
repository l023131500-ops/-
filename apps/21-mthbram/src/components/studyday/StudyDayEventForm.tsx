import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, CalendarIcon, Upload, CalendarDays, CalendarRange } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { dayOptions, hourOptions, subjectOptions } from "@/types/questionnaire";
import { cn } from "@/lib/utils";
import type { ScheduleBlock, Lesson } from "@/lib/studyDayLessons";
import { normalizeToBlocks } from "@/lib/studyDayLessons";

const audienceOptions = ["גברים", "נשים", "מעורב", "אברכים", "בחורים", "בעלי בתים", "ילדים", "נוער"];

interface ExistingEvent {
  id: string;
  synagogue_name: string;
  city: string;
  lessons: any;
  schedule_type?: string | null;
  event_date?: string | null;
  schedule_days?: any;
}

interface Props {
  sessionId: string;
  onAdded: () => void;
  existingEvents?: ExistingEvent[];
}

const newId = () => `b-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const emptyLesson = (): Lesson => ({ rabbi_name: "", subject: "", time: "" });
const newDateBlock = (): ScheduleBlock => ({ id: newId(), kind: "date", date: null, items: [emptyLesson()] });
const newDaysBlock = (): ScheduleBlock => ({ id: newId(), kind: "days", days: [], items: [emptyLesson()] });

export default function StudyDayEventForm({ sessionId, onAdded, existingEvents = [] }: Props) {
  const [mode, setMode] = useState<"new" | "quick">("new");
  const [quickEventId, setQuickEventId] = useState<string>("");
  const [quickBlocks, setQuickBlocks] = useState<ScheduleBlock[]>([newDateBlock()]);
  const [quickSubmitting, setQuickSubmitting] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [audience, setAudience] = useState<string[]>([]);
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([newDateBlock()]);

  const [form, setForm] = useState({
    synagogue_name: "",
    logo_url: "",
    donation_link: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    city: "",
    street: "",
    street_number: "",
    notes: "",
  });

  const set = <K extends keyof typeof form>(k: K, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const toggleAudience = (a: string) =>
    setAudience((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]));

  // ---- Block helpers (work for both `blocks` & `quickBlocks`) ----
  const updateBlocks = (target: "main" | "quick", updater: (p: ScheduleBlock[]) => ScheduleBlock[]) => {
    if (target === "main") setBlocks(updater);
    else setQuickBlocks(updater);
  };

  const addBlock = (target: "main" | "quick", kind: "date" | "days") =>
    updateBlocks(target, (p) => [...p, kind === "date" ? newDateBlock() : newDaysBlock()]);

  const removeBlock = (target: "main" | "quick", id: string) =>
    updateBlocks(target, (p) => (p.length === 1 ? p : p.filter((b) => b.id !== id)));

  const patchBlock = (target: "main" | "quick", id: string, patch: Partial<ScheduleBlock>) =>
    updateBlocks(target, (p) => p.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  const toggleBlockDay = (target: "main" | "quick", id: string, day: string) =>
    updateBlocks(target, (p) => p.map((b) => {
      if (b.id !== id) return b;
      const days = b.days ?? [];
      return { ...b, days: days.includes(day) ? days.filter((d) => d !== day) : [...days, day] };
    }));

  const addLesson = (target: "main" | "quick", blockId: string) =>
    updateBlocks(target, (p) => p.map((b) =>
      b.id === blockId ? { ...b, items: [...b.items, emptyLesson()] } : b,
    ));

  const removeLesson = (target: "main" | "quick", blockId: string, idx: number) =>
    updateBlocks(target, (p) => p.map((b) => {
      if (b.id !== blockId) return b;
      if (b.items.length === 1) return b;
      return { ...b, items: b.items.filter((_, i) => i !== idx) };
    }));

  const updateLesson = (target: "main" | "quick", blockId: string, idx: number, k: keyof Lesson, v: string) =>
    updateBlocks(target, (p) => p.map((b) => {
      if (b.id !== blockId) return b;
      return { ...b, items: b.items.map((l, i) => (i === idx ? { ...l, [k]: v } : l)) };
    }));

  const handleLogoUpload = async (file: File) => {
    setLogoUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `study-day/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("lesson-logos").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("lesson-logos").getPublicUrl(path);
      set("logo_url", data.publicUrl);
      toast.success("הלוגו הועלה");
    } catch (e) {
      console.error(e);
      toast.error("שגיאה בהעלאת לוגו");
    } finally {
      setLogoUploading(false);
    }
  };

  const reset = () => {
    setForm({
      synagogue_name: "", logo_url: "", donation_link: "", contact_name: "",
      contact_phone: "", contact_email: "", city: "", street: "", street_number: "", notes: "",
    });
    setAudience([]);
    setBlocks([newDateBlock()]);
  };

  // ---- Sanitize: keep only blocks that have at least one valid lesson ----
  const cleanBlocks = (raw: ScheduleBlock[]): ScheduleBlock[] =>
    raw
      .map((b) => ({
        ...b,
        items: b.items.filter((l) => l.rabbi_name.trim() && l.subject.trim()).map((l) => ({
          rabbi_name: l.rabbi_name.trim(),
          subject: l.subject.trim(),
          time: l.time?.trim() || "",
        })),
      }))
      .filter((b) => b.items.length > 0 && (
        (b.kind === "date" && b.date) ||
        (b.kind === "days" && (b.days ?? []).length > 0)
      ));

  const handleAdd = async () => {
    const errors: string[] = [];
    if (!form.synagogue_name.trim()) errors.push("שם בית הכנסת");
    if (!form.city.trim()) errors.push("עיר");

    const cleaned = cleanBlocks(blocks);
    if (cleaned.length === 0) errors.push("מועד אחד לפחות עם שיעור (שם רב + נושא)");

    // Verify each user-added block has either a date or selected days
    blocks.forEach((b, i) => {
      if (b.kind === "date" && !b.date) errors.push(`תאריך במועד #${i + 1}`);
      if (b.kind === "days" && (!b.days || b.days.length === 0)) errors.push(`ימים במועד #${i + 1}`);
    });

    if (errors.length) {
      toast.error("חסר: " + Array.from(new Set(errors)).join(", "));
      return;
    }

    // Mirror first block into top-level columns (backward compatibility)
    const first = cleaned[0];
    const top_schedule_type = first.kind === "date" ? "specific_date" : "weekly_days";
    const top_event_date = first.kind === "date" ? first.date : null;
    const top_schedule_days = first.kind === "days" ? (first.days ?? []) : [];

    setSubmitting(true);
    try {
      const { error } = await supabase.from("study_day_events").insert([{
        session_id: sessionId,
        synagogue_name: form.synagogue_name.trim(),
        logo_url: form.logo_url,
        donation_link: form.donation_link,
        contact_name: form.contact_name,
        contact_phone: form.contact_phone,
        contact_email: form.contact_email,
        city: form.city.trim(),
        street: form.street,
        street_number: form.street_number,
        schedule_type: top_schedule_type,
        event_date: top_event_date,
        schedule_days: top_schedule_days,
        target_audience: audience,
        lessons: { blocks: cleaned } as any,
        notes: form.notes,
        is_sent: false,
        is_approved: false,
        status: "draft",
      }]);
      if (error) throw error;
      toast.success("יום העיון נוסף לרשימה");
      reset();
      onAdded();
    } catch (e) {
      console.error(e);
      toast.error("שגיאה בהוספה");
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickAdd = async () => {
    if (!quickEventId) { toast.error("בחר בית כנסת"); return; }
    const cleaned = cleanBlocks(quickBlocks);
    if (cleaned.length === 0) {
      toast.error("יש למלא לפחות מועד אחד עם שיעור (שם רב + נושא)");
      return;
    }

    setQuickSubmitting(true);
    try {
      const target = existingEvents.find((e) => e.id === quickEventId);
      if (!target) throw new Error("not found");

      const existingBlocks = normalizeToBlocks(target.lessons, {
        schedule_type: target.schedule_type,
        event_date: target.event_date,
        schedule_days: target.schedule_days,
      });

      const merged = [...existingBlocks, ...cleaned];

      const { error } = await supabase
        .from("study_day_events")
        .update({ lessons: { blocks: merged } as any })
        .eq("id", quickEventId);
      if (error) throw error;
      toast.success("המועדים נוספו לבית הכנסת");
      setQuickBlocks([newDateBlock()]);
      onAdded();
    } catch (e) {
      console.error(e);
      toast.error("שגיאה בהוספה");
    } finally {
      setQuickSubmitting(false);
    }
  };

  // ---- A reusable schedule-block editor used by both modes ----
  const renderBlock = (target: "main" | "quick", b: ScheduleBlock, idx: number, count: number) => (
    <div
      key={b.id}
      className="bg-white border border-foreground/10 rounded-xl p-4 space-y-3 relative"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[hsl(180_45%_30%)] text-white text-xs font-bold">
            {idx + 1}
          </span>
          <span className="text-sm font-bold text-[hsl(180_45%_25%)]">
            מועד #{idx + 1}
          </span>
        </div>
        {count > 1 && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => removeBlock(target, b.id)}
            title="הסר מועד"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Kind toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => patchBlock(target, b.id, { kind: "date", days: [] })}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all",
            b.kind === "date"
              ? "bg-[hsl(180_45%_30%)] text-white border-[hsl(180_45%_30%)]"
              : "bg-white border-foreground/15 hover:border-[hsl(180_45%_30%)]/40",
          )}
        >
          <CalendarIcon className="w-4 h-4" />
          תאריך מסוים
        </button>
        <button
          type="button"
          onClick={() => patchBlock(target, b.id, { kind: "days", date: null })}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all",
            b.kind === "days"
              ? "bg-[hsl(180_45%_30%)] text-white border-[hsl(180_45%_30%)]"
              : "bg-white border-foreground/15 hover:border-[hsl(180_45%_30%)]/40",
          )}
        >
          <CalendarRange className="w-4 h-4" />
          ימים בשבוע
        </button>
      </div>

      {/* Date or days picker */}
      {b.kind === "date" ? (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">תאריך</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full h-10 justify-start text-right font-normal border-foreground/15 bg-background",
                  !b.date && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="ml-2 h-4 w-4" />
                {b.date ? format(new Date(b.date), "dd/MM/yyyy") : "בחר תאריך"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-popover z-50" align="start">
              <Calendar
                mode="single"
                selected={b.date ? new Date(b.date) : undefined}
                onSelect={(d) => patchBlock(target, b.id, { date: d ? format(d, "yyyy-MM-dd") : null })}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">ימים בשבוע</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {dayOptions.map((d) => (
              <label
                key={d}
                className="flex items-center gap-2 bg-white border border-foreground/10 rounded-lg p-2 cursor-pointer hover:border-[hsl(180_45%_30%)]/40 text-sm"
              >
                <Checkbox
                  checked={(b.days ?? []).includes(d)}
                  onCheckedChange={() => toggleBlockDay(target, b.id, d)}
                />
                <span>{d}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Lessons for this block */}
      <div className="bg-[hsl(180_30%_96%)] rounded-lg p-3 border border-teal-700/10 space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold text-[hsl(180_45%_25%)]">שיעורים במועד זה</Label>
          <Button
            type="button"
            onClick={() => addLesson(target, b.id)}
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 border-[hsl(180_45%_30%)]/40 text-[hsl(180_45%_30%)] hover:bg-[hsl(180_45%_30%)]/10"
          >
            <Plus className="w-3 h-3" /> הוסף שיעור
          </Button>
        </div>
        {b.items.map((l, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end bg-white p-2.5 rounded border border-foreground/10">
            <div className="md:col-span-4 space-y-1">
              <Label className="text-[10px] text-muted-foreground">שם הרב</Label>
              <Input
                value={l.rabbi_name}
                onChange={(e) => updateLesson(target, b.id, i, "rabbi_name", e.target.value)}
                className="h-9 border-foreground/15"
              />
            </div>
            <div className="md:col-span-5 space-y-1">
              <Label className="text-[10px] text-muted-foreground">נושא השיעור</Label>
              {(() => {
                const isPreset = subjectOptions.includes(l.subject);
                const showOther = !isPreset && l.subject !== "";
                const selectValue = showOther ? "__other__" : (l.subject || "");
                return (
                  <div className="space-y-1.5">
                    <Select
                      value={selectValue}
                      onValueChange={(v) => updateLesson(target, b.id, i, "subject", v === "__other__" ? " " : v)}
                    >
                      <SelectTrigger className="h-9 border-foreground/15 bg-background" aria-label="נושא השיעור">
                        <SelectValue placeholder="בחר נושא" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50 max-h-60">
                        {subjectOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        <SelectItem value="__other__">אחר (טקסט חופשי)</SelectItem>
                      </SelectContent>
                    </Select>
                    {(showOther || selectValue === "__other__") && (
                      <Input
                        autoFocus
                        value={l.subject.trim() === "" ? "" : l.subject}
                        onChange={(e) => updateLesson(target, b.id, i, "subject", e.target.value)}
                        placeholder="פרט נושא..."
                        className="h-9 border-foreground/15"
                      />
                    )}
                  </div>
                );
              })()}
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label className="text-[10px] text-muted-foreground">שעה</Label>
              <Select value={l.time || ""} onValueChange={(v) => updateLesson(target, b.id, i, "time", v)}>
                <SelectTrigger className="h-9 border-foreground/15 bg-background" aria-label="שעה"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent className="bg-background z-50 max-h-60">
                  {hourOptions.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1 flex justify-end">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-destructive hover:text-destructive"
                onClick={() => removeLesson(target, b.id, i)}
                disabled={b.items.length === 1}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-white border border-teal-700/15 rounded-2xl p-6 md:p-8 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h3 className="font-display text-2xl text-[hsl(180_45%_30%)]">
          {mode === "new" ? "הוספת בית כנסת חדש" : "הוסף שיעורים לבית כנסת קיים"}
        </h3>
        <div className="inline-flex bg-[hsl(180_30%_96%)] border border-teal-700/15 rounded-xl p-1 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setMode("new")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
              mode === "new" ? "bg-white shadow-sm text-[hsl(180_45%_25%)]" : "text-muted-foreground hover:text-foreground",
            )}
          >
            בית כנסת חדש
          </button>
          <button
            type="button"
            onClick={() => setMode("quick")}
            disabled={existingEvents.length === 0}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed",
              mode === "quick" ? "bg-white shadow-sm text-[hsl(180_45%_25%)]" : "text-muted-foreground hover:text-foreground",
            )}
          >
            הוסף שיעורים לקיים
          </button>
        </div>
      </div>

      {mode === "quick" ? (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm">בחר בית כנסת <span className="text-destructive">*</span></Label>
            <Select value={quickEventId} onValueChange={setQuickEventId}>
              <SelectTrigger className="h-11 border-foreground/15 bg-background" aria-label="בחר בית כנסת">
                <SelectValue placeholder="— בחר —" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {existingEvents.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.synagogue_name} — {e.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {quickBlocks.map((b, i) => renderBlock("quick", b, i, quickBlocks.length))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => addBlock("quick", "date")} size="sm" variant="outline" className="gap-2 border-[hsl(180_45%_30%)]/40 text-[hsl(180_45%_30%)]">
              <CalendarIcon className="w-4 h-4" /> הוסף תאריך נוסף
            </Button>
            <Button type="button" onClick={() => addBlock("quick", "days")} size="sm" variant="outline" className="gap-2 border-[hsl(180_45%_30%)]/40 text-[hsl(180_45%_30%)]">
              <CalendarDays className="w-4 h-4" /> הוסף ימים קבועים
            </Button>
          </div>

          <Button
            onClick={handleQuickAdd}
            disabled={quickSubmitting}
            size="lg"
            className="bg-[hsl(180_45%_30%)] hover:bg-[hsl(180_45%_25%)] text-white gap-2 px-8"
          >
            <Plus className="w-5 h-5" />
            הוסף לבית הכנסת
          </Button>
        </div>
      ) : (
        <>
          {/* Synagogue & contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">שם בית הכנסת <span className="text-destructive">*</span></Label>
              <Input value={form.synagogue_name} onChange={(e) => set("synagogue_name", e.target.value)} className="h-10 border-foreground/15" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">עיר <span className="text-destructive">*</span></Label>
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} className="h-10 border-foreground/15" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">רחוב</Label>
              <Input value={form.street} onChange={(e) => set("street", e.target.value)} className="h-10 border-foreground/15" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">מספר</Label>
              <Input value={form.street_number} onChange={(e) => set("street_number", e.target.value)} className="h-10 border-foreground/15" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">קישור לתרומה</Label>
              <Input dir="ltr" value={form.donation_link} onChange={(e) => set("donation_link", e.target.value)} className="h-10 border-foreground/15" placeholder="https://..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">לוגו (אופציונלי)</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }}
                  className="hidden"
                  id="logo-upload"
                />
                <label htmlFor="logo-upload" className="flex-1">
                  <div className="h-10 px-3 flex items-center gap-2 border border-foreground/15 rounded-md cursor-pointer hover:bg-muted/50 text-sm">
                    <Upload className="w-4 h-4" />
                    {logoUploading ? "מעלה..." : form.logo_url ? "הוחלף ✓" : "בחר תמונה"}
                  </div>
                </label>
                {form.logo_url && (
                  <img src={form.logo_url} alt={form.synagogue_name ? `לוגו ${form.synagogue_name}` : "לוגו"} className="h-10 w-10 rounded object-cover border border-foreground/15" />
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">שם איש קשר</Label>
              <Input value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} className="h-10 border-foreground/15" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">טלפון</Label>
              <Input dir="ltr" value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} className="h-10 border-foreground/15" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">אימייל</Label>
              <Input dir="ltr" value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} className="h-10 border-foreground/15" />
            </div>
          </div>

          {/* Audience chips */}
          <div className="mt-5 space-y-2">
            <Label className="text-sm">קהל יעד</Label>
            <div className="flex flex-wrap gap-2">
              {audienceOptions.map((a) => {
                const sel = audience.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleAudience(a)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-full text-sm border transition-all",
                      sel
                        ? "bg-[hsl(180_45%_30%)] border-[hsl(180_45%_30%)] text-white"
                        : "bg-white border-foreground/15 hover:border-[hsl(180_45%_30%)]/40",
                    )}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Schedule blocks */}
          <div className="mt-6 p-5 bg-[hsl(180_30%_96%)] rounded-xl border border-teal-700/15">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-sm font-medium">
                מועדים ושיעורים <span className="text-destructive">*</span>
              </Label>
              <span className="text-xs text-muted-foreground">
                כל מועד עם שיעורים נפרדים שלו
              </span>
            </div>
            <div className="space-y-3">
              {blocks.map((b, i) => renderBlock("main", b, i, blocks.length))}
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button type="button" onClick={() => addBlock("main", "date")} size="sm" variant="outline" className="gap-2 border-[hsl(180_45%_30%)]/40 text-[hsl(180_45%_30%)]">
                <CalendarIcon className="w-4 h-4" /> הוסף תאריך נוסף
              </Button>
              <Button type="button" onClick={() => addBlock("main", "days")} size="sm" variant="outline" className="gap-2 border-[hsl(180_45%_30%)]/40 text-[hsl(180_45%_30%)]">
                <CalendarDays className="w-4 h-4" /> הוסף ימים קבועים
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            <Label className="text-sm">הערות</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              className="border-foreground/15 resize-none"
              placeholder="כיבוד, חניה, פרטים נוספים..."
            />
          </div>

          <Button
            onClick={handleAdd}
            disabled={submitting}
            size="lg"
            className="mt-6 bg-[hsl(180_45%_30%)] hover:bg-[hsl(180_45%_25%)] text-white gap-2 px-8"
          >
            <Plus className="w-5 h-5" />
            הוסף יום עיון לרשימה
          </Button>
        </>
      )}
    </div>
  );
}
