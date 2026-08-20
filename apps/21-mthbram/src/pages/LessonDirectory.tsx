import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import { Search, MapPin, Clock, BookOpen, Users, Video, Radio, Filter, ChevronDown, RefreshCw } from "lucide-react";
import LessonDetailModal from "@/components/LessonDetailModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface Lesson {
  id: string;
  city: string;
  neighborhood: string;
  synagogue_name: string;
  subject: string;
  lesson_style: string;
  rabbi_name: string;
  rabbi_role: string;
  language: string;
  target_audience: string[];
  audience_type: string[];
  is_recurring: boolean;
  schedule_days: any[];
  specific_date: string | null;
  is_recorded: boolean;
  is_live_stream: boolean;
  contact_phone: string;
  donation_link: string;
  logo_url: string;
}

const INITIAL_VISIBLE = 12;
const LOAD_MORE_COUNT = 12;

const LessonDirectory = () => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [filterCity, setFilterCity] = useState("");
  const [filterAudience, setFilterAudience] = useState("");
  const [filterStyle, setFilterStyle] = useState("");
  const [filterLanguage, setFilterLanguage] = useState("");
  const [filterLive, setFilterLive] = useState(false);
  const [filterRecorded, setFilterRecorded] = useState(false);

  useEffect(() => { fetchLessons(); }, []);

  const fetchLessons = async () => {
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("is_approved", true)
      .order("created_at", { ascending: false });
    if (!error && data) setLessons(data as Lesson[]);
    setLoading(false);
  };

  const cities = [...new Set(lessons.map(l => l.city).filter(Boolean))];
  const styles = [...new Set(lessons.map(l => l.lesson_style).filter(Boolean))];
  const audiences = [...new Set(lessons.flatMap(l => [...(l.target_audience || []), ...(l.audience_type || [])]).filter(Boolean))];
  const languages = [...new Set(lessons.map(l => l.language).filter(Boolean))];

  const filtered = lessons.filter(l => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      l.subject.toLowerCase().includes(q) ||
      l.rabbi_name.toLowerCase().includes(q) ||
      l.city.toLowerCase().includes(q) ||
      l.synagogue_name?.toLowerCase().includes(q) ||
      l.lesson_style?.toLowerCase().includes(q);
    const matchesCity = !filterCity || l.city === filterCity;
    const matchesAudience = !filterAudience || l.target_audience?.includes(filterAudience) || l.audience_type?.includes(filterAudience);
    const matchesStyle = !filterStyle || l.lesson_style === filterStyle;
    const matchesLang = !filterLanguage || l.language === filterLanguage;
    const matchesLive = !filterLive || l.is_live_stream;
    const matchesRec = !filterRecorded || l.is_recorded;
    return matchesSearch && matchesCity && matchesAudience && matchesStyle && matchesLang && matchesLive && matchesRec;
  });

  const visibleLessons = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const activeFilters = [filterCity, filterAudience, filterStyle, filterLanguage, filterLive, filterRecorded].filter(Boolean).length;

  const clearFilters = () => {
    setFilterCity(""); setFilterAudience(""); setFilterStyle(""); setFilterLanguage("");
    setFilterLive(false); setFilterRecorded(false); setSearchQuery("");
    setVisibleCount(INITIAL_VISIBLE);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-28 pb-20">
        <div className="container mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <h1 className="font-display text-4xl md:text-6xl font-black text-foreground mb-4">
              מאגר <span className="text-gradient-brand">שיעורי תורה</span>
            </h1>
            <p className="font-body text-lg text-muted-foreground max-w-xl mx-auto">
              מצאו שיעור בכל נושא, בכל מקום, לכל קהל
            </p>
          </motion.div>

          <div className="flex flex-col gap-3 mb-6 max-w-4xl mx-auto">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(INITIAL_VISIBLE); }}
                  placeholder="חיפוש שיעורים — נושא, רב, עיר, סגנון..."
                  className="pr-11 py-6 text-lg"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={`gap-2 py-6 px-5 ${showFilters ? "border-teal/40 text-teal" : ""}`}
              >
                <Filter className="w-4 h-4" />
                סינון
                {activeFilters > 0 && <Badge className="bg-teal/20 text-teal text-xs px-1.5">{activeFilters}</Badge>}
                <ChevronDown aria-hidden="true" className={`w-3 h-3 transition-transform ${showFilters ? "rotate-180" : ""}`} />
              </Button>
              <Link to="/find-lesson">
                <Button className="bg-gradient-teal text-background font-body font-bold hover:opacity-90 py-6 px-6 whitespace-nowrap gap-2">
                  <Search className="w-4 h-4" />
                  חיפוש מתקדם
                </Button>
              </Link>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label htmlFor="filter-city" className="font-body text-xs font-medium text-muted-foreground mb-1.5 block">עיר</label>
                        <select id="filter-city" value={filterCity} onChange={(e) => { setFilterCity(e.target.value); setVisibleCount(INITIAL_VISIBLE); }}
                          className="w-full bg-muted/40 rounded-lg px-3 py-2.5 font-body text-sm border border-border text-foreground">
                          <option value="">הכל</option>
                          {cities.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="filter-audience" className="font-body text-xs font-medium text-muted-foreground mb-1.5 block">קהל יעד</label>
                        <select id="filter-audience" value={filterAudience} onChange={(e) => { setFilterAudience(e.target.value); setVisibleCount(INITIAL_VISIBLE); }}
                          className="w-full bg-muted/40 rounded-lg px-3 py-2.5 font-body text-sm border border-border text-foreground">
                          <option value="">הכל</option>
                          {audiences.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="filter-style" className="font-body text-xs font-medium text-muted-foreground mb-1.5 block">סגנון</label>
                        <select id="filter-style" value={filterStyle} onChange={(e) => { setFilterStyle(e.target.value); setVisibleCount(INITIAL_VISIBLE); }}
                          className="w-full bg-muted/40 rounded-lg px-3 py-2.5 font-body text-sm border border-border text-foreground">
                          <option value="">הכל</option>
                          {styles.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="filter-language" className="font-body text-xs font-medium text-muted-foreground mb-1.5 block">שפה</label>
                        <select id="filter-language" value={filterLanguage} onChange={(e) => { setFilterLanguage(e.target.value); setVisibleCount(INITIAL_VISIBLE); }}
                          className="w-full bg-muted/40 rounded-lg px-3 py-2.5 font-body text-sm border border-border text-foreground">
                          <option value="">הכל</option>
                          {languages.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 font-body text-sm cursor-pointer">
                        <input type="checkbox" checked={filterLive} onChange={(e) => { setFilterLive(e.target.checked); setVisibleCount(INITIAL_VISIBLE); }}
                          className="w-4 h-4 rounded border-border accent-magenta" />
                        <Radio className="w-4 h-4 text-magenta" /> שידור חי בלבד
                      </label>
                      <label className="flex items-center gap-2 font-body text-sm cursor-pointer">
                        <input type="checkbox" checked={filterRecorded} onChange={(e) => { setFilterRecorded(e.target.checked); setVisibleCount(INITIAL_VISIBLE); }}
                          className="w-4 h-4 rounded border-border accent-gold" />
                        <Video className="w-4 h-4 text-gold" /> מוקלט בלבד
                      </label>
                      {activeFilters > 0 && (
                        <button onClick={clearFilters} className="mr-auto font-body text-xs text-muted-foreground hover:text-teal transition-colors">נקה הכל</button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!loading && (
            <div className="flex items-center justify-between max-w-4xl mx-auto mb-6">
              <p className="font-body text-sm text-muted-foreground">{filtered.length} שיעורים נמצאו</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-20">
              <div className="w-12 h-12 rounded-full border-4 border-teal/30 border-t-teal animate-spin mx-auto mb-4" />
              <p className="font-body text-muted-foreground">טוען שיעורים...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-xl font-bold text-foreground mb-2">
                {lessons.length === 0 ? "עדיין אין שיעורים במאגר" : "לא נמצאו תוצאות"}
              </h3>
              <p className="font-body text-muted-foreground mb-6">
                {lessons.length === 0 ? "היו הראשונים להוסיף שיעור!" : "נסו לשנות פרמטרי חיפוש"}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {visibleLessons.map((lesson, i) => (
                  <motion.div
                    key={lesson.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    whileHover={{ y: -4 }}
                    onClick={() => setSelectedLesson(lesson)}
                    role="button"
                    tabIndex={0}
                    aria-label={`פרטי שיעור: ${lesson.subject}`}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedLesson(lesson); } }}
                    className="bg-card rounded-2xl border border-border hover:border-teal/20 shadow-elegant transition-all duration-300 overflow-hidden cursor-pointer group"
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <Badge className="bg-teal/10 text-teal font-body">{lesson.subject}</Badge>
                        <div className="flex gap-1.5">
                          {lesson.is_recorded && <Video className="w-4 h-4 text-gold" />}
                          {lesson.is_live_stream && <Radio className="w-4 h-4 text-magenta animate-pulse" />}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mb-3">
                        {lesson.logo_url ? (
                          <img src={lesson.logo_url} alt={lesson.rabbi_name ? `לוגו ${lesson.rabbi_name}` : "לוגו"} className="w-10 h-10 rounded-lg object-cover border border-border" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-display text-lg font-bold text-foreground group-hover:text-teal transition-colors">{lesson.rabbi_name}</h3>
                          {lesson.rabbi_role && <p className="font-body text-xs text-muted-foreground">{lesson.rabbi_role}</p>}
                        </div>
                      </div>
                      <div className="space-y-1.5 text-sm font-body text-muted-foreground mb-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-teal flex-shrink-0" />
                          <span>{[lesson.city, lesson.neighborhood, lesson.synagogue_name].filter(Boolean).join(", ")}</span>
                        </div>
                        {lesson.is_recurring && lesson.schedule_days && (lesson.schedule_days as any[]).length > 0 && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                            <span>{(lesson.schedule_days as any[]).map((d: any) => `${d.day} ${d.time}`).join(" | ")}</span>
                          </div>
                        )}
                      </div>
                      {lesson.target_audience && lesson.target_audience.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {lesson.target_audience.map(a => (
                            <span key={a} className="px-2 py-0.5 rounded bg-gold/10 text-gold text-xs font-body">{a}</span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-3 border-t border-border">
                        <span className="font-body text-xs text-muted-foreground">{lesson.language}</span>
                        {lesson.lesson_style && <span className="font-body text-xs text-muted-foreground">{lesson.lesson_style}</span>}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center mt-8">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setVisibleCount(prev => prev + LOAD_MORE_COUNT)}
                    className="px-8 py-3 rounded-xl border border-border text-foreground/70 hover:border-primary/30 hover:text-primary font-body font-medium transition-all flex items-center gap-2"
                  >
                    <ChevronDown className="w-4 h-4" aria-hidden="true" />
                    עוד שיעורים
                  </motion.button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <AnimatePresence>
        {selectedLesson && <LessonDetailModal lesson={selectedLesson} onClose={() => setSelectedLesson(null)} />}
      </AnimatePresence>
    </div>
  );
};

export default LessonDirectory;
