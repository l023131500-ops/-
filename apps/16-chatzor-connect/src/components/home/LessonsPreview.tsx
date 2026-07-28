import { motion } from "framer-motion";
import { BookOpen, Clock, MapPin, Users } from "lucide-react";
import { SAMPLE_LESSONS } from "@/data/seed";
import { Section } from "@/components/ui/Section";

export function LessonsPreview() {
  const lessons = SAMPLE_LESSONS;
  return (
    <Section
      id="lessons"
      eyebrow="שיעורי תורה"
      title="שיעורי תורה בקהילה"
      subtitle="לוח השיעורים המרוכז של כל בתי הכנסת ביישוב, מתעדכן על ידי הגבאים."
    >
      <div className="mx-auto grid max-w-4xl gap-4">
        {lessons.map((l, i) => (
          <motion.div
            key={l.id}
            initial={{ opacity: 0, x: -18 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: Math.min(i * 0.08, 0.4), ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-4 rounded-lg border border-border bg-card p-5 shadow-soft transition-colors hover:border-accent/40"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
              <BookOpen className="h-6 w-6" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-lg font-bold text-foreground">{l.title}</h3>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4" aria-hidden /> {l.day} · {l.time}
                </span>
                {l.location && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" aria-hidden /> {l.location}
                  </span>
                )}
                {l.audience && (
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-4 w-4" aria-hidden /> {l.audience}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}
