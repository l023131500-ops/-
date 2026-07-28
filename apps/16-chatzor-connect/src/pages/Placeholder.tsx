import { Link } from "react-router-dom";
import { ArrowRight, Hammer } from "lucide-react";

/**
 * Dignified "coming soon" page for routes whose full build lands in later phases
 * (synagogue mini-sites, admin, gabai portal). Documents what will live here.
 */
export function Placeholder({ title, description, phase }: { title: string; description: string; phase: string }) {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-secondary text-accent">
        <Hammer className="h-8 w-8" aria-hidden />
      </span>
      <span className="mt-6 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
        {phase}
      </span>
      <h1 className="mt-4 font-display text-3xl font-bold text-foreground sm:text-4xl">{title}</h1>
      <p className="mt-4 max-w-md text-muted-foreground">{description}</p>
      <Link
        to="/"
        className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-soft transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <ArrowRight className="h-4 w-4" aria-hidden />
        חזרה לעמוד הראשי
      </Link>
    </div>
  );
}
