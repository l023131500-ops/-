import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlusCircle, CheckCircle, Send, Phone, MapPin, Users, BookOpen, Palette, CreditCard, Calendar, Globe, UserCircle, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import ChipSelect from "@/components/forms/ChipSelect";
import ProgressiveFormStep from "@/components/forms/ProgressiveFormStep";

const SUBJECTS = [
  "גמרא עיון", "גמרא בקיאות", "משניות", "דף יומי", "עמוד היומי", "עין יעקב",
  "הלכה בעיון", "משנה ברורה", "הלכות פסוקות", "פרשת שבוע", "דרשות", "מוסר",
  "חסידות", "קבלה", "אגדות ומדרשי חז\"ל", "נ\"ך והיסטוריה", "חינוך ילדים",
  "שלום בית", "מחשבה והשקפה", "יסודות האמונה", "חושן משפט", "טעמי המקרא",
  "אחר - פרט",
];
const GENDER = ["נשים", "גברים", "אחר - פרט"];
const LANGUAGES = ["עברית", "אידיש", "אנגלית", "צרפתית", "רוסית", "אחר - פרט"];
const AUDIENCE_TYPES = [
  "מסורתיים", "מתחזקים", "נוער מתחזק", "בעלי בתים", "דתיים לאומיים",
  "חרד\"לים", "חוזרים בתשובה", "בוגרי ישיבות", "אברכים", "נוער", "ילדים",
  "אחר - פרט",
];
const FOR_WHO = ["יחיד", "בית אבלים", "קבוצה המעוניינת בשיעור", "בית כנסת", "אחר - פרט"];
const ACTIVITY_LEVELS = ["פעילות מלאה כל השבוע", "מנחה וערבית בכל יום", "רק בשבתות וחגים", "פעילות חלקית ביום חול", "אחר - פרט"];
const RABBI_BACKGROUND = ["לא משנה", "חוזר בתשובה", "ספרדי בני תורה", "ליטאי", "חסידי", "חרד\"לי", "דתי לאומי", "אחר - פרט"];
const LESSON_STYLES = [
  "לימוד משותף", "שיעור מתוך ספר", "לימוד מעמיק", "מסירת שיעור מוכן",
  "פנינים ודרשות קצרות", "הלכות", "שאלות ותשובות", "אחר - פרט",
];
const SPEAKING_STYLES = [
  "שפה גבוהה ומשכילה", "מפולפל", "עמוק", "ענייני וממוקד", "שפה עשירה",
  "שפה פשוטה ועממית", "הומור", "מתובל בסיפורים והמחשות", "אחר - פרט",
];
const LESSON_LOCATIONS = ["בתי כנסת", "שיעורים מאורגנים", "חוגי בית", "שיעורים קבועים", "אזכרות", "אירועים שונים", "אחר - פרט"];
const FREQUENCY = ["כל יום", "פעמיים בשבוע", "פעם בשבוע", "לפי תאריך / מאורע מסוים - חד פעמי", "אחר - פרט"];
const DAYS = ["יום ראשון", "יום שני", "יום שלישי", "יום רביעי", "יום חמישי", "יום שישי", "מוצאי שבת", "אחר - פרט"];
const HOURS = ["לפנות בוקר", "בוקר", "לפנה\"צ", "אחה\"צ", "לילה", "בתיאום", "אחר - פרט"];
const PAYMENT_OPTIONS = ["לא מעוניינים לשלם כלום", "תשלום מזדמן לא קבוע", "תשלום על נסיעות", "שכר קבוע", "תשלום על כל שיעור", "אחר - פרט"];

