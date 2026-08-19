import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, MapPin, BookOpen, Clock, Radio, Video, Filter } from "lucide-react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import LessonDetailModal from "@/components/LessonDetailModal";
import AIIcon from "@/components/ui/AIIcon";

const SUBJECTS = [
  "גמרא עיון", "גמרא בקיאות", "משניות", "דף יומי", "עמוד היומי", "עין יעקב",
  "הלכה בעיון", "משנה ברורה", "הלכות פסוקות", "פרשת שבוע", "דרשות", "מוסר",
  "חסידות", "קבלה", "אגדות ומדרשי חז\"ל", "נ\"ך והיסטוריה", "חינוך ילדים",
  "שלום בית", "מחשבה והשקפה", "יסודות האמונה", "חושן משפט", "טעמי המקרא",
];
const GENDER = ["גברים", "נשים", "מעורב"];
const LANGUAGES = ["עברית", "אידיש", "אנגלית", "צרפתית", "רוסית"];
const AUDIENCE_TYPES = [
  "מסורתיים", "מתחזקים", "נוער מתחזק", "בעלי בתים", "דתיים לאומיים",
  "חרד\"לים", "חוזרים בתשובה", "בוגרי ישיבות", "אברכים", "נוער", "ילדים",
];
const STYLES = ["חסידי", "ספרדי", "ליטאי", "ישיבתי", "אחר"];
const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

interface Filters {
  q: string;
  subject: string;
  audience: string;
  city: string;
  day: string;
  language: string;
  gender: string;
  style: string;
}

const EMPTY_FILTERS: Filters = {
  q: "", subject: "", audience: "", city: "", day: "", language: "", gender: "", style: "",
};

