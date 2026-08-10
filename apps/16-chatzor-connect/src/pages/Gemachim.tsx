import { motion } from "framer-motion";
import { HeartHandshake, Phone } from "lucide-react";
import { useServices } from "@/hooks/useData";
import { PageHero } from "@/components/ui/PageHero";
import { CardGridSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SampleBadge } from "@/components/ui/SampleBadge";

export function Gemachim() {
  const { data: services, isLoading, isError, refetch } = useServices();

  return (
    <>
      <PageHero
        eyebrow="גמ״חים ושירותי דת"
        title="גמ״חים ושירותי דת"
        subtitle="השירותים שהמועצה הדתית והקהילה מעמידים לרשות תושבי חצור הגלילית."
      />
      <div className="container-page py-16">
        {isLoading ? (
          <CardGridSkeleton count={6} />
        ) : isError ? (
          <ErrorState
            title="לא הצלחנו לטעון את השירותים"
            description="הרשימה לא נקראה מהמסד, ולכן איננו יודעים אילו שירותים קיימים."
            onRetry={() => refetch()}
          />
        ) : (services ?? []).length === 0 ? (
          <EmptyState icon={HeartHandshake} title="עדיין לא נוספו שירותים" description="השירותים והגמ״חים יתווספו על ידי המועצה הדתית." />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services!.map((s, i) => (
              <motion.article
                key={s.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: Math.min(i * 0.06, 0.4), ease: [0.22, 1, 0.36, 1] }}
                className="rounded-lg border border-border bg-card p-6 shadow-soft"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-gold/15 text-gold">
                  <HeartHandshake className="h-6 w-6" aria-hidden />
                </span>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {s.category && (
                    <span className="inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                      {s.category}
                    </span>
                  )}
                  {s.isSample && <SampleBadge />}
                </div>
                <h3 className="mt-2 font-display text-lg font-bold text-foreground">{s.name}</h3>
                {s.description && <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>}
                {s.contact && (
                  <a href={`tel:${s.contact}`} className="mt-4 link-hit gap-1.5 text-sm font-semibold text-accent hover:text-accent/80">
                    <Phone className="h-4 w-4" aria-hidden /> {s.contact}
                  </a>
                )}
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
