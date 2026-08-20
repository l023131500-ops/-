import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, ExternalLink, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Lesson {
  id: string;
  rabbi_name: string;
  subject: string;
  city?: string | null;
  neighborhood?: string | null;
  schedule_days?: any;
  specific_date?: string | null;
}

interface Props {
  synagogueName: string;
  logoUrl?: string | null;
  publicUrl: string;
  lessons: Lesson[];
}

export default function SynagogueShowcaseCarousel({ synagogueName, logoUrl, publicUrl, lessons }: Props) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (lessons.length === 0) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % lessons.length), 3500);
    return () => clearInterval(t);
  }, [lessons.length]);

  if (lessons.length < 5) return null;
  const current = lessons[idx];
  const sched = Array.isArray(current?.schedule_days) ? current.schedule_days : [];

  return (
    <div className="bg-gradient-to-br from-[hsl(180_45%_30%)] via-[hsl(180_40%_25%)] to-[hsl(180_30%_20%)] rounded-2xl p-5 shadow-xl border border-[hsl(180_45%_45%)]/30">
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2 text-white">
          <span className="text-[10px] uppercase tracking-wider opacity-70 font-bold">תצוגה מקדימה</span>
          <span className="text-xs opacity-80">— ככה זה ייראה למתפללים</span>
        </div>
        <a href={publicUrl} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="secondary" className="gap-1 text-xs h-8">
            <ExternalLink className="w-3 h-3" /> צפה בעמוד המלא
          </Button>
        </a>
      </div>

      <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
        <div className="flex items-center gap-3 mb-3">
          {logoUrl ? (
            <img src={logoUrl} alt={synagogueName ? `לוגו ${synagogueName}` : "לוגו"} className="w-12 h-12 rounded-lg object-cover border border-white/30" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white/70" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-white font-display font-bold truncate">{synagogueName}</div>
            <div className="text-white/60 text-xs">{lessons.length} שיעורים פעילים</div>
          </div>
        </div>

        <div className="relative h-[110px] overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ x: -40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="absolute inset-0 bg-white rounded-lg p-3"
            >
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <h4 className="font-display font-bold text-sm text-foreground truncate">{current.subject}</h4>
                <Badge variant="outline" className="text-[10px]">{current.rabbi_name}</Badge>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {current.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {[current.city, current.neighborhood].filter(Boolean).join(", ")}
                  </span>
                )}
                {sched.slice(0, 2).map((d: any, i: number) => (
                  <span key={i} className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {d.day} {d.time}
                  </span>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex justify-center gap-1 mt-3">
          {lessons.slice(0, Math.min(lessons.length, 8)).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === idx % Math.min(lessons.length, 8) ? "bg-white w-6" : "bg-white/30 w-1.5"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
