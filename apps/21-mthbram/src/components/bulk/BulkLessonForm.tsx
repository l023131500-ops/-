import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  subjectOptions,
  audienceOptions,
  dayOptions,
  hourOptions,
} from "@/types/questionnaire";

const languageOptions = ["עברית", "אידיש", "אנגלית", "ספרדית", "צרפתית", "רוסית"];
const audienceTypeOptions = ["גברים", "נשים", "מעורב"];
const styleSelectOptions = ["חסידי", "ספרדי", "ליטאי", "ישיבתי"];
const scheduleTypeOptions = ["ימים בשבוע", "תאריך קבוע (חד-פעמי)"];

interface Props {
  sessionId: string;
  onAdded: () => void;
}

const OTHER = "אחר";

function SmartSelect({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  required?: boolean;
}) {
  const isOther = value && !options.includes(value);
  const [mode, setMode] = useState<"select" | "other">(isOther ? "other" : "select");

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground/80">
        {label}{required && <span className="text-destructive"> *</span>}
      </Label>
      {mode === "select" ? (
        <Select
          value={options.includes(value) ? value : ""}
          onValueChange={(v) => {
            if (v === OTHER) {
              setMode("other");
              onChange("");
            } else {
              onChange(v);
            }
          }}
        >
          <SelectTrigger className="h-10 text-sm bg-background border-foreground/15">
            <SelectValue placeholder="בחר..." />
          </SelectTrigger>
          <SelectContent className="max-h-60 bg-background z-50">
            {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            <SelectItem value={OTHER}>אחר (טקסט חופשי)...</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <div className="flex gap-1">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="הקלד..."
            className="h-10 text-sm border-foreground/15"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-10 px-2 text-xs"
            onClick={() => { setMode("select"); onChange(""); }}
          >
            ↺
          </Button>
        </div>
      )}
    </div>
  );
}

interface DayTime { day: string; time: string; }

