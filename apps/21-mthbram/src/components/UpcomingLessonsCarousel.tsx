import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Clock, MapPin, Radio, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import LessonDetailModal from "./LessonDetailModal";
import { AnimatePresence } from "framer-motion";

const DAY_ORDER: Record<string, number> = {
  "ראשון": 0, "שני": 1, "שלישי": 2, "רביעי": 3, "חמישי": 4, "שישי": 5, "שבת": 6,
};

const getNextOccurrence = (lesson: any): number => {
  const now = new Date();
  const todayIdx = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  if (lesson.specific_date) return (new Date(lesson.specific_date).getTime() - now.getTime()) / (1000 * 60);
  if (lesson.is_recurring && Array.isArray(lesson.schedule_days)) {
    let minDiff = Infinity;
    for (const d of lesson.schedule_days as { day: string; time: string }[]) {
      const dayIdx = DAY_ORDER[d.day] ?? -1;
      if (dayIdx < 0) continue;
      const [h, m] = (d.time || "00:00").split(":").map(Number);
      const lessonMinutes = (h || 0) * 60 + (m || 0);
      let dayDiff = dayIdx - todayIdx;
      if (dayDiff < 0) dayDiff += 7;
      if (dayDiff === 0 && lessonMinutes <= currentMinutes) dayDiff = 7;
      const total = dayDiff * 24 * 60 + (lessonMinutes - currentMinutes);
      if (total < minDiff) minDiff = total;
    }
    return minDiff;
  }
  return Infinity;
};

const timeLabel = (diff: number) => {
  if (diff === Infinity) return "";
  const hrs = Math.floor(diff / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `בעוד ${days} ימים`;
  if (hrs > 0) return `בעוד ${hrs} שעות`;
  return `בעוד ${diff} דקות`;
};

const MiniCard = ({ lesson, featured, onClick }: { lesson: any; featured?: boolean; onClick: () => void }) => (
  <motion.div
    whileHover={{ y: -4, scale: 1.02 }}
    onClick={onClick}
    className={`cursor-pointer shrink-0 rounded-2xl border transition-all p-4 backdrop-blur-sm ${
      featured
        ? "w-72 border-gold/60 bg-gradient-to-br from-teal-dark/90 via-teal/60 to-navy/80 shadow-gold-ring"
        : "w-64 border-gold/20 bg-card/70 hover:border-gold/40"
    }`}
    style={featured ? { boxShadow: "0 0 40px -8px hsl(var(--gold) / 0.4)" } : undefined}
  >
    <div className="flex items-center justify-between mb-2">
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${featured ? "bg-gold text-navy" : "bg-gold/15 text-gold"}`}>
        {lesson.subject}
      </span>
      <span className={`text-[10px] font-bold ${featured ? "text-gold-cream" : "text-gold"}`}>
        {timeLabel(getNextOccurrence(lesson))}
      </span>
    </div>
    <h3 className={`font-display font-bold leading-tight mb-1 ${featured ? "text-gold-cream text-base" : "text-foreground text-sm"}`}>
      {lesson.rabbi_name}
    </h3>
    {lesson.rabbi_role && (
      <p className="font-body text-[11px] text-muted-foreground mb-2 truncate">{lesson.rabbi_role}</p>
    )}
    <div className="space-y-1 text-[11px] font-body text-muted-foreground">
      <div className="flex items-center gap-1">
        <MapPin className="w-3 h-3 text-gold" />
        <span className="truncate">{[lesson.city, lesson.synagogue_name].filter(Boolean).join(" • ")}</span>
      </div>
      {Array.isArray(lesson.schedule_days) && lesson.schedule_days[0] && (
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-gold" />
          <span>{lesson.schedule_days[0].day} {lesson.schedule_days[0].time}</span>
        </div>
      )}
    </div>
    {lesson.is_live_stream && (
      <div className="flex items-center gap-1 mt-2 text-[10px] text-destructive font-bold animate-pulse">
        <Radio className="w-3 h-3" /> LIVE
      </div>
    )}
  </motion.div>
);

const UpcomingLessonsCarousel = () => {
  const [lessons, setLessons] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("lessons")
        .select("*")
        .eq("is_approved", true)
        .limit(60);
      if (data) {
        const sorted = [...data].sort((a, b) => getNextOccurrence(a) - getNextOccurrence(b));
        setLessons(sorted.slice(0, 20));
      }
    })();
  }, []);

  const doubled = useMemo(() => [...lessons, ...lessons], [lessons]);

  if (lessons.length === 0) return null;

  return (
    <section className="pt-28 pb-8 relative overflow-hidden">
      <div className="absolute top-20 right-1/3 w-[500px] h-[500px] bg-gold/8 rounded-full blur-[140px] pointer-events-none" />
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3 px-4 py-1.5 rounded-full bg-gold/10 border border-gold/30">
            <Sparkles className="w-3.5 h-3.5 text-gold" />
            <span className="font-body text-xs font-bold text-gold-cream">מאגר שיעורי התורה</span>
          </div>
          {/*
            היה h1, וזו הייתה הכותרת הראשית היחידה בעמוד — בתוך קומפוננטה
            שמחזירה null כשאין שיעורים. כלומר הכותרת של הדף נעלמה בדיוק במצב
            שבו המאגר ריק, וזה המצב הנוכחי. עכשיו זו כותרת מקטע (h2), וה-h1
            היציב יושב ב-Index. הסגנון נשמר במחלקות, ולכן חזותית שום דבר לא זז.
          */}
          <h2 className="font-display text-3xl md:text-5xl font-black text-foreground mb-2">
            השיעורים <span className="text-gradient-gold">הקרובים</span>
          </h2>
          <p className="font-body text-sm md:text-base text-muted-foreground">
            השיעור המודגש הוא הקרוב ביותר להתחלה
          </p>
        </motion.div>
      </div>

      {/* marquee track */}
      <div className="relative">
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="flex gap-4 animate-marquee pause-on-hover py-4 px-4" style={{ width: "max-content" }}>
          {doubled.map((l, i) => (
            <MiniCard key={`${l.id}-${i}`} lesson={l} featured={i % lessons.length === 0} onClick={() => setSelected(l)} />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selected && <LessonDetailModal lesson={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </section>
  );
};

export default UpcomingLessonsCarousel;
