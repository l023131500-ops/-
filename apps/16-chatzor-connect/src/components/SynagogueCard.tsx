import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Navigation } from "lucide-react";
import type { Synagogue } from "@/lib/types";
import { formatDistance, navigationUrl } from "@/hooks/useNearby";

/** Shared synagogue card — used on the homepage preview and the directory page. */
export function SynagogueCard({
  s,
  index = 0,
  meters = null,
}: {
  s: Synagogue;
  index?: number;
  /** מרחק אווירי מהמבקר, כשהוא אישר מיקום. null = לא נמדד. */
  meters?: number | null;
}) {
  const navUrl = navigationUrl(s);
  const initial = s.name.replace(/^בית (ה)?כנסת |^בית המדרש /, "").charAt(0);
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay: Math.min(index * 0.06, 0.4), ease: [0.22, 1, 0.36, 1] }}
      className="group overflow-hidden rounded-lg border border-border bg-card shadow-soft transition-shadow hover:shadow-glow"
    >
      <div className="relative h-24" style={{ background: s.brandGradient }}>
        {s.isSample && (
          <span className="absolute right-3 top-3 rounded-full bg-black/30 px-2 py-0.5 text-[11px] text-white backdrop-blur">
            דוגמה
          </span>
        )}
        {s.logoUrl ? (
          <img
            src={s.logoUrl}
            alt={`לוגו ${s.name}`}
            loading="lazy"
            className="absolute -bottom-6 right-5 h-12 w-12 rounded-xl border border-border bg-card object-cover shadow-soft"
          />
        ) : (
          <div className="absolute -bottom-6 right-5 grid h-12 w-12 place-items-center rounded-xl border border-border bg-card font-display text-lg font-bold text-primary shadow-soft">
            {initial}
          </div>
        )}
      </div>
      <div className="p-5 pt-8">
        <h3 className="font-display text-xl font-bold text-foreground">{s.name}</h3>
        {s.nusach && (
          <span className="mt-2 inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
            נוסח {s.nusach}
          </span>
        )}
        {s.description && <p className="mt-3 text-sm text-muted-foreground">{s.description}</p>}
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          {s.address ?? "כתובת לא זמינה"}
        </p>

        {meters != null && (
          <p className="mt-2 text-xs font-semibold text-accent" data-testid="synagogue-distance">
            {formatDistance(meters)} ממך · מרחק אווירי
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Link
            to={`/k/${s.slug}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent transition-colors hover:text-accent/80"
          >
            לאתר בית הכנסת
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden />
          </Link>
          {navUrl && (
            <a
              href={navUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              data-testid="synagogue-navigate"
            >
              <Navigation className="h-3.5 w-3.5" aria-hidden />
              ניווט
            </a>
          )}
        </div>
      </div>
    </motion.article>
  );
}