const RequestLesson = () => {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  // Contact
  const [forWho, setForWho] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactLocation, setContactLocation] = useState("");
  const [needsReligiousServices, setNeedsReligiousServices] = useState("");

  // Synagogue
  const [numWorshippers, setNumWorshippers] = useState("");
  const [nusach, setNusach] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [partialDetail, setPartialDetail] = useState("");
  const [hasCurrentLessons, setHasCurrentLessons] = useState("");
  const [needsOtherServices, setNeedsOtherServices] = useState("");

  // Questionnaire routing
  const [wantsQuestionnaire, setWantsQuestionnaire] = useState("");

  // Matching
  const [gender, setGender] = useState("");
  const [language, setLanguage] = useState("");
  const [audienceType, setAudienceType] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [rabbiBackground, setRabbiBackground] = useState("");
  const [lessonStyle, setLessonStyle] = useState<string[]>([]);
  const [speakingStyle, setSpeakingStyle] = useState("");
  const [lessonLocation, setLessonLocation] = useState<string[]>([]);

  // Schedule
  const [frequency, setFrequency] = useState("");
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [availableHours, setAvailableHours] = useState<string[]>([]);

  // Payment & Address
  const [payment, setPayment] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressNeighborhood, setAddressNeighborhood] = useState("");
  const [addressStreet, setAddressStreet] = useState("");

  const toggleArray = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];

  const autoAdvance = useCallback((nextStep: number) => {
    setTimeout(() => {
      setStep(nextStep);
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
  }, []);

  const SUBMIT_STEP = 17;

  const handleSubmit = async () => {
    if (!contactName.trim() || !contactPhone.trim()) {
      toast.error("נא למלא שם וטלפון");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("seeker_leads").insert({
      contact_name: contactName,
      phone: contactPhone, email: contactEmail,
      city: addressCity,
      subject: subjects.join(", "),
      lesson_type: frequency,
      audience_type: forWho,
      preferred_time: `ימים: ${availableDays.join(",")}, שעות: ${availableHours.join(",")}`,
      notes: `עבור: ${forWho}, מיקום: ${contactLocation}, שירותי דת: ${needsReligiousServices}, מתפללים: ${numWorshippers}, נוסח: ${nusach}, פעילות: ${activityLevel} ${partialDetail}, שיעורים קיימים: ${hasCurrentLessons}, שירותים נוספים: ${needsOtherServices}, מגדר: ${gender}, שפה: ${language}, קהל: ${audienceType.join(",")}, רקע רב: ${rabbiBackground}, סגנון שיעור: ${lessonStyle.join(",")}, סגנון דיבור: ${speakingStyle}, מיקום שיעור: ${lessonLocation.join(",")}, תשלום: ${payment}, כתובת: ${addressCity} ${addressNeighborhood} ${addressStreet}`,
    });
    setSubmitting(false);
    if (error) toast.error("שגיאה בשליחה, נסו שוב");
    else { setSubmitted(true); toast.success("הבקשה נשלחה בהצלחה! 🎉"); }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-28 container mx-auto px-6 text-center py-20">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="w-24 h-24 rounded-full bg-gradient-gold mx-auto mb-6 flex items-center justify-center shadow-lg glow-gold">
              <CheckCircle className="w-12 h-12 text-primary-foreground" />
            </div>
            <h2 className="font-display text-3xl font-bold text-foreground mb-3">הבקשה נשלחה!</h2>
            <p className="font-body text-muted-foreground mb-6">ניצור אתכם קשר בהקדם להתאמה מושלמת</p>
            <Button variant="outline" onClick={() => window.location.reload()}>בקשה נוספת</Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-28 pb-20 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-gold/6 rounded-full blur-[150px]" />
        </div>
        <div className="relative z-10 container mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gold/15 border border-gold/25 text-secondary text-sm font-body mb-6">
              <PlusCircle className="w-4 h-4" />
              רישום לבקשת מגיד שיעור
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-black text-foreground mb-4">
              בקשו <span className="text-gradient-gold">מגיד שיעור</span>
            </h1>
          </motion.div>

          <div className="max-w-2xl mx-auto" ref={formRef}>
            <div className="bg-card rounded-3xl border-2 border-gold/20 shadow-elegant p-8 md:p-10">

              {/* Step 0: For who */}
              <ProgressiveFormStep visible={step === 0} stepIndex={0} showSkip={false} showBack={false}>
                <ChipSelect label="עבור מי אתם מעוניינים לקבוע שיעור?" icon={<Users className="w-4 h-4 text-gold" />} options={FOR_WHO} selected={forWho}
                  onSelect={(v) => { setForWho(v); autoAdvance(1); }} />
              </ProgressiveFormStep>

              {/* Step 1: Contact details */}
              <ProgressiveFormStep visible={step === 1} stepIndex={1} showSkip={false} showBack onBack={() => setStep(0)}>
                <div className="space-y-3">
                  <label className="font-display text-sm font-bold text-card-foreground flex items-center gap-2"><Phone className="w-4 h-4 text-gold" /> איש קשר</label>
                  <div className="grid grid-cols-2 gap-3">
                    <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="טלפון *" />
                    <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="שם *" />
                  </div>
                  <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="מייל" type="email" />
                  <Input value={contactLocation} onChange={(e) => setContactLocation(e.target.value)} placeholder="מיקום מדויק" />
                  <ChipSelect label="האם אתם צריכים עזרה בשירותי דת למשפחה?" options={["לא", "כן"]} selected={needsReligiousServices}
                    onSelect={(v) => setNeedsReligiousServices(v)} />
                  <Button size="sm" className="bg-gradient-gold text-primary-foreground font-body hover:opacity-90" onClick={() => {
                    if (!contactName.trim() || !contactPhone.trim()) { toast.error("נא למלא שם וטלפון"); return; }
                    autoAdvance(2);
                  }}>המשך ←</Button>
                </div>
              </ProgressiveFormStep>

              {/* Step 2: Synagogue details */}
              <ProgressiveFormStep visible={step === 2} stepIndex={2} showSkip showBack onSkip={() => autoAdvance(3)} onBack={() => setStep(1)}>
                <div className="space-y-3">
                  <label className="font-display text-sm font-bold text-card-foreground flex items-center gap-2"><Building2 className="w-4 h-4 text-gold" /> פרטי בית הכנסת</label>
                  <div className="grid grid-cols-2 gap-3">
                    <Input value={numWorshippers} onChange={(e) => setNumWorshippers(e.target.value)} placeholder="כמות מתפללים" />
                    <Input value={nusach} onChange={(e) => setNusach(e.target.value)} placeholder="נוסח בית הכנסת" />
                  </div>
                  <ChipSelect label="רמת הפעילות ביום" options={ACTIVITY_LEVELS} selected={activityLevel}
                    onSelect={setActivityLevel} />
                  {activityLevel === "פעילות חלקית ביום חול" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                      <Input value={partialDetail} onChange={(e) => setPartialDetail(e.target.value)} placeholder="פרט..." />
                    </motion.div>
                  )}
                  <ChipSelect label="האם מתקיימים ביום שיעורים?" options={["לא", "כן"]} selected={hasCurrentLessons} onSelect={setHasCurrentLessons} />
                  <ChipSelect label="האם יש צורך בעוד שירותי דת (רב/חזן/ש״ץ)?" options={["לא", "כן"]} selected={needsOtherServices} onSelect={setNeedsOtherServices} />
                  <Button size="sm" className="bg-gradient-gold text-primary-foreground font-body hover:opacity-90" onClick={() => autoAdvance(3)}>המשך ←</Button>
                </div>
              </ProgressiveFormStep>

              {/* Step 3: Questionnaire routing */}
              <ProgressiveFormStep visible={step === 3} stepIndex={3} showSkip={false} showBack onBack={() => setStep(2)}>
                <div className="space-y-3">
                  <p className="font-body text-sm text-foreground">יש לנו כמה שאלות שיכולות לעזור לנו להתאים את מגיד השיעור המתאים ביותר. האם תרצו לענות עליהם עכשיו?</p>
                  <ChipSelect label="" options={["מעוניין שיצרו איתי קשר", "כן"]} selected={wantsQuestionnaire}
                    onSelect={(v) => {
                      setWantsQuestionnaire(v);
                      if (v === "כן") autoAdvance(4);
                      else autoAdvance(SUBMIT_STEP);
                    }} />
                </div>
              </ProgressiveFormStep>

              {/* Step 4: Gender */}
              <ProgressiveFormStep visible={step === 4} stepIndex={4} showSkip showBack onSkip={() => autoAdvance(5)} onBack={() => setStep(3)}>
                <ChipSelect label="למי מיועד השיעור?" icon={<Users className="w-4 h-4 text-gold" />} options={GENDER} selected={gender}
                  onSelect={(v) => { setGender(v); autoAdvance(5); }} />
              </ProgressiveFormStep>

              {/* Step 5: Language */}
              <ProgressiveFormStep visible={step === 5} stepIndex={5} showSkip showBack onSkip={() => autoAdvance(6)} onBack={() => setStep(4)}>
                <ChipSelect label="באיזו שפה יימסר השיעור?" icon={<Globe className="w-4 h-4 text-gold" />} options={LANGUAGES} selected={language}
                  onSelect={(v) => { setLanguage(v); autoAdvance(6); }} />
              </ProgressiveFormStep>

              {/* Step 6: Audience style (multi) */}
              <ProgressiveFormStep visible={step === 6} stepIndex={6} showSkip showBack onSkip={() => autoAdvance(7)} onBack={() => setStep(5)}>
                <ChipSelect label="מה הסגנון של הלומדים?" icon={<Users className="w-4 h-4 text-gold" />} options={AUDIENCE_TYPES} selected={audienceType}
                  onSelect={(v) => setAudienceType(prev => toggleArray(prev, v))} multi />
                <Button size="sm" className="mt-3 bg-gradient-gold text-primary-foreground font-body hover:opacity-90" onClick={() => autoAdvance(7)}>המשך ←</Button>
              </ProgressiveFormStep>

              {/* Step 7: Subjects (multi) */}
              <ProgressiveFormStep visible={step === 7} stepIndex={7} showSkip showBack onSkip={() => autoAdvance(8)} onBack={() => setStep(6)}>
                <ChipSelect label="מה הנושאים ללימוד?" icon={<BookOpen className="w-4 h-4 text-gold" />} options={SUBJECTS} selected={subjects}
                  onSelect={(v) => setSubjects(prev => toggleArray(prev, v))} multi />
                <Button size="sm" className="mt-3 bg-gradient-gold text-primary-foreground font-body hover:opacity-90" onClick={() => autoAdvance(8)}>המשך ←</Button>
              </ProgressiveFormStep>

              {/* Step 8: Rabbi background */}
              <ProgressiveFormStep visible={step === 8} stepIndex={8} showSkip showBack onSkip={() => autoAdvance(9)} onBack={() => setStep(7)}>
                <ChipSelect label="מהו הרקע של מגיד שיעור המתאים?" options={RABBI_BACKGROUND} selected={rabbiBackground}
                  onSelect={(v) => { setRabbiBackground(v); autoAdvance(9); }} />
              </ProgressiveFormStep>

              {/* Step 9: Lesson style (multi) */}
              <ProgressiveFormStep visible={step === 9} stepIndex={9} showSkip showBack onSkip={() => autoAdvance(10)} onBack={() => setStep(8)}>
                <ChipSelect label="מה אופי השיעורים שמתאים לכם?" options={LESSON_STYLES} selected={lessonStyle}
                  onSelect={(v) => setLessonStyle(prev => toggleArray(prev, v))} multi />
                <Button size="sm" className="mt-3 bg-gradient-gold text-primary-foreground font-body hover:opacity-90" onClick={() => autoAdvance(10)}>המשך ←</Button>
              </ProgressiveFormStep>

              {/* Step 10: Speaking style */}
              <ProgressiveFormStep visible={step === 10} stepIndex={10} showSkip showBack onSkip={() => autoAdvance(11)} onBack={() => setStep(9)}>
                <ChipSelect label="מה אופי מגיד השיעור שמתאים לכם?" icon={<Palette className="w-4 h-4 text-gold" />} options={SPEAKING_STYLES} selected={speakingStyle}
                  onSelect={(v) => { setSpeakingStyle(v); autoAdvance(11); }} />
              </ProgressiveFormStep>

              {/* Step 11: Lesson location (multi) */}
              <ProgressiveFormStep visible={step === 11} stepIndex={11} showSkip showBack onSkip={() => autoAdvance(12)} onBack={() => setStep(10)}>
                <ChipSelect label="מיקום השיעור?" icon={<MapPin className="w-4 h-4 text-gold" />} options={LESSON_LOCATIONS} selected={lessonLocation}
                  onSelect={(v) => setLessonLocation(prev => toggleArray(prev, v))} multi />
                <Button size="sm" className="mt-3 bg-gradient-gold text-primary-foreground font-body hover:opacity-90" onClick={() => autoAdvance(12)}>המשך ←</Button>
              </ProgressiveFormStep>

              {/* Step 12: Frequency */}
              <ProgressiveFormStep visible={step === 12} stepIndex={12} showSkip showBack onSkip={() => autoAdvance(13)} onBack={() => setStep(11)}>
                <ChipSelect label="קביעות השיעור" icon={<Calendar className="w-4 h-4 text-gold" />} options={FREQUENCY} selected={frequency}
                  onSelect={(v) => { setFrequency(v); autoAdvance(13); }} />
              </ProgressiveFormStep>

              {/* Step 13: Days (multi) */}
              <ProgressiveFormStep visible={step === 13} stepIndex={13} showSkip showBack onSkip={() => autoAdvance(14)} onBack={() => setStep(12)}>
                <ChipSelect label="זמנים המתאימים לקביעת שיעור?" options={DAYS} selected={availableDays}
                  onSelect={(v) => setAvailableDays(prev => toggleArray(prev, v))} multi />
                <Button size="sm" className="mt-3 bg-gradient-gold text-primary-foreground font-body hover:opacity-90" onClick={() => autoAdvance(14)}>המשך ←</Button>
              </ProgressiveFormStep>

              {/* Step 14: Hours (multi) */}
              <ProgressiveFormStep visible={step === 14} stepIndex={14} showSkip showBack onSkip={() => autoAdvance(15)} onBack={() => setStep(13)}>
                <ChipSelect label="שעות מתאימות למסירת שיעורים?" options={HOURS} selected={availableHours}
                  onSelect={(v) => setAvailableHours(prev => toggleArray(prev, v))} multi />
                <Button size="sm" className="mt-3 bg-gradient-gold text-primary-foreground font-body hover:opacity-90" onClick={() => autoAdvance(15)}>המשך ←</Button>
              </ProgressiveFormStep>

              {/* Step 15: Payment */}
              <ProgressiveFormStep visible={step === 15} stepIndex={15} showSkip showBack onSkip={() => autoAdvance(16)} onBack={() => setStep(14)}>
                <ChipSelect label="כמה אתם מעוניינים לשלם?" icon={<CreditCard className="w-4 h-4 text-gold" />} options={PAYMENT_OPTIONS} selected={payment}
                  onSelect={(v) => { setPayment(v); autoAdvance(16); }} />
              </ProgressiveFormStep>

              {/* Step 16: Address */}
              <ProgressiveFormStep visible={step === 16} stepIndex={16} showSkip={false} showBack onBack={() => setStep(15)}>
                <div className="space-y-3">
                  <label className="font-display text-sm font-bold text-card-foreground flex items-center gap-2"><MapPin className="w-4 h-4 text-gold" /> כתובת השיעור</label>
                  <Input value={addressCity} onChange={(e) => setAddressCity(e.target.value)} placeholder="עיר *" />
                  <Input value={addressNeighborhood} onChange={(e) => setAddressNeighborhood(e.target.value)} placeholder="שכונה" />
                  <Input value={addressStreet} onChange={(e) => setAddressStreet(e.target.value)} placeholder="רחוב *" />
                  <Button size="sm" className="bg-gradient-gold text-primary-foreground font-body hover:opacity-90" onClick={() => {
                    if (!addressCity.trim() || !addressStreet.trim()) { toast.error("נא למלא עיר ורחוב"); return; }
                    autoAdvance(SUBMIT_STEP);
                  }}>המשך ←</Button>
                </div>
              </ProgressiveFormStep>

              {/* Step 17: Submit */}
              <AnimatePresence mode="wait">
                {step === SUBMIT_STEP && (
                  <motion.div key="submit-step" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }}
                    className="space-y-3 p-6 rounded-2xl bg-gradient-to-br from-gold/8 to-secondary/5 border-2 border-gold/20">
                    <p className="font-body text-sm text-foreground text-center">הכל מוכן! לחצו לשליחת הבקשה</p>
                    <motion.button onClick={handleSubmit} disabled={submitting}
                      whileHover={{ scale: 1.02, boxShadow: "0 0 40px -8px hsl(var(--gold) / 0.5)" }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-4 rounded-2xl bg-gradient-gold text-primary-foreground font-body font-bold text-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg glow-gold">
                      <Send className="w-5 h-5" />
                      {submitting ? "שולח..." : "שליחת הבקשה"}
                    </motion.button>
                    <button onClick={() => setStep(wantsQuestionnaire === "כן" ? 16 : 2)} className="text-xs text-gold hover:text-secondary font-body transition-colors">← חזרה</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default RequestLesson;
