import { type ReactNode } from "react";
import { Reveal } from "./Reveal";

/** Compact interior-page header band (dignified, always-dark like the home hero). */
export function PageHero({ eyebrow, title, subtitle, children }: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-[hsl(209_63%_13%)] text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_-10%,hsl(var(--accent)/0.25),transparent_70%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--gold)/0.7),transparent)] bg-[length:200%_100%] animate-gold-sweep" />
      </div>
      <div className="container-page relative py-16 text-center sm:py-20">
        <Reveal>
          {eyebrow && (
            <span className="eyebrow justify-center text-gold">
              <span className="h-px w-6 bg-gold/70" aria-hidden />
              {eyebrow}
            </span>
          )}
          <h1 className="mt-3 font-display text-3xl font-bold sm:text-5xl">{title}</h1>
          {subtitle && <p className="mx-auto mt-4 max-w-2xl text-white/75">{subtitle}</p>}
          {children && <div className="mt-6">{children}</div>}
        </Reveal>
      </div>
    </section>
  );
}