const FilterSelect = ({
  label, value, options, onChange,
}: { label: string; value: string; options: string[]; onChange: (v: string) => void }) => (
  <div className="relative">
    {/* Same fix as LessonsDashboard: the name has to outlive the selection. */}
    <select
      value={value}
      aria-label={label}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full appearance-none bg-card border-2 rounded-xl pr-3 pl-9 py-2.5 font-body text-sm text-right transition-all cursor-pointer ${
        value ? "border-gold/60 text-gold font-semibold bg-gold/5" : "border-border text-foreground hover:border-gold/30"
      }`}
    >
      <option value="">{label}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
  </div>
);

const ResultCard = ({ lesson, onClick }: { lesson: any; onClick: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -3, scale: 1.01 }}
    onClick={onClick}
    className="cursor-pointer bg-card rounded-2xl border-2 border-border hover:border-gold/40 hover:shadow-elegant transition-all p-4"
  >
    <div className="flex items-center justify-between mb-2">
      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gradient-teal text-primary-foreground">
        {lesson.subject}
      </span>
      <div className="flex gap-1.5">
        {lesson.is_live_stream && <Radio className="w-3.5 h-3.5 text-destructive animate-pulse" />}
        {lesson.is_recorded && <Video className="w-3.5 h-3.5 text-gold" />}
      </div>
    </div>
    <h3 className="font-display font-bold text-foreground leading-tight">{lesson.rabbi_name}</h3>
    {lesson.rabbi_role && <p className="font-body text-xs text-muted-foreground mb-2">{lesson.rabbi_role}</p>}
    <div className="space-y-1 text-xs font-body text-muted-foreground mt-2">
      <div className="flex items-center gap-1.5">
        <MapPin className="w-3 h-3 text-gold flex-shrink-0" />
        <span className="truncate">{[lesson.city, lesson.synagogue_name].filter(Boolean).join(" • ")}</span>
      </div>
      {Array.isArray(lesson.schedule_days) && lesson.schedule_days.length > 0 && (
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-teal flex-shrink-0" />
          <span className="truncate">
            {(lesson.schedule_days as any[]).slice(0, 3).map(d => `${d.day} ${d.time}`).join(", ")}
          </span>
        </div>
      )}
    </div>
  </motion.div>
);

const FindLesson = () => {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [allLessons, setAllLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("lessons")
        .select("*")
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(500);
      setAllLessons(data || []);
      setLoading(false);
    })();
  }, []);

  const update = useCallback(<K extends keyof Filters>(key: K, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearAll = () => setFilters(EMPTY_FILTERS);

  const activeChips = useMemo(() => {
    const chips: { key: keyof Filters; label: string }[] = [];
    if (filters.q) chips.push({ key: "q", label: `"${filters.q}"` });
    if (filters.subject) chips.push({ key: "subject", label: `נושא: ${filters.subject}` });
    if (filters.audience) chips.push({ key: "audience", label: `קהל: ${filters.audience}` });
    if (filters.city) chips.push({ key: "city", label: `עיר: ${filters.city}` });
    if (filters.day) chips.push({ key: "day", label: `יום: ${filters.day}` });
    if (filters.language) chips.push({ key: "language", label: `שפה: ${filters.language}` });
    if (filters.gender) chips.push({ key: "gender", label: `מגדר: ${filters.gender}` });
    if (filters.style) chips.push({ key: "style", label: `סגנון: ${filters.style}` });
    return chips;
  }, [filters]);

  const cities = useMemo(() => {
    const set = new Set<string>();
    allLessons.forEach(l => l.city && set.add(l.city));
    return Array.from(set).sort();
  }, [allLessons]);

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return allLessons.filter(l => {
      if (q) {
        const hay = [l.subject, l.rabbi_name, l.rabbi_role, l.city, l.neighborhood, l.synagogue_name, l.org_name]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.subject && !(l.subject || "").includes(filters.subject)) return false;
      if (filters.audience) {
        const aud = Array.isArray(l.target_audience) ? l.target_audience.join(",") : "";
        if (!aud.includes(filters.audience)) return false;
      }
      if (filters.city && l.city !== filters.city) return false;
      if (filters.day) {
        const days = Array.isArray(l.schedule_days) ? l.schedule_days : [];
        if (!days.some((d: any) => d.day === filters.day)) return false;
      }
      if (filters.language && l.language !== filters.language) return false;
      if (filters.gender) {
        const g = Array.isArray(l.audience_type) ? l.audience_type.join(",") : "";
        if (!g.includes(filters.gender)) return false;
      }
      if (filters.style && !(l.lesson_style || "").includes(filters.style)) return false;
      return true;
    });
  }, [allLessons, filters]);

  const hasFilters = activeChips.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-28 pb-16 relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-gold/8 rounded-full blur-[150px] pointer-events-none" />
        <div className="relative z-10 container mx-auto px-4 md:px-6">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <AIIcon size={28} variant="primary" />
              <span className="font-body text-sm font-bold text-gold">חיפוש חכם בזמן אמת</span>
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-black text-foreground mb-2">
              סינון שיעורים <span className="text-gradient-gold">מתוך המאגר</span>
            </h1>
            <p className="font-body text-muted-foreground text-sm md:text-base">
              סננו לפי נושא, עיר, יום או כל פרט אחר — התוצאות מתעדכנות מיד
            </p>
          </motion.div>

          {/* Filter bar */}
          <div className="max-w-6xl mx-auto bg-card border-2 border-gold/20 rounded-3xl p-4 md:p-6 shadow-elegant mb-6">
            {/* free-text search */}
            <div className="relative mb-4">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold" />
              <input
                value={filters.q}
                aria-label="חיפוש שיעורים"
                onChange={e => update("q", e.target.value)}
                placeholder="חיפוש חופשי — שם רב, נושא, עיר, בית כנסת..."
                className="w-full bg-muted/30 rounded-2xl pr-12 pl-4 py-3.5 font-body text-base text-foreground border-2 border-gold/30 focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all"
              />
            </div>

            {/* dropdowns row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              <FilterSelect label="נושא" value={filters.subject} options={SUBJECTS} onChange={v => update("subject", v)} />
              <FilterSelect label="קהל יעד" value={filters.audience} options={AUDIENCE_TYPES} onChange={v => update("audience", v)} />
              <FilterSelect label="עיר" value={filters.city} options={cities} onChange={v => update("city", v)} />
              <FilterSelect label="יום" value={filters.day} options={DAYS} onChange={v => update("day", v)} />
              <FilterSelect label="שפה" value={filters.language} options={LANGUAGES} onChange={v => update("language", v)} />
              <FilterSelect label="מגדר" value={filters.gender} options={GENDER} onChange={v => update("gender", v)} />
              <FilterSelect label="סגנון" value={filters.style} options={STYLES} onChange={v => update("style", v)} />
              <button
                onClick={clearAll}
                disabled={!hasFilters}
                className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-border py-2.5 font-body text-sm font-bold text-muted-foreground hover:border-destructive/40 hover:text-destructive disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <X className="w-4 h-4" /> נקה הכל
              </button>
            </div>

            {/* active chips */}
            {hasFilters && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
                {activeChips.map(chip => (
                  <button
                    key={chip.key}
                    onClick={() => update(chip.key, "")}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/15 border border-gold/40 text-gold text-xs font-body font-semibold hover:bg-gold/25 transition-all"
                  >
                    {chip.label}
                    <X className="w-3 h-3" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Results header */}
          <div className="max-w-6xl mx-auto flex items-center justify-between mb-4 px-2">
            <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-gold" />
              {loading ? "טוען..." : `${filtered.length} שיעורים`}
            </h2>
            {hasFilters && (
              <span className="font-body text-xs text-muted-foreground">
                מתוך {allLessons.length}
              </span>
            )}
          </div>

          {/* Results grid */}
          <div className="max-w-6xl mx-auto">
            {loading ? (
              <div className="text-center py-16 font-body text-muted-foreground">טוען שיעורים מהמאגר...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="font-body text-muted-foreground mb-3">לא נמצאו שיעורים מתאימים</p>
                {hasFilters && (
                  <button onClick={clearAll} className="text-sm text-gold hover:underline font-body font-bold">
                    נקה את כל הסינונים
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {filtered.map(lesson => (
                  <ResultCard key={lesson.id} lesson={lesson} onClick={() => setSelectedLesson(lesson)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {selectedLesson && <LessonDetailModal lesson={selectedLesson} onClose={() => setSelectedLesson(null)} />}
      </AnimatePresence>
    </div>
  );
};

export default FindLesson;
