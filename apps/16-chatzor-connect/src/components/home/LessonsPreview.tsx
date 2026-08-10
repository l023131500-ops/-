import { motion } from "framer-motion";
import { BookOpen, Clock, MapPin, Users } from "lucide-react";
import { useLessons } from "@/hooks/useData";
import { Section } from "@/components/ui/Section";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SampleBadge } from "@/components/ui/SampleBadge";

export function LessonsPreview() {
  const { data: lessons, isLoading, isError, refetch } = useLessons();

  return (
    <Section
      id="lessons"
      eyebrow="שיעורי תורה"
      title="שיעורי תורה בקהילה"
      subtitle="לוח השיעורים המרוכז של כל בתי הכנסת ביישוב, מתעדכן על ידי הגבאים."
    >
      <div className="mx-auto grid max-w-4xl gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
        ) : isError ? (
          <ErrorState
            title="לא הצלחנו לטעון את לוח השיעורים"
            onRetry={() => refetch()}
          />
        ) : (lessons ?? []).length === 0 ? (
          <EmptyState icon={BookOpen} title="עדיין לא נוספו שיעורים" description="השיעורים יתווספו על ידי גבאי בתי הכנסת." />
        ) : (
          lessons!.map((l, i) => (
            <motion.div
              key={l.id}
              initial={{ opacity: 0, x: -18 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: Math.min(i * 0.06, 0.4), ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-4 rounded-lg border border-border bg-card p-5 shadow-soft transition-colors hover:border-accent/40"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                <BookOpen className="h-6 w-6" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-lg font-bold text-foreground">{l.title}</h3>
                  {l.isSample && <SampleBadge />}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {(l.day || l.time) && (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-4 w-4" aria-hidden /> {[l.day, l.time].filter(Boolean).join(" · ")}
                    </span>
                  )}
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
          ))
        )}
      </div>
    </Section>
  );
}
