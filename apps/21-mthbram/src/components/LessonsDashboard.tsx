import { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, X, MapPin, Clock, Radio, Video, Plus, Download, Share2, Printer, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import LessonDetailModal from "./LessonDetailModal";
import { toast } from "@/hooks/use-toast";
import { exportLessonsToExcel } from "@/lib/lessonExcelExport";
import { copyLessonToClipboard } from "@/lib/lessonShare";

const SUBJECTS = ["גמרא", "הלכה", "פרשת השבוע", "חסידות", "מוסר", "משנה", "דף יומי", "נ״ך"];
const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

interface Filters {
  q: string;
  subject: string;
  city: string;
  day: string;
  audience: string;
}

const EMPTY: Filters = { q: "", subject: "", city: "", day: "", audience: "" };

const LessonSquare = ({ lesson, onClick }: { lesson: any; onClick: () => void }) => {
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    exportLessonsToExcel([lesson]);
    toast({ title: "הורדת קובץ אקסל" });
  };
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await copyLessonToClipboard(lesson);
    toast({ title: "השיעור הועתק ללוח" });
  };
  const handlePrint = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.print();
  };

  return (
    <motion.div
      whileHover={{ y: -3 }}
      onClick={onClick}
      className="group relative cursor-pointer bg-card/60 backdrop-blur-sm border border-gold/25 hover:border-gold/60 rounded-2xl p-5 transition-all duration-300 hover:shadow-gold-ring"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gold/15 text-gold border border-gold/30">
          {lesson.subject}
        </span>
        <div className="flex gap-1.5">
          {lesson.is_live_stream && <Radio className="w-3.5 h-3.5 text-destructive animate-pulse" />}
          {lesson.is_recorded && <Video className="w-3.5 h-3.5 text-gold" />}
        </div>
      </div>

      <h3 className="font-display font-bold text-foreground leading-tight text-base">{lesson.rabbi_name}</h3>
      {lesson.rabbi_role && (
        <p className="font-body text-xs text-muted-foreground mb-3">{lesson.rabbi_role}</p>
      )}

      <div className="space-y-1.5 text-xs font-body text-muted-foreground/90 border-t border-gold/10 pt-3">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3 h-3 text-gold flex-shrink-0" />
          <span className="truncate">{[lesson.city, lesson.synagogue_name].filter(Boolean).join(" • ")}</span>
        </div>
        {Array.isArray(lesson.schedule_days) && lesson.schedule_days.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-gold flex-shrink-0" />
            <span className="truncate">
              {lesson.schedule_days.slice(0, 2).map((d: any) => `${d.day} ${d.time}`).join(", ")}
            </span>
          </div>
        )}
      </div>

      {/* action row */}
      <div className="flex items-center justify-end gap-1.5 mt-3 pt-3 border-t border-gold/10 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={handleDownload} title="הורדה" className="p-1.5 rounded-lg hover:bg-gold/15 text-muted-foreground hover:text-gold transition-colors">
          <Download className="w-3.5 h-3.5" />
        </button>
        <button onClick={handleShare} title="שיתוף" className="p-1.5 rounded-lg hover:bg-gold/15 text-muted-foreground hover:text-gold transition-colors">
          <Share2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={handlePrint} title="הדפסה" className="p-1.5 rounded-lg hover:bg-gold/15 text-muted-foreground hover:text-gold transition-colors">
          <Printer className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
};

