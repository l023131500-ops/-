import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, MapPin, Clock, User, Users, GraduationCap } from 'lucide-react';
import { useSynagogues } from '@/hooks/useSynagogues';

interface LessonEntry {
  subject: string;
  teacher: string;
  day: string;
  time: string;
  audience?: string;
  synagogueName: string;
}

const LessonsTicker = () => {
  const { synagogues } = useSynagogues();
  const [index, setIndex] = useState(0);

  const lessons: LessonEntry[] = useMemo(() =>
    synagogues.flatMap(s =>
      s.lessons.map(l => ({
        ...l,
        audience: l.audience || 'כללי',
        synagogueName: s.name,
      }))
    ), [synagogues]);

  useEffect(() => {
    if (lessons.length <= 1) return;
    const timer = setInterval(() => {
      setIndex(prev => (prev + 1) % lessons.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [lessons.length]);

  if (lessons.length === 0) return null;

  const lesson = lessons[index];

  return (
    <div className="w-full rounded-2xl bg-gradient-to-l from-primary/10 via-card to-primary/5 border border-primary/15 shadow-card backdrop-blur-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-2.5 bg-primary/8 border-b border-primary/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-display font-black text-foreground">שיעורי תורה קרובים</span>
        </div>
        <div className="flex items-center gap-1.5">
          {lessons.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? 'bg-primary w-4' : 'bg-border w-1.5 hover:bg-muted-foreground'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="h-[72px] relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 px-5 py-3 flex items-center"
          >
            <div className="flex flex-wrap items-center gap-2 w-full">
              <span className="inline-flex items-center gap-1.5 bg-primary/12 text-primary border border-primary/20 font-black text-sm px-3.5 py-1.5 rounded-xl">
                <BookOpen className="w-3.5 h-3.5" />
                {lesson.subject}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-accent/10 text-accent-foreground border border-accent/20 font-black text-sm px-3.5 py-1.5 rounded-xl">
                <User className="w-3.5 h-3.5 text-accent" />
                {lesson.teacher}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-secondary text-secondary-foreground border border-border/40 font-bold text-sm px-3.5 py-1.5 rounded-xl">
                <Users className="w-3.5 h-3.5" />
                {lesson.audience}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-muted text-foreground border border-border/30 font-bold text-sm px-3.5 py-1.5 rounded-xl">
                <MapPin className="w-3.5 h-3.5" />
                {lesson.synagogueName}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground font-black text-sm px-3.5 py-1.5 rounded-xl mr-auto shadow-sm">
                <Clock className="w-3.5 h-3.5" />
                {lesson.day} • {lesson.time}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LessonsTicker;
