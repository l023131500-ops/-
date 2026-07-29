import { Link } from "react-router-dom";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * Reusable page for the council's informational sections (halacha, kashrut,
 * mikvaot, mourning guide, newsletter). Content is managed from the admin
 * portal; until it exists, an honest empty state is shown — never fabricated.
 */
export function ContentPage({
  eyebrow,
  title,
  subtitle,
  icon,
  emptyTitle,
  emptyDescription,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <>
      <PageHero eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <div className="container-page py-16">
        <EmptyState icon={icon} title={emptyTitle} description={emptyDescription} />
        <div className="mt-8 text-center">
          <Link to="/#services" className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent/80">
            <ArrowRight className="h-4 w-4" aria-hidden />
            חזרה לשירותי הקהילה
          </Link>
        </div>
      </div>
    </>
  );
}