const FilterSelect = ({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) => (
  <div className="relative">
    {/*
      `label` was carrying the name only through the empty option, so the field
      introduced itself as "נושא" until you picked something — and from then on
      announced just "גמרא", with nothing to say which filter that was. The
      visible design is unchanged; aria-label makes the name survive selection.
    */}
    <select
      value={value}
      aria-label={label}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full appearance-none rounded-xl pr-3 pl-8 py-2 font-body text-sm text-right transition-all cursor-pointer border ${
        value ? "border-gold/60 text-gold bg-gold/8 font-semibold" : "border-gold/25 text-foreground bg-card/50 hover:border-gold/40"
      }`}
    >
      <option value="">{label}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
    <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gold/60 pointer-events-none" />
  </div>
);

const LessonsDashboard = () => {
  const [all, setAll] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [selected, setSelected] = useState<any>(null);
  const [visible, setVisible] = useState(9);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("lessons").select("*").eq("is_approved", true).order("created_at", { ascending: false }).limit(300);
      setAll(data || []);
      setLoading(false);
    })();
  }, []);

  const cities = useMemo(() => Array.from(new Set(all.map(l => l.city).filter(Boolean))).sort(), [all]);

  const update = useCallback(<K extends keyof Filters>(k: K, v: string) => {
    setFilters(prev => ({ ...prev, [k]: v }));
    setVisible(9);
  }, []);

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return all.filter(l => {
      if (q) {
        const hay = [l.subject, l.rabbi_name, l.rabbi_role, l.city, l.synagogue_name].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.subject && !(l.subject || "").includes(filters.subject)) return false;
      if (filters.city && l.city !== filters.city) return false;
      if (filters.day) {
        const days = Array.isArray(l.schedule_days) ? l.schedule_days : [];
        if (!days.some((d: any) => d.day === filters.day)) return false;
      }
      return true;
    });
  }, [all, filters]);

  const hasFilters = Object.values(filters).some(Boolean);
  const shown = filtered.slice(0, visible);

  return (
    <section className="py-8 relative">
      <div className="container mx-auto px-4 md:px-6">
        {/* Filter + smart search + add button */}
        <div className="max-w-6xl mx-auto mb-8">
          <div className="bg-card/50 backdrop-blur-md border border-gold/25 rounded-3xl p-4 md:p-5 shadow-elegant">
            <div className="flex flex-col lg:flex-row gap-3 items-stretch">
              {/* Smart search with pulsing ring */}
              <div className="relative flex-1">
                <div className="absolute inset-0 rounded-2xl bg-gold/20 blur-lg animate-glow-pulse pointer-events-none" />
                <div className="relative flex items-center gap-2 bg-navy/60 border-2 border-gold/50 rounded-2xl pr-4 pl-4 py-2.5">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-gold/40 animate-ping" />
                    <div className="relative w-2.5 h-2.5 rounded-full bg-gold" />
                  </div>
                  <Search className="w-4 h-4 text-gold flex-shrink-0" />
                  <input
                    value={filters.q}
                    aria-label="חיפוש שיעורים"
                    onChange={e => update("q", e.target.value)}
                    placeholder="חיפוש שיעורים — רב, נושא, עיר, בית כנסת..."
                    className="w-full bg-transparent py-1 font-body text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
                  />
                </div>
              </div>

              {/* Add lesson button */}
              <Link to="/update-lesson" className="flex-shrink-0">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full lg:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl border-2 border-gold/50 bg-transparent hover:bg-gold/10 text-gold font-body text-sm font-bold transition-all"
                >
                  <Plus className="w-4 h-4" />
                  הוספת שיעור למאגר
                </motion.button>
              </Link>
            </div>

            {/* Filter dropdowns */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
              <FilterSelect label="נושא" value={filters.subject} options={SUBJECTS} onChange={v => update("subject", v)} />
              <FilterSelect label="עיר" value={filters.city} options={cities} onChange={v => update("city", v)} />
              <FilterSelect label="יום" value={filters.day} options={DAYS} onChange={v => update("day", v)} />
              <button
                onClick={() => { setFilters(EMPTY); setVisible(9); }}
                disabled={!hasFilters}
                className="flex items-center justify-center gap-1 rounded-xl border border-gold/25 py-2 font-body text-xs font-bold text-muted-foreground hover:border-destructive/40 hover:text-destructive disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <X className="w-3.5 h-3.5" /> נקה סינון
              </button>
            </div>
          </div>
        </div>

        {/* Results grid */}
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="font-display text-lg md:text-xl font-bold text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-gold" />
              {loading ? "טוען..." : `${filtered.length} שיעורים`}
            </h2>
            {hasFilters && <span className="font-body text-xs text-muted-foreground">מתוך {all.length}</span>}
          </div>

          {loading ? (
            <div className="text-center py-16 font-body text-muted-foreground">טוען שיעורים מהמאגר...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Search className="w-10 h-10 text-gold/30 mx-auto mb-3" />
              {/* אין מאגר ואין תוצאות הן שתי עובדות שונות. כשהמאגר ריק לא בוצע
                  חיפוש, ו"לא נמצאו מתאימים" מטיל את הריקנות על המבקר. אותה
                  הבחנה כבר נעשית ב-LessonDirectory.tsx:213. */}
              <p className="font-body text-muted-foreground">
                {all.length === 0 ? "עדיין אין שיעורים במאגר" : "לא נמצאו שיעורים מתאימים"}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {shown.map((l, i) => (
                  <motion.div key={l.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                    <LessonSquare lesson={l} onClick={() => setSelected(l)} />
                  </motion.div>
                ))}
              </div>
              {visible < filtered.length && (
                <div className="text-center mt-6">
                  <button
                    onClick={() => setVisible(v => v + 9)}
                    className="px-6 py-2 rounded-xl border border-gold/30 text-gold hover:bg-gold/10 font-body text-sm font-bold transition-all"
                  >
                    טעינת שיעורים נוספים
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selected && <LessonDetailModal lesson={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </section>
  );
};

export default LessonsDashboard;
