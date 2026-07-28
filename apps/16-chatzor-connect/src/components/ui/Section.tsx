import { type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Reveal } from "./Reveal";

/** A page section with a consistent eyebrow / title / subtitle header. */
export function Section({
  id,
  eyebrow,
  title,
  subtitle,
  children,
  className,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("py-16 sm:py-20", className)}>
      <div className="container-page">
        <Reveal className="mx-auto mb-10 max-w-2xl text-center">
          {eyebrow && (
            <span className="eyebrow justify-center">
              <span className="h-px w-6 bg-accent" aria-hidden />
              {eyebrow}
            </span>
          )}
          <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">{title}</h2>
          {subtitle && <p className="mt-3 text-muted-foreground">{subtitle}</p>}
        </Reveal>
        {children}
      </div>
    </section>
  );
}
