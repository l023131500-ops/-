import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, HeartHandshake } from "lucide-react";
import { useServices } from "@/hooks/useData";
import { Section } from "@/components/ui/Section";
import { Skeleton } from "@/components/ui/Skeleton";

export function ServicesPreview() {
  const { data: services, isLoading } = useServices();
  const shown = (services ?? []).slice(0, 3);

  return (
    <Section
      id="services"
      eyebrow="שירותי קהילה"
      title='גמ"חים ושירותי דת'
      subtitle="השירותים שהמועצה הדתית והקהילה מעמידים לרשות התושבים."
      className="bg-secondary/30"
    >
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44 w-full" />)}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((s, i) => (
            <motion.article
              key={s.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: Math.min(i * 0.08, 0.4), ease: [0.22, 1, 0.36, 1] }}
              className="rounded-lg border border-border bg-card p-6 shadow-soft"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-gold/15 text-gold">
                <HeartHandshake className="h-6 w-6" aria-hidden />
              </span>
              {s.category && (
                <span className="mt-4 inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                  {s.category}
                </span>
              )}
              <h3 className="mt-2 font-display text-lg font-bold text-foreground">{s.name}</h3>
              {s.description && <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>}
            </motion.article>
          ))}
        </div>
      )}

      <div className="mt-10 text-center">
        <Link to="/gemachim" className="link-hit gap-1.5 text-sm font-semibold text-accent hover:text-accent/80">
          לכל הגמ״חים והשירותים
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </Section>
  );
}
