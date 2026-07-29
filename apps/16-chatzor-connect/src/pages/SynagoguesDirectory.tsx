import { Building2 } from "lucide-react";
import { useSynagogues } from "@/hooks/useData";
import { PageHero } from "@/components/ui/PageHero";
import { SynagogueCard } from "@/components/SynagogueCard";
import { CardGridSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

export function SynagoguesDirectory() {
  const { data: synagogues, isLoading } = useSynagogues();

  return (
    <>
      <PageHero
        eyebrow="בתי הכנסת"
        title="בתי הכנסת בחצור הגלילית"
        subtitle="בחרו בית כנסת כדי לצפות באתר החי שלו — זמני תפילה, שיעורים, מודעות ופעילויות."
      />
      <div className="container-page py-16">
        {isLoading ? (
          <CardGridSkeleton count={6} />
        ) : (synagogues ?? []).length === 0 ? (
          <EmptyState
            icon={Building2}
            title="עדיין לא נוספו בתי כנסת"
            description="בתי הכנסת יתווספו על ידי המועצה הדתית וגבאי הקהילות."
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {synagogues!.map((s, i) => (
              <SynagogueCard key={s.id} s={s} index={i} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
