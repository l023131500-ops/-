import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, MapPin, BookOpen, ArrowLeft, Video, Radio, RefreshCw, ChevronDown, Search, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import LessonDetailModal from "./LessonDetailModal";

const DAY_ORDER: Record<string, number> = {
  "ראשון": 0, "שני": 1, "שלישי": 2, "רביעי": 3, "חמישי": 4, "שישי": 5, "שבת": 6,
};

const getTodayDayIndex = () => new Date().getDay();

const getNextOccurrence = (lesson: any): number => {
  const now = new Date();
  const todayIdx = getTodayDayIndex();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (lesson.specific_date) {
    return new Date(lesson.specific_date).getTime() - now.getTime();
  }
  if (lesson.is_recurring && Array.isArray(lesson.schedule_days) && lesson.schedule_days.length > 0) {
    let minDiff = Infinity;
    for (const d of lesson.schedule_days as { day: string; time: string }[]) {
      const dayIdx = DAY_ORDER[d.day] ?? -1;
      if (dayIdx < 0) continue;
      const [h, m] = (d.time || "00:00").split(":").map(Number);
      const lessonMinutes = (h || 0) * 60 + (m || 0);
      let dayDiff = dayIdx - todayIdx;
      if (dayDiff < 0) dayDiff += 7;
      if (dayDiff === 0 && lessonMinutes <= currentMinutes) dayDiff = 7;
      const totalMinutes = dayDiff * 24 * 60 + (lessonMinutes - currentMinutes);
      if (totalMinutes < minDiff) minDiff = totalMinutes;
    }
    return minDiff;
  }
  return Infinity;
};

const INITIAL_VISIBLE = 6;
const LOAD_MORE_COUNT = 6;

const SUBJECTS = ["גמרא", "הלכה", "פרשת השבוע", "חסידות", "מוסר ואמונה", "קבלה / זוהר", "דף יומי", "משנה"];

const LessonCard = ({ lesson, onClick }: { lesson: any; onClick: () => void }) => {
  const getNextTimeLabel = (lesson: any) => {
    const diff = getNextOccurrence(lesson);
    if (diff === Infinity) return null;
    if (diff < 0) return "עבר";
    const hours = Math.floor(diff / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `בעוד ${days} ימים`;
    if (hours > 0) return `בעוד ${hours} שעות`;
    return `בעוד ${diff} דקות`;
  };
  const timeLabel = getNextTimeLabel(lesson);

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.02 }}
      onClick={onClick}
      className="group cursor-pointer bg-card rounded-2xl border border-border hover:border-primary/30 hover:shadow-elegant transition-all duration-300 overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gradient-teal text-primary-foreground">{lesson.subject}</span>
          <div className="flex gap-1.5 items-center">
            {timeLabel && (
              <span className="text-[10px] text-primary font-bold bg-primary/8 px-2 py-0.5 rounded-full">{timeLabel}</span>
            )}
            {lesson.is_live_stream && (
              <span className="flex items-center gap-0.5 text-[10px] text-destructive font-bold animate-pulse">
                <Radio className="w-3 h-3" /> LIVE
              </span>
            )}
            {lesson.is_recorded && (
              <span className="flex items-center gap-0.5 text-[10px] text-gold font-bold">
                <Video className="w-3.5 h-3.5" /> מוקלט
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 mb-3">
          {lesson.logo_url ? (
            <img src={lesson.logo_url} alt={lesson.rabbi_name ? `לוגו ${lesson.rabbi_name}` : "לוגו"} className="w-10 h-10 rounded-lg object-cover border border-border" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gradient-brand flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
          )}
          <div>
            <h3 className="font-display text-base font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
              {lesson.rabbi_name}
            </h3>
            {lesson.rabbi_role && <p className="font-body text-xs text-muted-foreground">{lesson.rabbi_role}</p>}
          </div>
        </div>
        <div className="space-y-1 text-xs font-body text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-gold flex-shrink-0" />
            <span className="truncate">{[lesson.city, lesson.synagogue_name].filter(Boolean).join(" • ")}</span>
          </div>
          {lesson.is_recurring && lesson.schedule_days && (lesson.schedule_days as any[]).length > 0 && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-primary flex-shrink-0" />
              <span className="truncate">{(lesson.schedule_days as any[]).slice(0, 2).map((d: any) => `${d.day} ${d.time}`).join(", ")}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const ScrollingLessonColumn = ({ lessons, onSelect }: { lessons: any[]; onSelect: (l: any) => void }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || lessons.length === 0) return;
    let animationId: number;
    let scrollPos = container.scrollHeight / 2;
    container.scrollTop = scrollPos;
    const scroll = () => {
      scrollPos -= 0.5;
      if (scrollPos <= 0) scrollPos = container.scrollHeight / 2;
      container.scrollTop = scrollPos;
      animationId = requestAnimationFrame(scroll);
    };
    animationId = requestAnimationFrame(scroll);
    const pause = () => cancelAnimationFrame(animationId);
    const resume = () => { animationId = requestAnimationFrame(scroll); };
    container.addEventListener("mouseenter", pause);
    container.addEventListener("mouseleave", resume);
    return () => {
      cancelAnimationFrame(animationId);
      container.removeEventListener("mouseenter", pause);
      container.removeEventListener("mouseleave", resume);
    };
  }, [lessons]);

  const displayLessons = [...lessons, ...lessons];

  return (
    <div ref={containerRef} className="h-[600px] overflow-hidden space-y-3 scrollbar-hide" style={{ scrollBehavior: "auto" }}>
      {displayLessons.map((lesson, i) => (
        <LessonCard key={`${lesson.id}-${i}`} lesson={lesson} onClick={() => onSelect(lesson)} />
      ))}
    </div>
  );
};

