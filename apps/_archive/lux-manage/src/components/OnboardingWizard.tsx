import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Heart } from "lucide-react";
import { useApp, UserProfile, emptyProfile } from "@/contexts/AppContext";
import { saveToStorage } from "@/lib/localStorage";
import { toast } from "sonner";
import { normalizeEnabledModules } from "@/lib/modules";

export default function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const { setProfile, userId } = useApp();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [city, setCity] = useState("");
  const [familyStatus, setFamilyStatus] = useState("");
  const [spouseName, setSpouseName] = useState("");
  const [spouseId, setSpouseId] = useState("");
  const [spouseBirthDate, setSpouseBirthDate] = useState("");
  const [spousePhone, setSpousePhone] = useState("");
  const [childrenCount, setChildrenCount] = useState(0);
  const [childrenBirthDates, setChildrenBirthDates] = useState<string[]>([]);
  const [childrenNames, setChildrenNames] = useState<string[]>([]);

  const isMarried = familyStatus === "נשוי/אה";
  const canContinue =
    firstName.trim().length > 0 &&
    phone.trim().length > 0 &&
    idNumber.trim().length > 0 &&
    birthDate.trim().length > 0 &&
    city.trim().length > 0 &&
    familyStatus.trim().length > 0 &&
    (!isMarried || spouseName.trim().length > 0);

  const handleComplete = async () => {
    const fullName = `${firstName} ${lastName}`.trim() || "משתמש חדש";
    const ages = childrenBirthDates.map(d => {
      if (!d) return 0;
      const birth = new Date(d);
      const now = new Date();
      return Math.floor((now.getTime() - birth.getTime()) / (365.25 * 86400000));
    });

    const profile: UserProfile = {
      ...emptyProfile,
      name: fullName,
      familyStatus,
      childrenCount,
      childrenNames,
      city,
      childrenAges: ages,
      profileComplete: false,
    };

    setProfile(profile);

    const autoModules = normalizeEnabledModules(["timeline", "expenses", "quick_entry", "benefits", "financial_health", "academy"]);
    if (childrenCount > 0) autoModules.push("family_future", "calendar");
    const normalizedModules = normalizeEnabledModules(autoModules);
    if (userId) saveToStorage(`enabled_modules_${userId}`, normalizedModules);

    if (userId) {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { error } = await supabase.from("profiles").upsert({
          id: userId,
          name: fullName,
          family_status: familyStatus,
          children_count: childrenCount,
          children_names: childrenNames,
          children_ages: ages,
          city,
          enabled_modules: normalizedModules,
          onboarding_complete: true,
          profile_complete: false,
        } as any, { onConflict: "id" });
        if (error) throw error;
      } catch (err) {
        console.error("Failed to save profile:", err);
        toast.error("שגיאה בשמירת הפרטים, נסה שוב");
        return;
      }
    }

    onComplete();
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="ambient-gold w-[800px] h-[800px] top-1/4 start-1/4 -z-10 fixed" />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg">
        <div className="text-center mb-8">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}
            className="w-16 h-16 rounded-3xl gold-gradient mx-auto flex items-center justify-center mb-4 shadow-lg">
            <Sparkles className="w-7 h-7 text-primary-foreground" />
          </motion.div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">ברוכים הבאים ל-FinanceHub</h1>
          <p className="text-sm text-muted-foreground mt-1">נתונים בסיסיים חובה כדי להתחיל</p>
        </div>

        <div className="glass-card rounded-bento p-8 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Names */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="שם פרטי *">
              <input value={firstName} onChange={e => setFirstName(e.target.value)}
                placeholder="שם פרטי" className="wizard-input" />
            </Field>
            <Field label="שם משפחה">
              <input value={lastName} onChange={e => setLastName(e.target.value)}
                placeholder="שם משפחה" className="wizard-input" />
            </Field>
          </div>

          {/* Phone & ID */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="טלפון *">
              <input value={phone} onChange={e => setPhone(e.target.value)} type="tel"
                placeholder="050-0000000" className="wizard-input" dir="ltr" />
            </Field>
            <Field label="תעודת זהות *">
              <input value={idNumber} onChange={e => setIdNumber(e.target.value)}
                placeholder="מס׳ ת.ז." className="wizard-input" dir="ltr" />
            </Field>
          </div>

          {/* Birth date & City */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="תאריך לידה *">
              <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
                className="wizard-input" />
            </Field>
            <Field label="עיר מגורים *">
              <input value={city} onChange={e => setCity(e.target.value)}
                placeholder="עיר" className="wizard-input" />
            </Field>
          </div>

          {/* Family Status */}
          <Field label="מצב משפחתי *">
            <div className="grid grid-cols-2 gap-3">
              {["רווק/ה", "נשוי/אה", "גרוש/ה", "אלמן/ה"].map(s => (
                <button type="button" key={s} onClick={() => setFamilyStatus(s)}
                  className={`wizard-option ${familyStatus === s ? "wizard-option-active" : ""}`}>{s}</button>
              ))}
            </div>
          </Field>

          {/* Spouse Details — only for married */}
          {isMarried && (
            <div className="space-y-4 p-4 rounded-2xl bg-accent/5 border border-accent/20">
              <p className="text-xs font-bold text-accent">פרטי בן/בת הזוג</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="שם בן/בת הזוג *">
                  <input value={spouseName} onChange={e => setSpouseName(e.target.value)}
                    placeholder="שם מלא" className="wizard-input" />
                </Field>
                <Field label="ת.ז. בן/בת הזוג">
                  <input value={spouseId} onChange={e => setSpouseId(e.target.value)}
                    placeholder="מס׳ ת.ז." className="wizard-input" dir="ltr" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="תאריך לידה">
                  <input type="date" value={spouseBirthDate} onChange={e => setSpouseBirthDate(e.target.value)}
                    className="wizard-input" />
                </Field>
                <Field label="טלפון">
                  <input value={spousePhone} onChange={e => setSpousePhone(e.target.value)} type="tel"
                    placeholder="050-0000000" className="wizard-input" dir="ltr" />
                </Field>
              </div>
            </div>
          )}

          {/* Children Count */}
          <Field label="מספר ילדים">
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => {
                const n = Math.max(0, childrenCount - 1);
                setChildrenCount(n);
                setChildrenBirthDates(d => d.slice(0, n));
                setChildrenNames(d => d.slice(0, n));
              }} className="wizard-btn-circle">−</button>
              <span className="text-2xl font-extrabold text-foreground w-8 text-center">{childrenCount}</span>
              <button type="button" onClick={() => {
                const n = childrenCount + 1;
                setChildrenCount(n);
                setChildrenBirthDates(d => [...d, ""]);
                setChildrenNames(d => [...d, ""]);
              }} className="wizard-btn-circle">+</button>
            </div>
          </Field>

          {/* Children Details */}
          {childrenCount > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-muted-foreground">פרטי ילדים</p>
              {Array.from({ length: childrenCount }).map((_, i) => (
                <div key={i} className="p-3 rounded-xl bg-secondary/30 border border-border/20 space-y-2">
                  <div className="flex gap-2">
                    <input value={childrenNames[i] || ""} onChange={e => {
                      const names = [...childrenNames]; names[i] = e.target.value; setChildrenNames(names);
                    }} placeholder={`שם ילד/ה ${i + 1}`} className="wizard-input flex-1" />
                    <input type="date" value={childrenBirthDates[i] || ""} onChange={e => {
                      const dates = [...childrenBirthDates]; dates[i] = e.target.value; setChildrenBirthDates(dates);
                    }} className="wizard-input w-40" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Submit */}
          <button type="button" onClick={handleComplete} disabled={!canContinue}
            className="btn-clay-gold w-full text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40">
            <Heart className="w-4 h-4" />
            בואו נתחיל!
          </button>
          <p className="text-[10px] text-muted-foreground text-center">* שדות חובה</p>
        </div>
      </motion.div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-foreground mb-2">{label}</label>
      {children}
    </div>
  );
}
