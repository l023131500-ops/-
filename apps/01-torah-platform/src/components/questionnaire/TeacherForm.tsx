import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import {
  backgroundOptions,
  subjectOptions,
  teachingStyleOptions,
  speakingStyleOptions,
  audienceOptions,
  locationOptions,
  dayOptions,
  hourOptions,
  frequencyOptions,
  paymentOptions,
  styleOptions,
} from "@/types/questionnaire";
import MultiSelect from "@/components/questionnaire/MultiSelect";
import RadioSelect from "@/components/questionnaire/RadioSelect";
import { toast } from "sonner";

interface TeacherFormProps {
  data: Record<string, any>;
  onChange: (data: Record<string, any>) => void;
}

const steps = [
  { id: "personal", title: "פרטים אישיים" },
  { id: "background", title: "רקע ונושאים" },
  { id: "style", title: "סגנון השיעור" },
  { id: "audience", title: "קהל יעד ומיקום" },
  { id: "schedule", title: "זמנים ותשלום" },
];

const TeacherForm = ({ data, onChange }: TeacherFormProps) => {
  const [step, setStep] = useState(0);

  const update = (key: string, value: any) => {
    onChange({ ...data, [key]: value });
  };

  const toggleMulti = (key: string, value: string) => {
    const current: string[] = data[key] || [];
    const updated = current.includes(value)
      ? current.filter((v: string) => v !== value)
      : [...current, value];
    update(key, updated);
  };

  const nextStep = () => {
    if (step < steps.length - 1) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSubmit = () => {
    toast.success("הטופס נשלח בהצלחה! נחזור אליכם בהקדם.");
    console.log("Teacher form data:", data);
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-elegant overflow-hidden">
      {/* Step indicator */}
      <div className="flex border-b border-border overflow-x-auto">
        {steps.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setStep(i)}
            className={`flex-1 min-w-[120px] py-4 px-3 text-center font-body text-sm transition-all ${
              i === step
                ? "bg-teal/10 text-teal border-b-2 border-teal font-semibold"
                : i < step
                ? "text-teal/60"
                : "text-muted-foreground"
            }`}
          >
            <span className="flex items-center justify-center gap-1">
              {i < step && <CheckCircle className="w-4 h-4" />}
              {s.title}
            </span>
          </button>
        ))}
      </div>

      <div className="p-8">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {step === 0 && (
            <div className="space-y-5">
              <h3 className="font-display text-xl font-bold text-card-foreground mb-6">פרטים אישיים</h3>
              <div>
                <label className="font-body text-sm font-medium text-card-foreground mb-1.5 block">שם מלא *</label>
                <Input value={data.fullName || ""} onChange={(e) => update("fullName", e.target.value)} placeholder="הרב ישראל ישראלי" autoComplete="name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-body text-sm font-medium text-card-foreground mb-1.5 block">טלפון *</label>
                  <Input value={data.phone || ""} onChange={(e) => update("phone", e.target.value)} placeholder="050-0000000" type="tel" inputMode="tel" autoComplete="tel" />
                </div>
                <div>
                  <label className="font-body text-sm font-medium text-card-foreground mb-1.5 block">מייל</label>
                  <Input value={data.email || ""} onChange={(e) => update("email", e.target.value)} placeholder="email@example.com" type="email" inputMode="email" autoComplete="email" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-body text-sm font-medium text-card-foreground mb-1.5 block">עיר *</label>
                  <Input value={data.city || ""} onChange={(e) => update("city", e.target.value)} placeholder="ירושלים" autoComplete="address-level2" />
                </div>
                <div>
                  <label className="font-body text-sm font-medium text-card-foreground mb-1.5 block">שכונה</label>
                  <Input value={data.neighborhood || ""} onChange={(e) => update("neighborhood", e.target.value)} placeholder="רמות" />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <h3 className="font-display text-xl font-bold text-card-foreground mb-6">רקע ונושאי לימוד</h3>
              <MultiSelect
                label="מה הרקע שלך? (ניתן לסמן כמה)"
                options={backgroundOptions}
                selected={data.background || []}
                onToggle={(v) => toggleMulti("background", v)}
              />
              <MultiSelect
                label="באילו נושאים אתה מעביר שיעורים? (ניתן לסמן כמה)"
                options={subjectOptions}
                selected={data.subjects || []}
                onToggle={(v) => toggleMulti("subjects", v)}
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h3 className="font-display text-xl font-bold text-card-foreground mb-6">סגנון השיעור</h3>
              <MultiSelect
                label="מה אופי השיעורים שלך? (ניתן לסמן כמה)"
                options={teachingStyleOptions}
                selected={data.teachingStyle || []}
                onToggle={(v) => toggleMulti("teachingStyle", v)}
              />
              <MultiSelect
                label="מה סגנון הדיבור שלך? (ניתן לסמן כמה)"
                options={speakingStyleOptions}
                selected={data.speakingStyle || []}
                onToggle={(v) => toggleMulti("speakingStyle", v)}
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h3 className="font-display text-xl font-bold text-card-foreground mb-6">סגנון וקהל יעד</h3>
              <MultiSelect
                label="סגנון (ניתן לסמן כמה)"
                options={styleOptions}
                selected={data.style || []}
                onToggle={(v) => toggleMulti("style", v)}
              />
              {(data.style || []).includes("אחר") || (data.style || []).length === 0 ? null : null}
              <MultiSelect
                label="לאיזה קהל אתה מתאים? (ניתן לסמן כמה)"
                options={audienceOptions}
                selected={data.targetAudience || []}
                onToggle={(v) => toggleMulti("targetAudience", v)}
              />
              <MultiSelect
                label="היכן אתה מעביר שיעורים? (ניתן לסמן כמה)"
                options={locationOptions}
                selected={data.lessonLocations || []}
                onToggle={(v) => toggleMulti("lessonLocations", v)}
              />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h3 className="font-display text-xl font-bold text-card-foreground mb-6">זמנים ותשלום</h3>
              <RadioSelect
                label="קביעות השיעור"
                options={frequencyOptions}
                selected={data.frequency || ""}
                onSelect={(v) => update("frequency", v)}
              />
              <MultiSelect
                label="ימים מועדפים (ניתן לסמן כמה)"
                options={dayOptions}
                selected={data.availableDays || []}
                onToggle={(v) => toggleMulti("availableDays", v)}
              />
              <MultiSelect
                label="שעות מועדפות (ניתן לסמן כמה)"
                options={hourOptions}
                selected={data.availableHours || []}
                onToggle={(v) => toggleMulti("availableHours", v)}
              />
              <RadioSelect
                label="ציפיות לגבי תשלום"
                options={paymentOptions}
                selected={data.payment || ""}
                onSelect={(v) => update("payment", v)}
              />
              <div>
                <label className="font-body text-sm font-medium text-card-foreground mb-1.5 block">הערות נוספות</label>
                <Textarea
                  value={data.notes || ""}
                  onChange={(e) => update("notes", e.target.value)}
                  placeholder="כל מידע נוסף שיכול לעזור..."
                  rows={3}
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={step === 0}
            className="gap-2"
          >
            <ChevronRight className="w-4 h-4" />
            הקודם
          </Button>

          {step < steps.length - 1 ? (
            <Button onClick={nextStep} className="bg-gradient-brand text-background font-semibold gap-2 hover:opacity-90">
              הבא
              <ChevronLeft className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} className="bg-gradient-brand text-background font-semibold hover:opacity-90">
              שליחת הטופס
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherForm;