const FeaturedLessons = () => {
  const [lessons, setLessons] = useState<any[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [error, setError] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState("");

  const fetchLessons = async () => {
    setError(false);
    const { data, error: err } = await supabase
      .from("lessons")
      .select("*")
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .limit(100);
    if (err) { console.error("Fetch lessons error:", err); setError(true); }
    if (data && data.length > 0) {
      const sorted = [...data].sort((a, b) => getNextOccurrence(a) - getNextOccurrence(b));
      setLessons(sorted);
    }
  };

  useEffect(() => {
    fetchLessons();
    const timer = setTimeout(() => { if (lessons.length === 0) fetchLessons(); }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const filteredLessons = lessons.filter(l => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || l.subject?.toLowerCase().includes(q) || l.rabbi_name?.toLowerCase().includes(q) || l.city?.toLowerCase().includes(q) || l.synagogue_name?.toLowerCase().includes(q);
    const matchSubject = !filterSubject || l.subject === filterSubject;
    return matchSearch && matchSubject;
  });

  const visibleLessons = filteredLessons.slice(0, visibleCount);
  const hasMore = visibleCount < filteredLessons.length;

  return (
    <section className="py-16 overflow-hidden bg-cream/30">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-black text-foreground mb-1">
              שיעורים <span className="text-gradient-brand">קרובים</span>
            </h2>
            <p className="font-body text-muted-foreground text-sm">
              {lessons.length > 0 ? `${lessons.length} שיעורים במאגר` : "טוען שיעורים..."}
            </p>
          </div>
          <div className="flex gap-2">
            {error && (
              <button onClick={fetchLessons} className="flex items-center gap-1.5 text-sm text-primary hover:underline font-body">
                <RefreshCw className="w-4 h-4" /> נסו שוב
              </button>
            )}
          </div>
        </div>

        {lessons.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-gradient-brand mx-auto flex items-center justify-center animate-pulse">
                <BookOpen className="w-6 h-6 text-primary-foreground" />
              </div>
              <p className="font-body text-muted-foreground">טוען שיעורים מהמאגר...</p>
              <button onClick={fetchLessons} className="text-sm text-primary hover:underline font-body flex items-center gap-1 mx-auto">
                <RefreshCw className="w-3 h-3" /> רענון
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left side - Animated scrolling column */}
              <div className="lg:col-span-1 order-2 lg:order-1">
                <div className="sticky top-24">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                    <span className="font-body text-sm font-bold text-foreground">שיעורים קרובים</span>
                  </div>
                  <ScrollingLessonColumn lessons={lessons.slice(0, 20)} onSelect={setSelectedLesson} />
                </div>
              </div>

              {/* Right side - filtered grid */}
              <div className="lg:col-span-2 order-1 lg:order-2">
                {/* Search & Filter bar */}
                <div className="mb-6 space-y-3">
                  <div className="relative shadow-elegant rounded-2xl">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-l from-gold/20 via-teal/15 to-gold/20 blur-md -z-10" />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2"><Search className="w-5 h-5 text-gold" strokeWidth={2.2} /></div>
                    <input
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(INITIAL_VISIBLE); }}
                      placeholder="🔍 חיפוש שיעורים — נושא, רב, עיר, בית כנסת..."
                      className="w-full bg-card rounded-2xl pr-14 pl-4 py-4 font-body text-base font-semibold border-2 border-gold/40 focus:border-gold focus:ring-4 focus:ring-gold/20 outline-none transition-all placeholder:text-muted-foreground placeholder:font-medium"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => { setFilterSubject(""); setVisibleCount(INITIAL_VISIBLE); }}
                      className={`px-3 py-1.5 rounded-lg font-body text-xs font-medium transition-all ${
                        !filterSubject ? "bg-gradient-teal text-primary-foreground" : "bg-muted/40 text-muted-foreground border border-border hover:border-primary/30"
                      }`}
                    >
                      הכל
                    </button>
                    {SUBJECTS.map(s => (
                      <button
                        key={s}
                        onClick={() => { setFilterSubject(filterSubject === s ? "" : s); setVisibleCount(INITIAL_VISIBLE); }}
                        className={`px-3 py-1.5 rounded-lg font-body text-xs font-medium transition-all ${
                          filterSubject === s ? "bg-gradient-teal text-primary-foreground" : "bg-muted/40 text-muted-foreground border border-border hover:border-primary/30"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {visibleLessons.map((lesson, i) => (
                    <motion.div
                      key={lesson.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <LessonCard lesson={lesson} onClick={() => setSelectedLesson(lesson)} />
                    </motion.div>
                  ))}
                </div>

                {filteredLessons.length === 0 && (
                  <div className="text-center py-12">
                    <p className="font-body text-muted-foreground">לא נמצאו שיעורים מתאימים</p>
                  </div>
                )}

                {/* Load More + Full Directory buttons */}
                <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
                  {hasMore && (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setVisibleCount(prev => prev + LOAD_MORE_COUNT)}
                      className="px-8 py-3 rounded-xl border border-border text-foreground/70 hover:border-primary/30 hover:text-primary font-body font-medium transition-all flex items-center gap-2"
                    >
                      <ChevronDown className="w-4 h-4" />
                      עוד שיעורים
                    </motion.button>
                  )}
                  <Link to="/lessons">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="px-8 py-3 rounded-xl bg-gradient-brand text-primary-foreground font-body font-bold hover:opacity-90 transition-all flex items-center gap-2 shadow-lg"
                    >
                      כניסה למאגר השיעורים המלא
                      <ArrowLeft className="w-4 h-4" />
                    </motion.button>
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {selectedLesson && <LessonDetailModal lesson={selectedLesson} onClose={() => setSelectedLesson(null)} />}
      </AnimatePresence>
    </section>
  );
};

export default FeaturedLessons;
