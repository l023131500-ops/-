import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useSynagogues } from "@/hooks/useData";
import { Section } from "@/components/ui/Section";
import { SynagogueCard } from "@/components/SynagogueCard";
import { CardGridSkeleton } from "@/components/ui/Skeleton";

export function SynagoguesPreview() {
  const { data: synagogues, isLoading } = useSynagogues();
  const shown = (synagogues ?? []).slice(0, 6);

  return (
    <Section
      id="synagogues"
      eyebrow="בתי הכנסת"
      title="בתי הכנסת בחצור הגלילית"
      subtitle="לכל בית כנסת דף חי משלו — זמני תפילה, שיעורים, מודעות ופעילויות, בעיצוב ובלוגו שלו."
      className="bg-secondary/30"
    >
      {isLoading ? (
        <CardGridSkeleton count={3} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((s, i) => (
            <SynagogueCard key={s.id} s={s} index={i} />
          ))}
        </div>
      )}

      <div className="mt-10 text-center">
        <Link
          to="/batei-knesset"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent/80"
        >
          לכל בתי הכנסת
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </Section>
  );
}
