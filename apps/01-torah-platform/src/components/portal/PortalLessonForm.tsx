import { motion } from "framer-motion";
import { MapPin, Calendar, Video, Trash2, BookOpen, Users, Globe, Palette } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

const SUBJECTS = [
  "גמרא עיון", "גמרא בקיאות", "משניות", "דף יומי", "עמוד היומי", "עין יעקב",
  "הלכה בעיון", "משנה ברורה", "הלכות פסוקות", "פרשת שבוע", "דרשות", "מוסר",
  "חסידות", "קבלה", "אגדות ומדרשי חז\"ל", "נ\"ך והיסטוריה", "חינוך ילדים",
  "שלום בית", "מחשבה והשקפה", "יסודות האמונה", "חושן משפט", "טעמי המקרא",
  "אחר - פרט",
];
const GENDER_OPTIONS = ["נשים", "גברים", "אחר - פרט"];
const LANGUAGES = ["עברית", "אידיש", "אנגלית", "צרפתית", "רוסית", "אחר - פרט"];
const AUDIENCE_TYPES = [
  "מסורתיים", "מתחזקים", "נוער מתחזק", "בעלי בתים", "דתיים לאומיים",
  "חרד\"לים", "חוזרים בתשובה", "בוגרי ישיבות", "אברכים", "נוער", "ילדים",
  "אחר - פרט",
];
const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const LESSON_STYLES = ["שיעור פרונטלי", "חברותא", "שיעור אונליין", "שיעור משולב",
  "לימוד משותף", "שיעור מתוך ספר", "לימוד מעמיק", "מסירת שיעור מוכן",
  "פנינים ודרשות קצרות", "הלכות", "שאלות ותשובות", "אחר - פרט"];
const STYLE_OPTIONS = ["חסידי", "ספרדי", "ליטאי", "ישיבתי", "אחר - פרט"];
const SPEAKING_STYLES = [
  "שפה גבוהה ומשכילה", "מפולפל", "עמוק", "ענייני וממוקד", "שפה עשירה",
  "שפה פשוטה ועממית", "הומור", "מתובל בסיפורים והמחשות", "אחר - פרט",
];

const ChipPicker = ({ label, icon, options, selected, onSelect, multi = false }: {
  label: string; icon?: React.ReactNode; options: string[]; selected: string | string[]; onSelect: (v: string) => void; multi?: boolean;
}) => (
  <div>
    <label className="font-body text-xs font-semibold text-gray-700 mb-2 block flex items-center gap-1.5">
      {icon}{label}
    </label>
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const isSelected = multi ? (selected as string[]).includes(opt) : selected === opt;
        return (
          <motion.button key={opt} type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(opt)}
            className={`px-3 py-1.5 rounded-xl font-body text-xs border transition-all ${
              isSelected
                ? "bg-teal/20 border-teal/50 text-teal font-bold shadow-sm"
                : "bg-gray-50 border-gray-200 text-gray-600 hover:border-teal/40 hover:bg-teal/5"
            }`}
          >{opt}</motion.button>
        );
      })}
    </div>
  </div>
);

interface PortalLessonFormProps {
  data: any;
  onChange: (d: any) => void;
}

