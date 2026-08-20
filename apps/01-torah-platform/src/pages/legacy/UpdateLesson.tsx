import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, CheckCircle, Plus, Trash2, Image, Upload, Globe, Users, BookOpen, MapPin, UserCircle, Calendar, Video, Phone, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
const LESSON_STYLES = [
  "לימוד משותף", "שיעור מתוך ספר", "לימוד מעמיק", "מסירת שיעור מוכן",
  "פנינים ודרשות קצרות", "הלכות", "שאלות ותשובות", "אחר - פרט",
];
const SPEAKING_STYLES = [
  "שפה גבוהה ומשכילה", "מפולפל", "עמוק", "ענייני וממוקד", "שפה עשירה",
  "שפה פשוטה ועממית", "הומור", "מתובל בסיפורים והמחשות", "אחר - פרט",
];
const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

interface ScheduleDay { day: string; time: string; }

const UpdateLesson = () => {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const [rabbiName, setRabbiName] = useState("");
  const [subject, setSubject] = useState<string[]>([]);
  const [gender, setGender] = useState("");
  const [language, setLanguage] = useState("");
  const [audienceType, setAudienceType] = useState<string[]>([]);
  const [synagogueName, setSynagogueName] = useState("");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [street, setStreet] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [updateType, setUpdateType] = useState(""); // שיעור בתאריך מסוים / שיעור קבוע
  const [specificDate, setSpecificDate] = useState("");
  const [specificTime, setSpecificTime] = useState("");
  const [scheduleDays, setScheduleDays] = useState<ScheduleDay[]>([]);
  const [isRecorded, setIsRecorded] = useState(false);
  const [recordingDetail, setRecordingDetail] = useState("");
  const [isLiveStream, setIsLiveStream] = useState(false);
  const [liveStreamDetail, setLiveStreamDetail] = useState("");
  const [lessonStyle, setLessonStyle] = useState<string[]>([]);
  const [speakingStyle, setSpeakingStyle] = useState("");
  const [updateNotes, setUpdateNotes] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [orgName, setOrgName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");

  const autoAdvance = useCallback((nextStep: number) => {
    setTimeout(() => {
      setStep(nextStep);
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
  }, []);

  const toggleArray = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("הקובץ גדול מדי (מקסימום 2MB)"); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const uploadLogo = async (): Promise<string> => {
    if (!logoFile) return "";
    const ext = logoFile.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("lesson-logos").upload(path, logoFile);
    if (error) { console.error(error); return ""; }
    const { data } = supabase.storage.from("lesson-logos").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!rabbiName.trim() || !city.trim()) {
      toast.error("נא למלא שם הרב ועיר");
      return;
    }
    setSubmitting(true);
    let logoUrl = "";
    if (logoFile) logoUrl = await uploadLogo();

    const { error } = await supabase.from("lessons").insert([{
      rabbi_name: rabbiName,
      subject: subject.join(", "),
      target_audience: [gender],
      language,
      audience_type: audienceType,
      lesson_style: lessonStyle.join(", "),
      synagogue_name: synagogueName,
      city, neighborhood, street, street_number: streetNumber,
      is_recurring: updateType === "שיעור קבוע",
      specific_date: specificDate || null,
      schedule_days: scheduleDays as unknown as any,
      is_recorded: isRecorded, recording_location: recordingDetail,
      is_live_stream: isLiveStream,
      submitter_notes: `${speakingStyle ? `סגנון דיבור: ${speakingStyle}. ` : ""}${updateNotes}`,
      contact_name: contactName, contact_phone: contactPhone, contact_email: contactEmail,
      logo_url: logoUrl,
    }]);
    setSubmitting(false);
    if (error) toast.error("שגיאה בשליחה, נסו שוב");
    else { setSubmitted(true); toast.success("השיעור נשלח לאישור! 🎉"); }
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
            <h2 className="font-display text-3xl font-bold text-foreground mb-3">השיעור נשלח לאישור!</h2>
            <p className="font-body text-muted-foreground mb-6">לאחר אישור, השיעור יופיע באתר</p>
            <Button variant="outline" onClick={() => window.location.reload()}>עדכון שיעור נוסף</Button>
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
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-gold/6 rounded-full blur-[150px]" />
        </div>
        <div className="relative z-10 container mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gold/15 border border-gold/25 text-secondary text-sm font-body mb-6">
              <RefreshCw className="w-4 h-4" />
              עדכון שיעור קיים לפרסום
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-black text-foreground mb-4">
              עדכנו <span className="text-gradient-gold">שיעור קיים</span>
            </h1>
          </motion.div>

          <div className="max-w-2xl mx-auto" ref={formRef}>
            <div className="bg-card rounded-3xl border-2 border-gold/20 shadow-elegant p-8 md:p-10">

              {/* Step 0: Rabbi Name */}
              <ProgressiveFormStep visible={step === 0} stepIndex={0} showSkip={false} showBack={false}>
                <div className="space-y-3">
                  <label className="font-display text-sm font-bold text-card-foreground flex items-center gap-2">
                    <UserCircle className="w-4 h-4 text-gold" /> שם הרב / הרבנית
                  </label>
                  <Input value={rabbiName} onChange={(e) => setRabbiName(e.target.value)} placeholder="שם מלא *" />
                  <Button size="sm" className="bg-gradient-gold text-primary-foreground font-body hover:opacity-90" onClick={() => { if (rabbiName.trim()) autoAdvance(1); else toast.error("נא למלא שם"); }}>המשך ←</Button>
                </div>
              </ProgressiveFormStep>

              {/* Step 1: Subject (multi) */}
              <ProgressiveFormStep visible={step === 1} stepIndex={1} showSkip showBack onSkip={() => autoAdvance(2)} onBack={() => setStep(0)}>
                <ChipSelect label="נושא השיעור" icon={<BookOpen className="w-4 h-4 text-gold" />} options={SUBJECTS} selected={subject}
                  onSelect={(v) => setSubject(prev => toggleArray(prev, v))} multi />
                <Button size="sm" className="mt-3 bg-gradient-gold text-primary-foreground font-body hover:opacity-90" onClick={() => autoAdvance(2)}>המשך ←</Button>
              </ProgressiveFormStep>

              {/* Step 2: Gender */}
              <ProgressiveFormStep visible={step === 2} stepIndex={2} showSkip showBack onSkip={() => autoAdvance(3)} onBack={() => setStep(1)}>
                <ChipSelect label="למי מיועד השיעור?" icon={<Users className="w-4 h-4 text-gold" />} options={GENDER} selected={gender}
                  onSelect={(v) => { setGender(v); autoAdvance(3); }} />
              </ProgressiveFormStep>

              {/* Step 3: Language */}
              <ProgressiveFormStep visible={step === 3} stepIndex={3} showSkip showBack onSkip={() => autoAdvance(4)} onBack={() => setStep(2)}>
                <ChipSelect label="באיזו שפה נמסר השיעור?" icon={<Globe className="w-4 h-4 text-gold" />} options={LANGUAGES} selected={language}
                  onSelect={(v) => { setLanguage(v); autoAdvance(4); }} />
              </ProgressiveFormStep>

              {/* Step 4: Audience Type (multi) */}
              <ProgressiveFormStep visible={step === 4} stepIndex={4} showSkip showBack onSkip={() => autoAdvance(5)} onBack={() => setStep(3)}>
                <ChipSelect label="קהל יעד של השיעור" icon={<Users className="w-4 h-4 text-gold" />} options={AUDIENCE_TYPES} selected={audienceType}
                  onSelect={(v) => setAudienceType(prev => toggleArray(prev, v))} multi />
                <Button size="sm" className="mt-3 bg-gradient-gold text-primary-foreground font-body hover:opacity-90" onClick={() => autoAdvance(5)}>המשך ←</Button>
              </ProgressiveFormStep>

              {/* Step 5: Lesson Style (multi) */}
              <ProgressiveFormStep visible={step === 5} stepIndex={5} showSkip showBack onSkip={() => autoAdvance(6)} onBack={() => setStep(4)}>
                <ChipSelect label="מה אופי השיעור?" icon={<BookOpen className="w-4 h-4 text-gold" />} options={LESSON_STYLES} selected={lessonStyle}
                  onSelect={(v) => setLessonStyle(prev => toggleArray(prev, v))} multi />
                <Button size="sm" className="mt-3 bg-gradient-gold text-primary-foreground font-body hover:opacity-90" onClick={() => autoAdvance(6)}>המשך ←</Button>
              </ProgressiveFormStep>

              {/* Step 6: Speaking Style */}
              <ProgressiveFormStep visible={step === 6} stepIndex={6} showSkip showBack onSkip={() => autoAdvance(7)} onBack={() => setStep(5)}>
                <ChipSelect label="מה סגנון הדיבור של מגיד השיעור?" icon={<Palette className="w-4 h-4 text-gold" />} options={SPEAKING_STYLES} selected={speakingStyle}
                  onSelect={(v) => { setSpeakingStyle(v); autoAdvance(7); }} />
              </ProgressiveFormStep>

              {/* Step 7: Location */}
              <ProgressiveFormStep visible={step === 7} stepIndex={7} showSkip showBack onSkip={() => autoAdvance(8)} onBack={() => setStep(6)}>
                <div className="space-y-3">
                  <label className="font-display text-sm font-bold text-card-foreground flex items-center gap-2"><MapPin className="w-4 h-4 text-gold" /> מיקום</label>
                  <Input value={synagogueName} onChange={(e) => setSynagogueName(e.target.value)} placeholder="בית הכנסת / אולם וכדו'" />
                  <div className="grid grid-cols-2 gap-3">
                    <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="עיר *" />
                    <Input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="שכונה (לא חובה)" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="רחוב *" />
                    <Input value={streetNumber} onChange={(e) => setStreetNumber(e.target.value)} placeholder="מספר *" />
                  </div>
                  <Button size="sm" className="bg-gradient-gold text-primary-foreground font-body hover:opacity-90" onClick={() => autoAdvance(8)}>המשך ←</Button>
                </div>
              </ProgressiveFormStep>

              {/* Step 8: Update Type */}
              <ProgressiveFormStep visible={step === 8} stepIndex={8} showSkip showBack onSkip={() => autoAdvance(9)} onBack={() => setStep(7)}>
                <ChipSelect label="מה תרצו לעדכן?" options={["שיעור בתאריך מסוים", "שיעור קבוע"]} selected={updateType}
                  onSelect={(v) => { setUpdateType(v); autoAdvance(9); }} />
              </ProgressiveFormStep>

              {/* Step 9: Schedule based on type */}
              <ProgressiveFormStep visible={step === 9} stepIndex={9} showSkip showBack onSkip={() => autoAdvance(10)} onBack={() => setStep(8)}>
                <div className="space-y-3">
                  <label className="font-display text-sm font-bold text-card-foreground flex items-center gap-2"><Calendar className="w-4 h-4 text-gold" /> זמני השיעור</label>
                  {updateType === "שיעור בתאריך מסוים" ? (
                    <div className="grid grid-cols-2 gap-3">
                      <Input type="date" value={specificDate} onChange={(e) => setSpecificDate(e.target.value)} />
                      <Input type="time" value={specificTime} onChange={(e) => setSpecificTime(e.target.value)} placeholder="שעה" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="font-body text-xs text-muted-foreground">סמנו ימים והוסיפו שעה לכל יום</p>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {DAY_NAMES.map(day => {
                          const exists = scheduleDays.some(sd => sd.day === day);
                          return (
                            <motion.button key={day} type="button"
                              whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                              onClick={() => {
                                if (exists) setScheduleDays(scheduleDays.filter(sd => sd.day !== day));
                                else setScheduleDays([...scheduleDays, { day, time: "" }]);
                              }}
                              className={`px-4 py-2 rounded-xl font-body text-sm border-2 transition-all ${
                                exists ? "bg-gold/20 border-gold/50 text-secondary font-bold" : "bg-muted/40 border-gold/20 text-muted-foreground hover:border-gold/40"
                              }`}
                            >{day}</motion.button>
                          );
                        })}
                      </div>
                      {scheduleDays.map((sd, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="font-body text-sm text-foreground min-w-[60px]">{sd.day}:</span>
                          <Input value={sd.time} onChange={(e) => {
                            const days = [...scheduleDays];
                            days[idx] = { ...days[idx], time: e.target.value };
                            setScheduleDays(days);
                          }} placeholder="שעה (19:00)" type="time" className="w-32" />
                          <button onClick={() => setScheduleDays(scheduleDays.filter((_, i) => i !== idx))} className="text-destructive" aria-label="הסרת יום"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button size="sm" className="bg-gradient-gold text-primary-foreground font-body hover:opacity-90" onClick={() => autoAdvance(10)}>המשך ←</Button>
                </div>
              </ProgressiveFormStep>

              {/* Step 10: Broadcast */}
              <ProgressiveFormStep visible={step === 10} stepIndex={10} showSkip showBack onSkip={() => autoAdvance(11)} onBack={() => setStep(9)}>
                <div className="space-y-3">
                  <label className="font-display text-sm font-bold text-card-foreground flex items-center gap-2"><Video className="w-4 h-4 text-gold" /> אופן העברה</label>
                  <label className="flex items-center gap-2 font-body text-sm">
                    <Switch checked={isLiveStream} onCheckedChange={setIsLiveStream} /> שידור חי
                  </label>
                  {isLiveStream && <Input value={liveStreamDetail} onChange={(e) => setLiveStreamDetail(e.target.value)} placeholder="פרט..." />}
                  <label className="flex items-center gap-2 font-body text-sm">
                    <Switch checked={isRecorded} onCheckedChange={setIsRecorded} /> מוקלט
                  </label>
                  {isRecorded && <Input value={recordingDetail} onChange={(e) => setRecordingDetail(e.target.value)} placeholder="פרט..." />}
                  <Button size="sm" className="bg-gradient-gold text-primary-foreground font-body hover:opacity-90" onClick={() => autoAdvance(11)}>המשך ←</Button>
                </div>
              </ProgressiveFormStep>

              {/* Step 11: Update notes */}
              <ProgressiveFormStep visible={step === 11} stepIndex={11} showSkip showBack onSkip={() => autoAdvance(12)} onBack={() => setStep(10)}>
                <div className="space-y-3">
                  <label className="font-display text-sm font-bold text-card-foreground">פרטים לעדכון על שינוי שיעור לפרסום</label>
                  <Textarea value={updateNotes} onChange={(e) => setUpdateNotes(e.target.value)} placeholder="פרטו כאן..." rows={4} />
                  <Button size="sm" className="bg-gradient-gold text-primary-foreground font-body hover:opacity-90" onClick={() => autoAdvance(12)}>המשך ←</Button>
                </div>
              </ProgressiveFormStep>

              {/* Step 12: Contact & Org & Submit */}
              <AnimatePresence mode="wait">
                {step === 12 && (
                  <motion.div key="contact-step" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }}
                    className="space-y-3 p-6 rounded-2xl bg-gradient-to-br from-gold/8 to-secondary/5 border-2 border-gold/20">
                    <label className="font-display text-sm font-bold text-card-foreground flex items-center gap-2"><Phone className="w-4 h-4 text-gold" /> פרטי יצירת קשר [לשימוש המשרד]</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="שם" />
                      <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="טלפון" />
                      <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="מייל (לא חובה)" type="email" />
                    </div>
                    <label className="font-display text-sm font-bold text-card-foreground block mt-4">שם הארגון שהקים את השיעור</label>
                    <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="שם הארגון" />
                    <input type="file" ref={fileInputRef} accept="image/*" onChange={handleLogoSelect} className="hidden" />
                    {logoPreview ? (
                      <div className="flex items-center gap-4">
                        <img src={logoPreview} alt="" className="w-20 h-20 rounded-xl object-cover border border-gold/30" />
                        <button onClick={() => { setLogoFile(null); setLogoPreview(""); }} className="font-body text-xs text-destructive hover:underline">הסרה</button>
                      </div>
                    ) : (
                      <button onClick={() => fileInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-gold/30 rounded-xl p-6 text-center hover:border-gold/50 transition-colors group">
                        <Image className="w-8 h-8 text-muted-foreground mx-auto mb-2 group-hover:text-gold transition-colors" />
                        <p className="font-body text-sm text-muted-foreground">העלאת לוגו</p>
                      </button>
                    )}
                    <motion.button
                      onClick={handleSubmit}
                      disabled={submitting}
                      whileHover={{ scale: 1.02, boxShadow: "0 0 40px -8px hsl(var(--gold) / 0.5)" }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-4 rounded-2xl bg-gradient-gold text-primary-foreground font-body font-bold text-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-3 mt-4 shadow-lg glow-gold"
                    >
                      <Upload className="w-5 h-5" />
                      {submitting ? "שולח..." : "שליחת השיעור לאישור"}
                    </motion.button>
                    <button onClick={() => setStep(11)} className="text-xs text-gold hover:text-secondary font-body transition-colors">← חזרה</button>
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

export default UpdateLesson;
