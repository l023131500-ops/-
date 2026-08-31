import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, Users, Target, Heart, BookOpen,
  Sparkles, TrendingUp, MessageCircle, Award, Handshake, MapPin,
  CheckCircle, Send, Globe, Calendar, Car, CreditCard, UserCircle, Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import ChipSelect from "@/components/forms/ChipSelect";
import ProgressiveFormStep from "@/components/forms/ProgressiveFormStep";
import { useTenant } from "@/hooks/useTenant";

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
const LESSON_STYLES = [
  "לימוד משותף", "שיעור מתוך ספר", "לימוד מעמיק", "מסירת שיעור מוכן",
  "דרשות", "שאלות ותשובות", "אחר - פרט",
];
const SPEAKING_STYLES = [
  "שפה גבוהה ומשכילה", "מפולפל", "עמוק", "ענייני וממוקד", "שפה עשירה",
  "שפה פשוטה ועממית", "הומור", "מתובל בסיפורים והמחשות", "אחר - פרט",
];
const LOCATIONS = [
  "בתי כנסת", "שיעורים מאורגנים", "חוגי בית", "שיעורים קבועים",
  "אזכרות", "בתי אבלים", "אירועים שונים", "קורא בתורה", "פייטן",
  "ש\"ץ בימים נוראים", "תוקע בשופר", "אחר - פרט",
];
const DAYS = ["יום ראשון", "יום שני", "יום שלישי", "יום רביעי", "יום חמישי", "יום שישי", "מוצאי שבת", "אחר - פרט"];
const HOURS = ["לפנות בוקר", "בוקר", "לפנה\"צ", "אחה\"צ", "ערב", "לילה", "בתיאום", "אחר - פרט"];
const DISTANCE = ["גמיש לאפשרות למרחק", "מרחק נסיעה קצר", "רק באזור מגורי", "אחר - פרט"];
const TRANSPORT = ["הליכה רגלית", "אוטובוסים", "מוניות", "ברכב פרטי", "אחר - פרט"];
const PAYMENT = ["ללא דרישה – מה שירצו לתת", "תשלום על הנסיעות", "שכר קבוע", "לא מעוניין בתשלום כלל", "אחר - פרט"];
const MARITAL_STATUS = ["אלמן", "גרוש", "רווק", "נשוי", "אחר - פרט"];
const STATUS_OPTIONS = ["עובד ולומד", "עובד", "אברך", "אחר - פרט"];

const benefits = [
  { icon: Target, title: "התאמת קהל יעד", desc: "נמצא לך את הקהל שמחפש בדיוק את הסגנון שלך." },
  { icon: BookOpen, title: "פרסום במאגר הארצי", desc: "השיעורים שלך נגישים לאלפי מחפשים." },
  { icon: MessageCircle, title: "תיאום ללא עלות", desc: "מחברים מגידי שיעור לקהילות — בחינם." },
  { icon: Users, title: "קהל חדש", desc: "מחברים אותך עם לומדים שמתאימים לך." },
  { icon: Heart, title: "זיכוי הרבים", desc: "הצטרפו למפעל של הפצת תורה." },
  { icon: TrendingUp, title: "חשיפה ארצית", desc: "שיעוריך מופיעים בחיפוש החכם." },
  { icon: Award, title: "ליווי אישי", desc: "נעזור בתיאום והתאמה." },
  { icon: Handshake, title: "שותפות בתורה", desc: "קהילה של מגידי שיעור מכל הארץ." },
];

