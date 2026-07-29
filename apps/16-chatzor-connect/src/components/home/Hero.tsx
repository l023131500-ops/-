import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { CalendarDays, ChevronDown, Clock } from "lucide-react";
import { SITE } from "@/config/site";
import { computeDailyZmanim, formatZman, nextZman } from "@/lib/zmanim";
import { useNow } from "@/hooks/useNow";
import { Button } from "@/components/ui/Button";

export function Hero() {
  const navigate = useNavigate();
  const now = useNow(30_000);
  const reduce = useReducedMotion();
  const daily = computeDailyZmanim(now);
  const upcoming = nextZman(daily, now);

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.12, delayChildren: 0.05 } },
  };
  const item = {
    hidden: { opacity: 0, y: reduce ? 0 : 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
  };

  return (
    <section className="relative overflow-hidden bg-[hsl(209_63%_13%)] text-white">
      {/* layered, calm background — glow + faint grid + slow gold sweep */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_-10%,hsl(var(--accent)/0.28),transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(hsl(0_0%_100%)_1px,transparent_1px),linear-gradient(90deg,hsl(0_0%_100%)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--gold)/0.8),transparent)] bg-[length:200%_100%] animate-gold-sweep" />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="container-page relative flex flex-col items-center py-24 text-center sm:py-32"
      >
        <motion.span
          variants={item}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm text-white/80 backdrop-blur"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden />
          {SITE.org}
        </motion.span>

        <motion.h1
          variants={item}
          className="mt-6 max-w-3xl font-display text-4xl font-bold leading-tight sm:text-6xl"
        >
          {SITE.name} — כל התורה והקהילה של חצור הגלילית במקום אחד
        </motion.h1>

        <motion.p variants={item} className="mt-5 max-w-xl text-lg text-white/75">
          {SITE.description}
        </motion.p>

        <motion.div variants={item} className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button variant="gold" size="lg" onClick={() => navigate("/batei-knesset")}>
            מצא בית כנסת
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="border-white/25 text-white hover:bg-white/10"
            onClick={() => document.getElementById("zmanim")?.scrollIntoView({ behavior: "smooth" })}
          >
            זמני היום
          </Button>
        </motion.div>

        {/* live status chips — real computed data */}
        <motion.div variants={item} className="mt-10 flex flex-wrap items-center justify-center gap-3 text-sm">
          <span className="inline-flex items-center gap-2 rounded-lg border border-white/12 bg-white/5 px-4 py-2 backdrop-blur">
            <CalendarDays className="h-4 w-4 text-gold" aria-hidden />
            <span className="text-white/80">{daily.hebrewDate}</span>
            {daily.parsha && <span className="text-white/50">· {daily.parsha}</span>}
          </span>
          {upcoming && (
            <span className="inline-flex items-center gap-2 rounded-lg border border-white/12 bg-white/5 px-4 py-2 backdrop-blur">
              <Clock className="h-4 w-4 text-gold" aria-hidden />
              <span className="text-white/80">הזמן הבא: {upcoming.label}</span>
              <span className="font-semibold text-white tabular-nums">{formatZman(upcoming.time)}</span>
            </span>
          )}
        </motion.div>
      </motion.div>

      <a
        href="#zmanim"
        className="absolute inset-x-0 bottom-5 mx-auto grid w-10 place-items-center text-white/50 transition-colors hover:text-white"
        aria-label="גלול לזמני היום"
      >
        <ChevronDown className="h-6 w-6 animate-bounce" />
      </a>
    </section>
  );
}