export default function BulkLessonForm({ sessionId, onAdded }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [scheduleDays, setScheduleDays] = useState<DayTime[]>([]);
  const [form, setForm] = useState({
    rabbi_name: "",
    subject: "",
    language: "עברית",
    audience_type: "גברים",
    target_audience: "",
    lesson_style: "",
    city: "",
    neighborhood: "",
    street: "",
    street_number: "",
    synagogue_name: "",
    schedule_type: "ימים בשבוע",
    specific_date: "",
    specific_time: "",
    schedule_notes: "",
  });

  const set = <K extends keyof typeof form>(k: K, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const toggleDay = (day: string) => {
    setScheduleDays((prev) => {
      const exists = prev.find((d) => d.day === day);
      if (exists) return prev.filter((d) => d.day !== day);
      return [...prev, { day, time: "" }];
    });
  };

  const setDayTime = (day: string, time: string) => {
    setScheduleDays((prev) => prev.map((d) => d.day === day ? { ...d, time } : d));
  };

  const reset = () => {
    setForm({
      rabbi_name: "", subject: "", language: "עברית", audience_type: "גברים",
      target_audience: "", lesson_style: "", city: "", neighborhood: "", street: "", street_number: "",
      synagogue_name: "", schedule_type: "ימים בשבוע", specific_date: "", specific_time: "",
      schedule_notes: "",
    });
    setScheduleDays([]);
  };

  const handleAdd = async () => {
    const errors: string[] = [];
    if (!form.rabbi_name.trim()) errors.push("שם הרב");
    if (!form.subject.trim()) errors.push("נושא");
    if (!form.city.trim()) errors.push("עיר");
    if (!form.street.trim()) errors.push("רחוב");

    if (form.schedule_type === "ימים בשבוע") {
      if (scheduleDays.length === 0) errors.push("יום בשבוע");
      else if (scheduleDays.some((d) => !d.time)) errors.push("שעה לכל יום נבחר");
    } else {
      if (!form.specific_date) errors.push("תאריך");
      if (!form.specific_time) errors.push("שעה");
    }

    if (errors.length) {
      toast.error("חובה למלא: " + errors.join(", "));
      return;
    }

    setSubmitting(true);
    try {
      const schedule_days = form.schedule_type === "ימים בשבוע"
        ? scheduleDays
        : form.specific_time ? [{ day: "", time: form.specific_time }] : [];

      const { error } = await supabase.from("lessons").insert([{
        bulk_session_id: sessionId,
        is_sent: false,
        is_approved: false,
        status: "draft",
        rabbi_name: form.rabbi_name.trim(),
        subject: form.subject.trim(),
        lesson_style: form.lesson_style || "",
        language: form.language || "עברית",
        audience_type: form.audience_type ? [form.audience_type] : [],
        target_audience: form.target_audience
          ? form.target_audience.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        city: form.city.trim(),
        neighborhood: form.neighborhood,
        street: form.street.trim(),
        street_number: form.street_number,
        synagogue_name: form.synagogue_name,
        specific_date: form.schedule_type === "תאריך קבוע (חד-פעמי)" && form.specific_date ? form.specific_date : null,
        schedule_days,
        schedule_notes: form.schedule_notes,
      }]);
      if (error) throw error;
      toast.success("השיעור נוסף לרשימה");
      reset();
      onAdded();
    } catch (e) {
      console.error(e);
      toast.error("שגיאה בהוספת השיעור");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-secondary/20 rounded-2xl p-6 md:p-8 shadow-sm">
      <h3 className="font-display text-2xl text-secondary mb-6">הוספת שיעור ידנית</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground/80">
            שם הרב <span className="text-destructive">*</span>
          </Label>
          <Input
            value={form.rabbi_name}
            onChange={(e) => set("rabbi_name", e.target.value)}
            className="h-10 text-sm border-foreground/15"
          />
        </div>

        <SmartSelect label="נושא השיעור" required value={form.subject} onChange={(v) => set("subject", v)} options={subjectOptions} />
        <SmartSelect label="שפה" value={form.language} onChange={(v) => set("language", v)} options={languageOptions} />

        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground/80">גברים / נשים</Label>
          <Select value={form.audience_type} onValueChange={(v) => set("audience_type", v)}>
            <SelectTrigger className="h-10 text-sm bg-background border-foreground/15"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-background z-50">
              {audienceTypeOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <SmartSelect label="סגנון" value={form.lesson_style} onChange={(v) => set("lesson_style", v)} options={styleSelectOptions} />
        <SmartSelect label="קהל יעד" value={form.target_audience} onChange={(v) => set("target_audience", v)} options={audienceOptions} />

        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground/80">
            עיר <span className="text-destructive">*</span>
          </Label>
          <Input value={form.city} onChange={(e) => set("city", e.target.value)} className="h-10 text-sm border-foreground/15" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground/80">שכונה</Label>
          <Input value={form.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} className="h-10 text-sm border-foreground/15" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground/80">
            רחוב <span className="text-destructive">*</span>
          </Label>
          <Input value={form.street} onChange={(e) => set("street", e.target.value)} className="h-10 text-sm border-foreground/15" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground/80">מספר</Label>
          <Input value={form.street_number} onChange={(e) => set("street_number", e.target.value)} className="h-10 text-sm border-foreground/15" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground/80">בית כנסת / אולם</Label>
          <Input value={form.synagogue_name} onChange={(e) => set("synagogue_name", e.target.value)} className="h-10 text-sm border-foreground/15" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground/80">סוג זמן</Label>
          <Select value={form.schedule_type} onValueChange={(v) => set("schedule_type", v)}>
            <SelectTrigger className="h-10 text-sm bg-background border-foreground/15"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-background z-50">
              {scheduleTypeOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Schedule */}
      <div className="mt-6 p-5 bg-secondary/5 rounded-xl border border-secondary/15">
        {form.schedule_type === "ימים בשבוע" ? (
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground/80">
              ימים ושעות <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {dayOptions.map((day) => {
                const sel = scheduleDays.find((d) => d.day === day);
                return (
                  <div key={day} className="bg-white rounded-lg border border-foreground/10 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`day-${day}`}
                        checked={!!sel}
                        onCheckedChange={() => toggleDay(day)}
                      />
                      <Label htmlFor={`day-${day}`} className="text-sm cursor-pointer font-medium">
                        {day}
                      </Label>
                    </div>
                    {sel && (
                      <Select value={sel.time} onValueChange={(v) => setDayTime(day, v)}>
                        <SelectTrigger className="h-9 text-sm bg-background border-foreground/15">
                          <SelectValue placeholder="שעה" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 bg-background z-50">
                          {hourOptions.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground/80">
                תאריך <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={form.specific_date}
                onChange={(e) => set("specific_date", e.target.value)}
                className="h-10 text-sm border-foreground/15"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground/80">
                שעה <span className="text-destructive">*</span>
              </Label>
              <Select value={form.specific_time} onValueChange={(v) => set("specific_time", v)}>
                <SelectTrigger className="h-10 text-sm bg-background border-foreground/15">
                  <SelectValue placeholder="בחר שעה" />
                </SelectTrigger>
                <SelectContent className="max-h-60 bg-background z-50">
                  {hourOptions.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-1.5">
        <Label className="text-sm font-medium text-foreground/80">הערות זמן</Label>
        <Input
          value={form.schedule_notes}
          onChange={(e) => set("schedule_notes", e.target.value)}
          placeholder="לדוגמה: לא מתקיים בחגים"
          className="h-10 text-sm border-foreground/15"
        />
      </div>

      <Button
        onClick={handleAdd}
        disabled={submitting}
        size="lg"
        className="mt-6 bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-2 px-8"
      >
        <Plus className="w-5 h-5" />
        הוסף שיעור לרשימה
      </Button>
    </div>
  );
}