const PortalLessonForm = ({ data, onChange }: PortalLessonFormProps) => {
  const set = (key: string, val: any) => onChange({ ...data, [key]: val });
  const toggleArray = (key: string, val: string) => {
    const arr: string[] = data[key] || [];
    set(key, arr.includes(val) ? arr.filter((v: string) => v !== val) : [...arr, val]);
  };
  const scheduleDays: { day: string; time: string }[] = Array.isArray(data.schedule_days) ? data.schedule_days : [];

  return (
    <div className="space-y-5">
      {/* Subject chips */}
      <ChipPicker label="נושא השיעור *" icon={<BookOpen className="w-3.5 h-3.5 text-teal" />}
        options={SUBJECTS} selected={data.subject?.split(", ").filter(Boolean) || []}
        onSelect={(v) => {
          const current: string[] = data.subject?.split(", ").filter(Boolean) || [];
          const next = current.includes(v) ? current.filter(x => x !== v) : [...current, v];
          set("subject", next.join(", "));
        }} multi />

      {/* Lesson style chips */}
      <ChipPicker label="סגנון שיעור" icon={<BookOpen className="w-3.5 h-3.5 text-teal" />}
        options={LESSON_STYLES} selected={data.lesson_style?.split(", ").filter(Boolean) || []}
        onSelect={(v) => {
          const current: string[] = data.lesson_style?.split(", ").filter(Boolean) || [];
          const next = current.includes(v) ? current.filter(x => x !== v) : [...current, v];
          set("lesson_style", next.join(", "));
        }} multi />

      {/* Speaking Style */}
      <ChipPicker label="סגנון דיבור" icon={<Palette className="w-3.5 h-3.5 text-teal" />}
        options={SPEAKING_STYLES}
        selected={data.submitter_notes?.includes("סגנון דיבור:") ? data.submitter_notes.split("סגנון דיבור: ")[1]?.split(".")[0] || "" : ""}
        onSelect={(v) => {
          const existingNotes = data.submitter_notes?.replace(/סגנון דיבור: [^.]*\. ?/, "") || "";
          set("submitter_notes", `סגנון דיבור: ${v}. ${existingNotes}`.trim());
        }} />

      {/* Style (סגנון) */}
      <ChipPicker label="סגנון" icon={<BookOpen className="w-3.5 h-3.5 text-teal" />}
        options={STYLE_OPTIONS} selected={data.lesson_style?.split(", ").filter(Boolean) || []}
        onSelect={(v) => {
          const current: string[] = data.lesson_style?.split(", ").filter(Boolean) || [];
          const next = current.includes(v) ? current.filter(x => x !== v) : [...current, v];
          set("lesson_style", next.join(", "));
        }} multi />

      {/* Gender / Target audience */}
      <ChipPicker label="למי מיועד?" icon={<Users className="w-3.5 h-3.5 text-teal" />}
        options={GENDER_OPTIONS} selected={data.target_audience || []}
        onSelect={(v) => toggleArray("target_audience", v)} multi />

      {/* Language */}
      <ChipPicker label="שפה" icon={<Globe className="w-3.5 h-3.5 text-teal" />}
        options={LANGUAGES} selected={data.language || ""} onSelect={(v) => set("language", v)} />

      {/* Audience type */}
      <ChipPicker label="קהל יעד" icon={<Users className="w-3.5 h-3.5 text-teal" />}
        options={AUDIENCE_TYPES} selected={data.audience_type || []}
        onSelect={(v) => toggleArray("audience_type", v)} multi />

      {/* Location */}
      <div className="border-t border-gray-200 pt-4">
        <label className="font-body text-xs font-semibold text-gray-700 mb-2 block flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-teal" /> מיקום
        </label>
        <div className="grid grid-cols-2 gap-3 mb-2">
          <Input value={data.city || ""} onChange={e => set("city", e.target.value)} placeholder="עיר *" className="border-gray-200 focus:border-teal/50 bg-white" />
          <Input value={data.neighborhood || ""} onChange={e => set("neighborhood", e.target.value)} placeholder="שכונה" className="border-gray-200 focus:border-teal/50 bg-white" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input value={data.synagogue_name || ""} onChange={e => set("synagogue_name", e.target.value)} placeholder="בית כנסת / אולם" className="border-gray-200 focus:border-teal/50 bg-white" />
          <Input value={data.street || ""} onChange={e => set("street", e.target.value)} placeholder="רחוב" className="border-gray-200 focus:border-teal/50 bg-white" />
          <Input value={data.street_number || ""} onChange={e => set("street_number", e.target.value)} placeholder="מספר" className="border-gray-200 focus:border-teal/50 bg-white" />
        </div>
      </div>

      {/* Schedule type */}
      <div className="border-t border-gray-200 pt-4">
        <label className="font-body text-xs font-semibold text-gray-700 mb-2 block flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-teal" /> סוג שיעור וזמנים
        </label>
        <div className="flex gap-6 mb-3">
          <label className="flex items-center gap-2 font-body text-sm text-gray-700 cursor-pointer">
            <Switch checked={data.is_recurring || false} onCheckedChange={v => set("is_recurring", v)} /> שיעור קבוע
          </label>
        </div>

        {data.is_recurring ? (
          <div className="space-y-2">
            <p className="font-body text-xs text-gray-500">בחרו ימים והוסיפו שעה:</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {DAY_NAMES.map(day => {
                const exists = scheduleDays.some(sd => sd.day === day);
                return (
                  <motion.button key={day} type="button" whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                    onClick={() => {
                      if (exists) set("schedule_days", scheduleDays.filter(sd => sd.day !== day));
                      else set("schedule_days", [...scheduleDays, { day, time: "" }]);
                    }}
                    className={`px-3 py-1.5 rounded-xl font-body text-xs border-2 transition-all ${
                      exists ? "bg-teal/15 border-teal/40 text-teal font-bold" : "bg-gray-50 border-gray-200 text-gray-500 hover:border-teal/30"
                    }`}
                  >{day}</motion.button>
                );
              })}
            </div>
            {scheduleDays.map((sd, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="font-body text-sm text-gray-700 min-w-[60px]">{sd.day}:</span>
                <Input value={sd.time} type="time" onChange={(e) => {
                  const days = [...scheduleDays];
                  days[idx] = { ...days[idx], time: e.target.value };
                  set("schedule_days", days);
                }} placeholder="שעה" className="w-32 border-gray-200 bg-white" />
                <button onClick={() => set("schedule_days", scheduleDays.filter((_, i) => i !== idx))} className="text-destructive" aria-label="הסרת יום"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            <Input value={data.schedule_notes || ""} onChange={e => set("schedule_notes", e.target.value)} placeholder={'הערות ללו"ז (אופציונלי)'} className="border-gray-200 focus:border-teal/50 bg-white" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Input type="date" value={data.specific_date || ""} onChange={e => set("specific_date", e.target.value)} className="border-gray-200 focus:border-teal/50 bg-white" />
            <Input value={data.schedule_notes || ""} onChange={e => set("schedule_notes", e.target.value)} placeholder="שעה / הערות" className="border-gray-200 focus:border-teal/50 bg-white" />
          </div>
        )}
      </div>

      {/* Broadcast */}
      <div className="border-t border-gray-200 pt-4">
        <label className="font-body text-xs font-semibold text-gray-700 mb-2 block flex items-center gap-1.5">
          <Video className="w-3.5 h-3.5 text-teal" /> אופן העברה
        </label>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 font-body text-sm text-gray-700 cursor-pointer">
            <Switch checked={data.is_recorded || false} onCheckedChange={v => set("is_recorded", v)} /> מוקלט
          </label>
          <label className="flex items-center gap-2 font-body text-sm text-gray-700 cursor-pointer">
            <Switch checked={data.is_live_stream || false} onCheckedChange={v => set("is_live_stream", v)} /> שידור חי
          </label>
        </div>
        {data.is_recorded && (
          <Input value={data.recording_location || ""} onChange={e => set("recording_location", e.target.value)} placeholder="היכן ניתן למצוא את ההקלטה?" className="mt-2 border-gray-200 focus:border-teal/50 bg-white" />
        )}
      </div>

      {/* Contact info */}
      <div className="border-t border-gray-200 pt-4">
        <label className="font-body text-xs font-semibold text-gray-700 mb-2 block">פרטי קשר</label>
        <div className="grid grid-cols-3 gap-3 mb-2">
          <Input value={data.rabbi_phone || ""} onChange={e => set("rabbi_phone", e.target.value)} placeholder="טלפון הרב" className="border-gray-200 focus:border-teal/50 bg-white" />
          <Input value={data.rabbi_role || ""} onChange={e => set("rabbi_role", e.target.value)} placeholder="תפקיד" className="border-gray-200 focus:border-teal/50 bg-white" />
          <Input value={data.contact_email || ""} onChange={e => set("contact_email", e.target.value)} placeholder="מייל" className="border-gray-200 focus:border-teal/50 bg-white" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input value={data.contact_name || ""} onChange={e => set("contact_name", e.target.value)} placeholder="שם איש קשר" className="border-gray-200 focus:border-teal/50 bg-white" />
          <Input value={data.contact_phone || ""} onChange={e => set("contact_phone", e.target.value)} placeholder="טלפון איש קשר" className="border-gray-200 focus:border-teal/50 bg-white" />
        </div>
      </div>

      {/* Donation & notes */}
      <div className="border-t border-gray-200 pt-4 space-y-3">
        <Input value={data.donation_link || ""} onChange={e => set("donation_link", e.target.value)} placeholder="קישור לתרומה (אופציונלי)" className="border-gray-200 focus:border-teal/50 bg-white" />
        <Textarea value={data.submitter_notes || ""} onChange={e => set("submitter_notes", e.target.value)} rows={2} placeholder="הערות נוספות..." className="border-gray-200 focus:border-teal/50 bg-white" />
      </div>
    </div>
  );
};

export default PortalLessonForm;
