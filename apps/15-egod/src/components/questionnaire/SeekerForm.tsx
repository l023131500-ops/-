import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import {
  subjectOptions, teachingStyleOptions, speakingStyleOptions,
  audienceOptions, participantSizeOptions, locationOptions,
  dayOptions, hourOptions, frequencyOptions, paymentOptions,
  backgroundOptions, prayerStyleOptions, activityLevelOptions, styleOptions,
  SeekerType,
} from "@/types/questionnaire";
import MultiSelect from "@/components/questionnaire/MultiSelect";
import RadioSelect from "@/components/questionnaire/RadioSelect";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SeekerFormProps {
  data: Record<string, any>;
  onChange: (data: Record<string, any>) => void;
}

const SeekerForm = ({ data, onChange }: SeekerFormProps) => {
  const [step, setStep] = useState(0);
  const seekerType: SeekerType | undefined = data.seekerType;

  const steps = [
    { id: "type", title: "סוג הפנייה" },
    ...(seekerType === "mourning" ? [{ id: "mourning", title: "פרטי בית האבלים" }] : []),
    ...(seekerType === "synagogue" ? [{ id: "synagogue", title: "פרטי בית הכנסת" }] : []),
    { id: "audience", title: "התאמת קהל" },
    { id: "style", title: "סגנון מבוקש" },
    { id: "schedule", title: "זמנים ותשלום" },
  ];

  const update = (key: string, value: any) => onChange({ ...data, [key]: value });
  const toggleMulti = (key: string, value: string) => {
    const current: string[] = data[key] || [];
    update(key, current.includes(value) ? current.filter((v: string) => v !== value) : [...current, value]);
  };

  const nextStep = () => { if (step < steps.length - 1) setStep(step + 1); };
  const prevStep = () => { if (step > 0) setStep(step - 1); };

  const handleSubmit = async () => {
    if (!data.contactName || !data.phone) {
      toast.error("שם וטלפון הם שדות חובה");
      return;
    }
    const { error } = await supabase.from("leads").insert({
      full_name: data.contactName,
      phone: data.phone,
      area: data.city || "",
      preferred_subject: (data.subjects || []).join(", "),
      preferred_times: (data.preferredDays || []).join(", "),
      notes: `בקשת שיעור (${data.seekerType || "כללי"}) | סגנון: ${(data.style || []).join(", ")} | ${data.seekerType === "mourning" ? `נפטר: ${data.deceasedName || ""} | ` : ""}${data.seekerType === "synagogue" ? `בית כנסת: ${data.synagogueName || ""} | ` : ""}${data.notes || ""}`,
      status: "new",
    });
    if (!error) toast.success("הבקשה נשלחה בהצלחה! נחזור אליכם בהקדם.");
    else toast.error("שגיאה בשליחה");
  };

  const seekerTypes: { value: SeekerType; label: string }[] = [
    { value: "individual", label: "יחיד" },
    { value: "mourning", label: "בית אבלים" },
    { value: "group", label: "קבוצה המעוניינת בשיעור" },
    { value: "synagogue", label: "בית כנסת" },
  ];

  const currentStepId = steps[step]?.id;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="flex border-b border-border overflow-x-auto">
        {steps.map((s, i) => (
          <button key={s.id} onClick={() => setStep(i)}
            className={`flex-1 min-w-[100px] py-4 px-3 text-center text-sm transition-all ${
              i === step ? "bg-primary/10 text-primary border-b-2 border-primary font-semibold"
              : i < step ? "text-primary/60" : "text-muted-foreground"
            }`}>
            <span className="flex items-center justify-center gap-1">
              {i < step && <CheckCircle className="w-4 h-4" />}{s.title}
            </span>
          </button>
        ))}
      </div>
      <div className="p-8">
        <motion.div key={currentStepId} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          {currentStepId === "type" && (
            <div className="space-y-5">
              <h3 className="font-heading text-xl font-bold text-foreground mb-6">פרטי הפונה</h3>
              <div>
                <label className="text-sm font-medium text-foreground mb-3 block">עבור מי אתם מעוניינים לקבוע שיעור? *</label>
                <div className="grid grid-cols-2 gap-3">
                  {seekerTypes.map((t) => (
                    <button key={t.value} onClick={() => { update("seekerType", t.value); setStep(0); }}
                      className={`p-4 rounded-xl border-2 text-sm font-medium transition-all ${
                        data.seekerType === t.value ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-secondary/30 text-foreground"
                      }`}>{t.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="seekerform-contactname" className="text-sm font-medium text-foreground mb-1.5 block">איש קשר *</label>
                <Input id="seekerform-contactname" value={data.contactName || ""} onChange={(e) => update("contactName", e.target.value)} placeholder="שם מלא" autoComplete="name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="seekerform-phone" className="text-sm font-medium text-foreground mb-1.5 block">טלפון *</label>
                  <Input id="seekerform-phone" value={data.phone || ""} onChange={(e) => update("phone", e.target.value)} placeholder="050-0000000" type="tel" inputMode="tel" autoComplete="tel" />
                </div>
                <div>
                  <label htmlFor="seekerform-email" className="text-sm font-medium text-foreground mb-1.5 block">מייל</label>
                  <Input id="seekerform-email" value={data.email || ""} onChange={(e) => update("email", e.target.value)} placeholder="email@example.com" type="email" inputMode="email" autoComplete="email" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="seekerform-city" className="text-sm font-medium text-foreground mb-1.5 block">עיר *</label>
                  <Input id="seekerform-city" value={data.city || ""} onChange={(e) => update("city", e.target.value)} placeholder="ירושלים" autoComplete="address-level2" />
                </div>
                <div>
                  <label htmlFor="seekerform-neighborhood" className="text-sm font-medium text-foreground mb-1.5 block">שכונה</label>
                  <Input id="seekerform-neighborhood" value={data.neighborhood || ""} onChange={(e) => update("neighborhood", e.target.value)} />
                </div>
                <div>
                  <label htmlFor="seekerform-street" className="text-sm font-medium text-foreground mb-1.5 block">רחוב</label>
                  <Input id="seekerform-street" value={data.street || ""} onChange={(e) => update("street", e.target.value)} />
                </div>
              </div>
            </div>
          )}
          {currentStepId === "mourning" && (
            <div className="space-y-5">
              <h3 className="font-heading text-xl font-bold text-foreground mb-6">פרטי בית האבלים</h3>
              <div><label htmlFor="seekerform-deceasedname" className="text-sm font-medium text-foreground mb-1.5 block">שם הנפטר *</label>
                <Input id="seekerform-deceasedname" value={data.deceasedName || ""} onChange={(e) => update("deceasedName", e.target.value)} /></div>
              <div><label htmlFor="seekerform-deceasedoccupation" className="text-sm font-medium text-foreground mb-1.5 block">עיסוק הנפטר</label>
                <Input id="seekerform-deceasedoccupation" value={data.deceasedOccupation || ""} onChange={(e) => update("deceasedOccupation", e.target.value)} /></div>
              <div><label htmlFor="seekerform-mourninglocation" className="text-sm font-medium text-foreground mb-1.5 block">מיקום בית האבלים *</label>
                <Input id="seekerform-mourninglocation" value={data.mourningLocation || ""} onChange={(e) => update("mourningLocation", e.target.value)} /></div>
              <div><label htmlFor="seekerform-prayertimes" className="text-sm font-medium text-foreground mb-1.5 block">זמני התפילות</label>
                <Input id="seekerform-prayertimes" value={data.prayerTimes || ""} onChange={(e) => update("prayerTimes", e.target.value)} /></div>
            </div>
          )}
          {currentStepId === "synagogue" && (
            <div className="space-y-5">
              <h3 className="font-heading text-xl font-bold text-foreground mb-6">פרטי בית הכנסת</h3>
              <div><label htmlFor="seekerform-synagoguename" className="text-sm font-medium text-foreground mb-1.5 block">שם בית הכנסת *</label>
                <Input id="seekerform-synagoguename" value={data.synagogueName || ""} onChange={(e) => update("synagogueName", e.target.value)} /></div>
              <div><label htmlFor="seekerform-gabainame" className="text-sm font-medium text-foreground mb-1.5 block">שם הגבאי / רב בית הכנסת *</label>
                <Input id="seekerform-gabainame" value={data.gabaiName || ""} onChange={(e) => update("gabaiName", e.target.value)} /></div>
              <RadioSelect label="נוסח בית הכנסת *" options={prayerStyleOptions} selected={data.prayerStyle || ""} onSelect={(v) => update("prayerStyle", v)} />
              <div><label htmlFor="seekerform-congregationsize" className="text-sm font-medium text-foreground mb-1.5 block">כמות מתפללים</label>
                <Input id="seekerform-congregationsize" value={data.congregationSize || ""} onChange={(e) => update("congregationSize", e.target.value)} placeholder="לדוגמה: 50" /></div>
              <RadioSelect label="רמת הפעילות" options={activityLevelOptions} selected={data.activityLevel || ""} onSelect={(v) => update("activityLevel", v)} />
            </div>
          )}
          {currentStepId === "audience" && (
            <div className="space-y-6">
              <h3 className="font-heading text-xl font-bold text-foreground mb-6">סגנון והתאמת קהל היעד</h3>
              <MultiSelect label="סגנון מועדף (ניתן לסמן כמה)" options={styleOptions} selected={data.style || []} onToggle={(v) => toggleMulti("style", v)} />
              <MultiSelect label="מה הסגנון של הלומדים? (ניתן לסמן כמה)" options={audienceOptions} selected={data.familyStyle || []} onToggle={(v) => toggleMulti("familyStyle", v)} />
              <MultiSelect label="באילו נושאים אתם מעוניינים? (ניתן לסמן כמה)" options={subjectOptions} selected={data.subjects || []} onToggle={(v) => toggleMulti("subjects", v)} />
            </div>
          )}
          {currentStepId === "style" && (
            <div className="space-y-6">
              <h3 className="font-heading text-xl font-bold text-foreground mb-6">סגנון מבוקש</h3>
              <MultiSelect label="רקע מגיד שיעור מתאים (ניתן לסמן כמה)" options={["לא משנה", ...backgroundOptions]} selected={data.teacherBackground || []} onToggle={(v) => toggleMulti("teacherBackground", v)} />
              <MultiSelect label="אופי השיעורים (ניתן לסמן כמה)" options={teachingStyleOptions} selected={data.lessonStyle || []} onToggle={(v) => toggleMulti("lessonStyle", v)} />
              <MultiSelect label="סגנון דיבור מועדף (ניתן לסמן כמה)" options={speakingStyleOptions} selected={data.speakingStyle || []} onToggle={(v) => toggleMulti("speakingStyle", v)} />
              <MultiSelect label="כמות משתתפים (ניתן לסמן כמה)" options={participantSizeOptions} selected={data.participantSize || []} onToggle={(v) => toggleMulti("participantSize", v)} />
              <MultiSelect label="מיקום השיעור (ניתן לסמן כמה)" options={locationOptions} selected={data.lessonLocation || []} onToggle={(v) => toggleMulti("lessonLocation", v)} />
            </div>
          )}
          {currentStepId === "schedule" && (
            <div className="space-y-6">
              <h3 className="font-heading text-xl font-bold text-foreground mb-6">זמנים ותשלום</h3>
              <RadioSelect label="קביעות השיעור" options={frequencyOptions} selected={data.frequency || ""} onSelect={(v) => update("frequency", v)} />
              <MultiSelect label="ימים מועדפים (ניתן לסמן כמה)" options={dayOptions} selected={data.preferredDays || []} onToggle={(v) => toggleMulti("preferredDays", v)} />
              <MultiSelect label="שעות מועדפות (ניתן לסמן כמה)" options={hourOptions} selected={data.preferredHours || []} onToggle={(v) => toggleMulti("preferredHours", v)} />
              <RadioSelect label="תשלום" options={paymentOptions} selected={data.payment || ""} onSelect={(v) => update("payment", v)} />
              <div>
                <label htmlFor="seekerform-notes" className="text-sm font-medium text-foreground mb-1.5 block">הערות נוספות</label>
                <Textarea id="seekerform-notes" value={data.notes || ""} onChange={(e) => update("notes", e.target.value)} placeholder="כל מידע נוסף שיכול לעזור..." rows={3} />
              </div>
            </div>
          )}
        </motion.div>
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
          <Button variant="outline" onClick={prevStep} disabled={step === 0} className="gap-2">
            <ChevronRight className="w-4 h-4" />הקודם
          </Button>
          {step < steps.length - 1 ? (
            <Button onClick={nextStep} className="bg-secondary text-secondary-foreground font-semibold gap-2 hover:opacity-90">
              הבא<ChevronLeft className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} className="bg-secondary text-secondary-foreground font-semibold hover:opacity-90">שליחת הבקשה</Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeekerForm;