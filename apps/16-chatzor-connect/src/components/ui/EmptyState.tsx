import { type LucideIcon } from "lucide-react";

/** Honest empty state — used when a section has no real content yet (managed by the council). */
export function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description?: string }) {
  return (
    <div className="mx-auto max-w-md rounded-lg border border-dashed border-border bg-card/50 px-6 py-12 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-muted-foreground">
        <Icon className="h-7 w-7" aria-hidden />
      </span>
      <h3 className="mt-4 font-display text-lg font-bold text-foreground">{title}</h3>
      {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}
