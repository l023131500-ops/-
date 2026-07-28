import { motion } from "framer-motion";
import { HeartHandshake } from "lucide-react";
import { SAMPLE_SERVICES } from "@/data/seed";
import { Section } from "@/components/ui/Section";

export function ServicesPreview() {
  const services = SAMPLE_SERVICES;
  return (
    <Section
      id="services"
      eyebrow="שירותי קהילה"
      title='גמ"חים ושירותי דת'
      subtitle="השירותים שהמועצה הדתית והקהילה מעמידים לרשות התושבים."
      className="bg-secondary/30"
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s, i) => (
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
            <span className="mt-4 inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
              {s.category}
            </span>
            <h3 className="mt-2 font-display text-lg font-bold text-foreground">{s.name}</h3>
            {s.description && <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>}
          </motion.article>
        ))}
      </div>
    </Section>
  );
}
