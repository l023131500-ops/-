import { motion } from "framer-motion";
import { Sunrise, Sunset } from "lucide-react";
import { cn } from "@/lib/cn";
import { computeDailyZmanim, formatZman, nextZman } from "@/lib/zmanim";
import { useNow } from "@/hooks/useNow";
import { SITE } from "@/config/site";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

export function ZmanimStrip() {
  const now = useNow(30_000);
  const daily = computeDailyZmanim(now);
  const upcoming = nextZman(daily, now);

  return (
    <Section
      id="zmanim"
      eyebrow="זמני היום"
      title="זמני היום בחצור הגלילית"
      subtitle={`${daily.gregorian} · ${daily.hebrewDate}${daily.parsha ? ` · ${daily.parsha}` : ""}`}
    >
      <Reveal className="mx-auto mb-8 flex max-w-md items-stretch gap-3">
        <div className="flex flex-1 items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-soft">
          <Sunrise className="h-6 w-6 text-gold" aria-hidden />
          <div>
            <div className="text-xs text-muted-foreground">הנץ החמה</div>
            <div className="text-lg font-semibold tabular-nums">{formatZman(daily.sunrise)}</div>
          </div>
        </div>
        <div className="flex flex-1 items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-soft">
          <Sunset className="h-6 w-6 text-accent" aria-hidden />
          <div>
            <div className="text-xs text-muted-foreground">שקיעה</div>
            <div className="text-lg font-semibold tabular-nums">{formatZman(daily.sunset)}</div>
          </div>
        </div>
      </Reveal>

      <div className="mx-auto grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {daily.zmanim.map((z, i) => {
          const isNext = upcoming?.key === z.key;
          return (
            <motion.div
              key={z.key}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: Math.min(i * 0.04, 0.3), ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "relative rounded-lg border p-4 text-center transition-colors",
                isNext
                  ? "border-gold/60 bg-gold/10 shadow-glow"
                  : "border-border bg-card shadow-soft",
              )}
            >
              {isNext && (
                <span className="absolute -top-2 right-3 rounded-full bg-gold px-2 py-0.5 text-[11px] font-semibold text-gold-foreground">
                  הבא בתור
                </span>
              )}
              <div className="text-sm text-muted-foreground">{z.label}</div>
              <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">{formatZman(z.time)}</div>
            </motion.div>
          );
        })}
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        הזמנים מחושבים אוטומטית לפי מיקום {SITE.location.label} ({SITE.location.latitude.toFixed(3)}, {SITE.location.longitude.toFixed(3)}).
        לעניין הלכה למעשה יש לאמת מול לוח הזמנים של בית הכנסת.
      </p>
    </Section>
  );
}