const TeachersLanding = () => {
  const { tenant } = useTenant();
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  // Personal
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [noEmail, setNoEmail] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [background, setBackground] = useState("");
  const [workStatus, setWorkStatus] = useState("");

  // Questionnaire routing
  const [wantsQuestionnaire, setWantsQuestionnaire] = useState<string>("");

  // Matching
  const [subjects, setSubjects] = useState<string[]>([]);
  const [gender, setGender] = useState("");
  const [language, setLanguage] = useState("");
  const [publicSpeaking, setPublicSpeaking] = useState("");
  const [audienceType, setAudienceType] = useState<string[]>([]);
  const [lessonStyle, setLessonStyle] = useState<string[]>([]);
  const [speakingStyle, setSpeakingStyle] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  // Schedule
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [availableHours, setAvailableHours] = useState<string[]>([]);
  const [distance, setDistance] = useState("");
  const [transport, setTransport] = useState("");
  const [payment, setPayment] = useState("");

  // Recommendations
  const [rec1Title, setRec1Title] = useState("");
  const [rec1Name, setRec1Name] = useState("");
  const [rec1Phone, setRec1Phone] = useState("");
  const [rec2Title, setRec2Title] = useState("");
  const [rec2Name, setRec2Name] = useState("");
  const [rec2Phone, setRec2Phone] = useState("");

  const toggleArray = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];

  const autoAdvance = useCallback((nextStep: number) => {
    setTimeout(() => {
      setStep(nextStep);
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 300);
  }, []);

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      toast.error("נא למלא שם פרטי, שם משפחה וטלפון");
      return;
    }
    if (!noEmail && !email.trim()) {
      toast.error("נא למלא מייל או לסמן 'אין לי מייל'");
      return;
    }
    if (!tenant) {
      toast.error("שגיאה בטעינת המערכת, נסו לרענן את הדף");
      return;
    }
    setSubmitting(true);
    // `teacher_leads` never existed in the DB (every submit 42P01'd, silently
    // swallowed by the catch below). The real, live target for "become a
    // teacher" leads is `leads` with kind="teacher_offer" — see
    // JoinTeacher.tsx and FloatingChatBot.tsx's submit_teacher branch, and
    // admin/Leads.tsx + admin/LeadsGuru.tsx which already read+render it.
    const { error } = await supabase.from("leads").insert({
      tenant_id: tenant.id,
      kind: "teacher_offer",
      full_name: `${firstName} ${lastName}`,
      phone, email: noEmail ? "" : email,
      source: "teachers-landing",
      raw_data: {
        subjects, background, workStatus, maritalStatus, birthDate,
        language, gender, publicSpeaking, audienceType, lessonStyle, speakingStyle,
        locations, availableDays, availableHours, distance, transport, payment,
        rec1: { title: rec1Title, name: rec1Name, phone: rec1Phone },
        rec2: { title: rec2Title, name: rec2Name, phone: rec2Phone },
      },
    });
    setSubmitting(false);
    if (error) toast.error("שגיאה בשליחה");
    else { setSubmitted(true); toast.success("נרשמתם בהצלחה! 🎉"); }
  };

  // Steps: 0=personal, 1=questionnaire routing, 2=subjects, 3=gender, 4=language, 5=publicSpeaking, 6=audienceType, 7=lessonStyle, 8=speakingStyle, 9=locations, 10=days, 11=hours, 12=distance, 13=transport, 14=payment, 15=recommendations

  const SKIP_TO_SUBMIT = 15;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-28 pb-16 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gold/5 rounded-full blur-[120px] animate-glow-pulse" />
        </div>
        <div className="relative z-10 container mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gold/10 border border-gold/20 text-secondary text-sm font-body mb-8">
              <Mic className="w-4 h-4" />
              למגידי שיעור
            </div>
            <h1 className="font-display text-5xl md:text-7xl font-black text-foreground mb-6">
              זכו את הרבים
              <br />
              <span className="text-gradient-gold">הצטרפו כמגיד שיעור</span>
            </h1>
            <p className="font-body text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
              הצטרפו לאיגוד השיעורים — נחבר אתכם עם קהילות ולומדים. ללא עלות, לזיכוי הרבים.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-16 bg-card/30">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {benefits.map((b, i) => (
              <motion.div key={b.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.06 }} whileHover={{ y: -5 }}
                className="group bg-card rounded-2xl p-6 border border-gold/15 hover:border-gold/40 transition-all">
                <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <b.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-display text-base font-bold text-foreground mb-1">{b.title}</h3>
                <p className="font-body text-sm text-muted-foreground">{b.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mt-12">
            <motion.button onClick={() => setShowForm(true)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="px-10 py-5 rounded-2xl bg-gradient-gold text-primary-foreground font-body font-bold text-xl shadow-elegant glow-gold">
              <span className="flex items-center gap-3"><Sparkles className="w-6 h-6" /> רוצה להצטרף — מלאו פרטים</span>
            </motion.button>
          </motion.div>
        </div>
      </section>

      {showForm && !submitted && (
        <section className="py-16" ref={formRef}>
          <div className="container mx-auto px-6">
            <div className="max-w-2xl mx-auto bg-card rounded-3xl border-2 border-gold/20 shadow-elegant p-8 md:p-10">
              <h2 className="font-display text-2xl font-black text-foreground mb-6 text-center">
                טופס הרשמה ל<span className="text-gradient-gold">מרצים / מגידי שיעור</span>
              </h2>

              {/* Step 0: Personal Details */}
              <ProgressiveFormStep visible={step === 0} stepIndex={0} showSkip={false} showBack={false}>
                <div className="space-y-3">
                  <label className="font-display text-sm font-bold text-card-foreground flex items-center gap-2"><UserCircle className="w-4 h-4 text-gold" /> פרטים אישיים</label>
                  <div className="grid grid-cols-2 gap-3">
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="שם משפחה *" />
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="שם פרטי *" />
                  </div>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="טלפון *" />
                  <div className="flex items-center gap-2">
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="מייל *" type="email" disabled={noEmail} className={noEmail ? "opacity-50" : ""} />
                    <label className="flex items-center gap-1.5 font-body text-xs text-muted-foreground whitespace-nowrap">
                      <Checkbox checked={noEmail} onCheckedChange={(c) => setNoEmail(!!c)} />
                      אין לי מייל
                    </label>
                  </div>
                  <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} placeholder="ת. לידה" />
                  <ChipSelect label="מצב אישי" options={MARITAL_STATUS} selected={maritalStatus} onSelect={setMaritalStatus} />
                  <Input value={background} onChange={(e) => setBackground(e.target.value)} placeholder="רקע / מקום לימודים בעבר" />
                  <ChipSelect label="סטטוס" options={STATUS_OPTIONS} selected={workStatus} onSelect={setWorkStatus} />
                  <Button size="sm" className="bg-gradient-gold text-primary-foreground font-body hover:opacity-90" onClick={() => {
                    if (!firstName.trim() || !lastName.trim() || !phone.trim()) { toast.error("נא למלא שם וטלפון"); return; }
                    if (!noEmail && !email.trim()) { toast.error("נא למלא מייל"); return; }
                    autoAdvance(1);
                  }}>המשך ←</Button>
                </div>
              </ProgressiveFormStep>

              {/* Step 1: Questionnaire routing */}
              <ProgressiveFormStep visible={step === 1} stepIndex={1} showSkip={false} showBack onBack={() => setStep(0)}>
                <div className="space-y-3">
                  <p className="font-body text-sm text-foreground">יש לנו כמה שאלות שיכולות להתאים שיעור שמתאים לך. האם תרצה למלאות את השאלון עכשיו?</p>
                  <ChipSelect label="" options={["מעוניין שיצרו איתי קשר", "כן"]} selected={wantsQuestionnaire}
                    onSelect={(v) => {
                      setWantsQuestionnaire(v);
                      if (v === "כן") autoAdvance(2);
                      else autoAdvance(SKIP_TO_SUBMIT);
                    }} />
                </div>
              </ProgressiveFormStep>

              {/* Step 2: Subjects (multi) */}
              <ProgressiveFormStep visible={step === 2} stepIndex={2} showSkip showBack onSkip={() => autoAdvance(3)} onBack={() => setStep(1)}>
                <ChipSelect label="נושאים שאתה מתמצא בהם" icon={<BookOpen className="w-4 h-4 text-gold" />} options={SUBJECTS} selected={subjects}
                  onSelect={(v) => setSubjects(prev => toggleArray(prev, v))} multi />
                <Button size="sm" className="mt-3 bg-gradient-gold text-primary-foreground font-body hover:opacity-90" onClick={() => autoAdvance(3)}>המשך ←</Button>
              </ProgressiveFormStep>

              {/* Step 3: Gender */}
              <ProgressiveFormStep visible={step === 3} stepIndex={3} showSkip showBack onSkip={() => autoAdvance(4)} onBack={() => setStep(2)}>
                <ChipSelect label="למי מיועד השיעור?" icon={<Users className="w-4 h-4 text-gold" />} options={GENDER} selected={gender}
                  onSelect={(v) => { setGender(v); autoAdvance(4); }} />
              </ProgressiveFormStep>

              {/* Step 4: Language */}
              <ProgressiveFormStep visible={step === 4} stepIndex={4} showSkip showBack onSkip={() => autoAdvance(5)} onBack={() => setStep(3)}>
                <ChipSelect label="באיזו שפה נמסר השיעור?" icon={<Globe className="w-4 h-4 text-gold" />} options={LANGUAGES} selected={language}
                  onSelect={(v) => { setLanguage(v); autoAdvance(5); }} />
              </ProgressiveFormStep>

              {/* Step 5: Public Speaking */}
              <ProgressiveFormStep visible={step === 5} stepIndex={5} showSkip showBack onSkip={() => autoAdvance(6)} onBack={() => setStep(4)}>
                <ChipSelect label="האם יש לך ניסיון לדבר בציבור?" options={["לא", "כן"]} selected={publicSpeaking}
                  onSelect={(v) => { setPublicSpeaking(v); autoAdvance(6); }} />
              </ProgressiveFormStep>

              {/* Step 6: Audience Type (multi) */}
              <ProgressiveFormStep visible={step === 6} stepIndex={6} showSkip showBack onSkip={() => autoAdvance(7)} onBack={() => setStep(5)}>
                <ChipSelect label="מה הסגנון של קהל היעד שמתאים לך?" icon={<Users className="w-4 h-4 text-gold" />} options={AUDIENCE_TYPES} selected={audienceType}
                  onSelect={(v) => setAudienceType(prev => toggleArray(prev, v))} multi />
                <Button size="sm" className="mt-3 bg-gradient-gold text-primary-foreground font-body hover:opacity-90" onClick={() => autoAdvance(7)}>המשך ←</Button>
              </ProgressiveFormStep>

              {/* Step 7: Lesson Style (multi) */}
              <ProgressiveFormStep visible={step === 7} stepIndex={7} showSkip showBack onSkip={() => autoAdvance(8)} onBack={() => setStep(6)}>
                <ChipSelect label="מה אופי השיעורים שאתה רגיל למסור?" options={LESSON_STYLES} selected={lessonStyle}
                  onSelect={(v) => setLessonStyle(prev => toggleArray(prev, v))} multi />
                <Button size="sm" className="mt-3 bg-gradient-gold text-primary-foreground font-body hover:opacity-90" onClick={() => autoAdvance(8)}>המשך ←</Button>
              </ProgressiveFormStep>

              {/* Step 8: Speaking Style (multi) */}
              <ProgressiveFormStep visible={step === 8} stepIndex={8} showSkip showBack onSkip={() => autoAdvance(9)} onBack={() => setStep(7)}>
                <ChipSelect label="מה סגנון הדיבור שלך?" options={SPEAKING_STYLES} selected={speakingStyle}
                  onSelect={(v) => setSpeakingStyle(prev => toggleArray(prev, v))} multi />
                <Button size="sm" className="mt-3 bg-gradient-gold text-primary-foreground font-body hover:opacity-90" onClick={() => autoAdvance(9)}>המשך ←</Button>
              </ProgressiveFormStep>

              {/* Step 9: Locations (multi) */}
              <ProgressiveFormStep visible={step === 9} stepIndex={9} showSkip showBack onSkip={() => autoAdvance(10)} onBack={() => setStep(8)}>
                <ChipSelect label="מקומות שמתאים לך למסור שיעורים?" icon={<MapPin className="w-4 h-4 text-gold" />} options={LOCATIONS} selected={locations}
                  onSelect={(v) => setLocations(prev => toggleArray(prev, v))} multi />
                <Button size="sm" className="mt-3 bg-gradient-gold text-primary-foreground font-body hover:opacity-90" onClick={() => autoAdvance(10)}>המשך ←</Button>
              </ProgressiveFormStep>

              {/* Step 10: Days (multi) */}
              <ProgressiveFormStep visible={step === 10} stepIndex={10} showSkip showBack onSkip={() => autoAdvance(11)} onBack={() => setStep(9)}>
                <ChipSelect label="מה הזמנים המתאימים לך?" icon={<Calendar className="w-4 h-4 text-gold" />} options={DAYS} selected={availableDays}
                  onSelect={(v) => setAvailableDays(prev => toggleArray(prev, v))} multi />
                <Button size="sm" className="mt-3 bg-gradient-gold text-primary-foreground font-body hover:opacity-90" onClick={() => autoAdvance(11)}>המשך ←</Button>
              </ProgressiveFormStep>

              {/* Step 11: Hours (multi) */}
              <ProgressiveFormStep visible={step === 11} stepIndex={11} showSkip showBack onSkip={() => autoAdvance(12)} onBack={() => setStep(10)}>
                <ChipSelect label="שעות מתאימות למסירת שיעורים?" options={HOURS} selected={availableHours}
                  onSelect={(v) => setAvailableHours(prev => toggleArray(prev, v))} multi />
                <Button size="sm" className="mt-3 bg-gradient-gold text-primary-foreground font-body hover:opacity-90" onClick={() => autoAdvance(12)}>המשך ←</Button>
              </ProgressiveFormStep>

              {/* Step 12: Distance */}
              <ProgressiveFormStep visible={step === 12} stepIndex={12} showSkip showBack onSkip={() => autoAdvance(13)} onBack={() => setStep(11)}>
                <ChipSelect label="היכן אתה מעוניין למסור את השיעורים?" options={DISTANCE} selected={distance}
                  onSelect={(v) => { setDistance(v); autoAdvance(13); }} />
              </ProgressiveFormStep>

              {/* Step 13: Transport */}
              <ProgressiveFormStep visible={step === 13} stepIndex={13} showSkip showBack onSkip={() => autoAdvance(14)} onBack={() => setStep(12)}>
                <ChipSelect label="איך אתה רגיל להתנייד?" icon={<Car className="w-4 h-4 text-gold" />} options={TRANSPORT} selected={transport}
                  onSelect={(v) => { setTransport(v); autoAdvance(14); }} />
              </ProgressiveFormStep>

              {/* Step 14: Payment */}
              <ProgressiveFormStep visible={step === 14} stepIndex={14} showSkip showBack onSkip={() => autoAdvance(15)} onBack={() => setStep(13)}>
                <ChipSelect label="מה התגמול שהיית מצפה לקבל?" icon={<CreditCard className="w-4 h-4 text-gold" />} options={PAYMENT} selected={payment}
                  onSelect={(v) => { setPayment(v); autoAdvance(15); }} />
              </ProgressiveFormStep>

              {/* Step 15: Recommendations & Submit */}
              <AnimatePresence mode="wait">
                {step === SKIP_TO_SUBMIT && (
                  <motion.div key="submit-step" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }}
                    className="space-y-4 p-6 rounded-2xl bg-gradient-to-br from-gold/8 to-secondary/5 border-2 border-gold/20">
                    <label className="font-display text-sm font-bold text-card-foreground block">רבנים ממליצים</label>
                    <p className="font-body text-xs text-muted-foreground">רב ממליץ 1</p>
                    <div className="grid grid-cols-3 gap-3">
                      <Input value={rec1Title} onChange={(e) => setRec1Title(e.target.value)} placeholder="תפקיד" />
                      <Input value={rec1Name} onChange={(e) => setRec1Name(e.target.value)} placeholder="שם" />
                      <Input value={rec1Phone} onChange={(e) => setRec1Phone(e.target.value)} placeholder="טלפון" />
                    </div>
                    <p className="font-body text-xs text-muted-foreground">רב ממליץ 2</p>
                    <div className="grid grid-cols-3 gap-3">
                      <Input value={rec2Title} onChange={(e) => setRec2Title(e.target.value)} placeholder="תפקיד" />
                      <Input value={rec2Name} onChange={(e) => setRec2Name(e.target.value)} placeholder="שם" />
                      <Input value={rec2Phone} onChange={(e) => setRec2Phone(e.target.value)} placeholder="טלפון" />
                    </div>
                    <motion.button onClick={handleSubmit} disabled={submitting}
                      whileHover={{ scale: 1.02, boxShadow: "0 0 40px -8px hsl(var(--gold) / 0.5)" }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-4 rounded-2xl bg-gradient-gold text-primary-foreground font-body font-bold text-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-3 mt-4 shadow-lg glow-gold">
                      <Send className="w-5 h-5" />
                      {submitting ? "שולח..." : "שליחת הרשמה"}
                    </motion.button>
                    <button onClick={() => setStep(wantsQuestionnaire === "כן" ? 14 : 0)} className="text-xs text-gold hover:text-secondary font-body transition-colors">← חזרה</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>
      )}

      {submitted && (
        <section className="py-16">
          <div className="container mx-auto px-6 text-center">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="w-24 h-24 rounded-full bg-gradient-gold mx-auto mb-6 flex items-center justify-center glow-gold">
                <CheckCircle className="w-12 h-12 text-primary-foreground" />
              </div>
              <h2 className="font-display text-3xl font-bold text-foreground mb-3">נרשמתם בהצלחה!</h2>
              <p className="font-body text-muted-foreground">ניצור אתכם קשר בהקדם</p>
            </motion.div>
          </div>
        </section>
      )}
    </div>
  );
};

export default TeachersLanding;
