import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import {
  backgroundOptions, subjectOptions, teachingStyleOptions,
  speakingStyleOptions, audienceOptions, locationOptions,
  dayOptions, hourOptions, frequencyOptions, paymentOptions, styleOptions,
  LANGUAGES, GENDER_OPTIONS, AGE_GROUPS, EXPERIENCE_OPTIONS, participantSizeOptions,
} from "@/types/questionnaire";
import MultiSelect from "@/components/questionnaire/MultiSelect";
import RadioSelect from "@/components/questionnaire/RadioSelect";
import { supabase } from "@/integrations/supabase/client";
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
  { id: "experience", title: "ניסיון ושפות" },
  { id: "schedule", title: "זמנים ותשלום" },
];

const TeacherForm = ({ data, onChange }: TeacherFormProps) => {
  const [step, setStep] = useState(0);

  const update = (key: string, value: any) => onChange({ ...data, [key]: value });
  const toggleMulti = (key: string, value: string) => {
    const current: string[] = data[key] || [];
    update(key, current.includes(value) ? current.filter((v: string) => v !== value) : [...current, value]);
  };

  const nextStep = () => { if (step < steps.length - 1) setStep(step + 1); };
  const prevStep = () => { if (step > 0) setStep(step - 1); };

  const handleSubmit = async () => {
    if (!data.fullName || !data.phone) {
      toast.error("שם וטלפון הם שדות חובה");
      return;
    }
    const { error } = await supabase.from("leads").insert({
      full_name: data.fullName,
      phone: data.phone,
      area: data.city || "",
      preferred_subject: [...(data.subjects || []), ...(data.otherSubject ? [`אחר: ${data.otherSubject}`] : [])].join(", "),
      preferred_times: (data.availableDays || []).join(", "),
      notes: [
        `רישום מגיד שיעור`,
        `רקע: ${(data.background || []).join(", ")}`,
        `סגנון השיעור: ${(data.teachingStyle || []).join(", ")}`,
        `סגנון דיבור: ${(data.speakingStyle || []).join(", ")}`,
        `קהל: ${(data.targetAudience || []).join(", ")}`,
        `קבוצות גיל: ${(data.ageGroups || []).join(", ")}`,
        `מגדר קהל: ${data.gender || ""}`,
        `שפות: ${(data.languages || []).join(", ")}`,
        `ותק: ${data.experience || ""}`,
        `גודל קבוצות: ${(data.participantSize || []).join(", ")}`,
        `מיקום: ${data.city || ""} ${data.neighborhood || ""} ${data.street || ""}`.trim(),
        `אתר: ${data.website || ""}`,
        `תשלום: ${data.payment || ""}`,
        data.notes ? `הערות: ${data.notes}` : "",
      ].filter(Boolean).join(" | "),
      status: "new",
    });
    if (!error) toast.success("הטופס נשלח בהצלחה! נחזור אליכם בהקדם.");
    else toast.error("שגיאה בשליחה");
  };

  return (
    <div className="bg-card rounded-3xl border border-border shadow-elegant overflow-hidden">
      <div className="bg-gradient-navy px-8 py-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 90% 10%, hsl(var(--secondary)) 0%, transparent 50%)" }} />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <p className="text-secondary text-xs font-semibold tracking-widest uppercase mb-1">שלב {step + 1} מתוך {steps.length}</p>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-primary-foreground">{steps[step].title}</h2>
          </div>
          <div className="hidden md:flex items-center gap-2">
            {steps.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-smooth ${i === step ? "w-10 bg-secondary" : i < step ? "w-6 bg-secondary/60" : "w-6 bg-primary-foreground/20"}`} />
            ))}
          </div>
        </div>
      </div>
      <div className="flex border-b border-border overflow-x-auto bg-muted/30">
        {steps.map((s, i) => (
          <button key={s.id} onClick={() => setStep(i)}
            className={`flex-1 min-w-[120px] py-3 px-3 text-center text-xs md:text-sm transition-smooth ${
              i === step ? "bg-card text-secondary border-b-2 border-secondary font-semibold"
              : i < step ? "text-secondary/70 hover:bg-card/50" : "text-muted-foreground hover:bg-card/50"
            }`}>
            <span className="flex items-center justify-center gap-1.5">
              {i < step && <CheckCircle className="w-4 h-4" />}{s.title}
            </span>
          </button>
        ))}
      </div>
      <div className="p-8 md:p-10">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          {step === 0 && (
            <div className="space-y-5">
              <h3 className="font-heading text-xl font-bold text-foreground mb-6">פרטים אישיים</h3>
              <div>
                <label htmlFor="teacherform-fullname" className="text-sm font-medium text-foreground mb-1.5 block">שם מלא *</label>
                <Input id="teacherform-fullname" value={data.fullName || ""} onChange={(e) => update("fullName", e.target.value)} placeholder="הרב ישראל ישראלי" autoComplete="name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="teacherform-phone" className="text-sm font-medium text-foreground mb-1.5 block">טלפון *</label>
                  <Input id="teacherform-phone" value={data.phone || ""} onChange={(e) => update("phone", e.target.value)} placeholder="050-0000000" type="tel" inputMode="tel" autoComplete="tel" />
                </div>
                <div>
                  <label htmlFor="teacherform-email" className="text-sm font-medium text-foreground mb-1.5 block">מייל</label>
                  <Input id="teacherform-email" value={data.email || ""} onChange={(e) => update("email", e.target.value)} placeholder="email@example.com" type="email" inputMode="email" autoComplete="email" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="teacherform-city" className="text-sm font-medium text-foreground mb-1.5 block">עיר *</label>
                  <Input id="teacherform-city" value={data.city || ""} onChange={(e) => update("city", e.target.value)} placeholder="ירושלים" autoComplete="address-level2" />
                </div>
                <div>
                  <label htmlFor="teacherform-neighborhood" className="text-sm font-medium text-foreground mb-1.5 block">שכונה</label>
                  <Input id="teacherform-neighborhood" value={data.neighborhood || ""} onChange={(e) => update("neighborhood", e.target.value)} placeholder="רמות" />
                </div>
                <div>
                  <label htmlFor="teacherform-street" className="text-sm font-medium text-foreground mb-1.5 block">רחוב</label>
                  <Input id="teacherform-street" value={data.street || ""} onChange={(e) => update("street", e.target.value)} placeholder="הרב הרצוג 5" />
                </div>
              </div>
              <div>
                <label htmlFor="teacherform-website" className="text-sm font-medium text-foreground mb-1.5 block">אתר אינטרנט / רשת חברתית</label>
                <Input id="teacherform-website" value={data.website || ""} onChange={(e) => update("website", e.target.value)} placeholder="https://..." dir="ltr" />
              </div>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="font-heading text-xl font-bold text-foreground mb-6">רקע ונושאי לימוד</h3>
              <MultiSelect label="מה הרקע שלך? (ניתן לסמן כמה)" options={backgroundOptions} selected={data.background || []} onToggle={(v) => toggleMulti("background", v)} />
              <MultiSelect label="באילו נושאים אתה מעביר שיעורים? (ניתן לסמן כמה)" options={subjectOptions} selected={data.subjects || []} onToggle={(v) => toggleMulti("subjects", v)} />
              <div>
                <label htmlFor="teacherform-other-subject" className="text-sm font-semibold text-foreground mb-2 block flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full bg-gradient-gold" />נושא נוסף (כתיבה חופשית)
                </label>
                <Input id="teacherform-other-subject" value={data.otherSubject || ""} onChange={(e) => update("otherSubject", e.target.value)} placeholder="למשל: מסילת ישרים, פרקי אבות, ספר מסוים..." />
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-6">
              <h3 className="font-heading text-xl font-bold text-foreground mb-6">סגנון השיעור</h3>
              <MultiSelect label="מה אופי השיעורים שלך? (ניתן לסמן כמה)" options={teachingStyleOptions} selected={data.teachingStyle || []} onToggle={(v) => toggleMulti("teachingStyle", v)} />
              <MultiSelect label="מה סגנון הדיבור שלך? (ניתן לסמן כמה)" options={speakingStyleOptions} selected={data.speakingStyle || []} onToggle={(v) => toggleMulti("speakingStyle", v)} />
              <MultiSelect label="גודל קבוצות מועדף (ניתן לסמן כמה)" options={participantSizeOptions} selected={data.participantSize || []} onToggle={(v) => toggleMulti("participantSize", v)} />
            </div>
          )}
          {step === 3 && (
            <div className="space-y-6">
              <h3 className="font-heading text-xl font-bold text-foreground mb-6">סגנון וקהל יעד</h3>
              <MultiSelect label="סגנון (ניתן לסמן כמה)" options={styleOptions} selected={data.style || []} onToggle={(v) => toggleMulti("style", v)} />
              <MultiSelect label="לאיזה קהל אתה מתאים? (ניתן לסמן כמה)" options={audienceOptions} selected={data.targetAudience || []} onToggle={(v) => toggleMulti("targetAudience", v)} />
              <MultiSelect label="קבוצות גיל (ניתן לסמן כמה)" options={AGE_GROUPS} selected={data.ageGroups || []} onToggle={(v) => toggleMulti("ageGroups", v)} />
              <RadioSelect label="מגדר הקהל" options={["נשים", "גברים", "מעורב"]} selected={data.gender || ""} onSelect={(v) => update("gender", v)} />
              <MultiSelect label="היכן אתה מעביר שיעורים? (ניתן לסמן כמה)" options={locationOptions} selected={data.lessonLocations || []} onToggle={(v) => toggleMulti("lessonLocations", v)} />
            </div>
          )}
          {step === 4 && (
            <div className="space-y-6">
              <h3 className="font-heading text-xl font-bold text-foreground mb-6">ניסיון ושפות</h3>
              <RadioSelect label="ותק בהוראה" options={EXPERIENCE_OPTIONS} selected={data.experience || ""} onSelect={(v) => update("experience", v)} />
              <MultiSelect label="באילו שפות אתה מעביר שיעורים? (ניתן לסמן כמה)" options={LANGUAGES} selected={data.languages || []} onToggle={(v) => toggleMulti("languages", v)} />
              <div>
                <label htmlFor="teacherform-bio" className="text-sm font-medium text-foreground mb-1.5 block">תיאור קצר עליך (אודות)</label>
                <Textarea id="teacherform-bio" value={data.bio || ""} onChange={(e) => update("bio", e.target.value)} placeholder="כמה מילים על עצמך, על הניסיון שלך ועל סגנון השיעורים..." rows={4} />
              </div>
            </div>
          )}
          {step === 5 && (
            <div className="space-y-6">
              <h3 className="font-heading text-xl font-bold text-foreground mb-6">זמנים ותשלום</h3>
              <RadioSelect label="קביעות השיעור" options={frequencyOptions} selected={data.frequency || ""} onSelect={(v) => update("frequency", v)} />
              <MultiSelect label="ימים מועדפים (ניתן לסמן כמה)" options={dayOptions} selected={data.availableDays || []} onToggle={(v) => toggleMulti("availableDays", v)} />
              <MultiSelect label="שעות מועדפות (ניתן לסמן כמה)" options={hourOptions} selected={data.availableHours || []} onToggle={(v) => toggleMulti("availableHours", v)} />
              <RadioSelect label="ציפיות לגבי תשלום" options={paymentOptions} selected={data.payment || ""} onSelect={(v) => update("payment", v)} />
              <div>
                <label htmlFor="teacherform-notes" className="text-sm font-medium text-foreground mb-1.5 block">הערות נוספות</label>
                <Textarea id="teacherform-notes" value={data.notes || ""} onChange={(e) => update("notes", e.target.value)} placeholder="כל מידע נוסף שיכול לעזור..." rows={3} />
              </div>
            </div>
          )}
        </motion.div>
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-border">
          <Button variant="outline" onClick={prevStep} disabled={step === 0} className="gap-2 rounded-xl">
            <ChevronRight className="w-4 h-4" />הקודם
          </Button>
          {step < steps.length - 1 ? (
            <Button onClick={nextStep} className="bg-gradient-gold text-primary font-bold gap-2 rounded-xl shadow-gold hover:scale-105 transition-smooth px-6">
              המשך<ChevronLeft className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} className="bg-gradient-gold text-primary font-bold rounded-xl shadow-gold hover:scale-105 transition-smooth px-8">
              ✦ שליחת הטופס
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherForm;