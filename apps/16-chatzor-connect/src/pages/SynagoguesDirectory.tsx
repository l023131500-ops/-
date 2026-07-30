import { Building2, LocateFixed, Loader2 } from "lucide-react";
import { useSynagogues } from "@/hooks/useData";
import { useNearby } from "@/hooks/useNearby";
import { PageHero } from "@/components/ui/PageHero";
import { SynagogueCard } from "@/components/SynagogueCard";
import { CardGridSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

export function SynagoguesDirectory() {
  const { data: synagogues, isLoading } = useSynagogues();
  const { state, locate, withDistance } = useNearby();

  const list = withDistance(synagogues ?? []);
  const located = state.status === "ready";

  return (
    <>
      <PageHero
        eyebrow="בתי הכנסת"
        title="בתי הכנסת בחצור הגלילית"
        subtitle="בחרו בית כנסת כדי לצפות באתר החי שלו — זמני תפילה, שיעורים, מודעות ופעילויות."
      />
      <div className="container-page py-16">
        {/* מיון לפי קרבה. המיקום נשאר בדפדפן ואינו נשלח לשום מקום. */}
        {!isLoading && (synagogues ?? []).length > 0 && (
          <div className="mb-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={locate}
              disabled={state.status === "locating"}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-soft transition-colors hover:bg-secondary disabled:opacity-60"
              data-testid="button-locate"
            >
              {state.status === "locating" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <LocateFixed className="h-4 w-4" aria-hidden />
              )}
              {located ? "מוין לפי קרבה אליך" : "מצא את בית הכנסת הקרוב אליי"}
            </button>

            <p className="text-xs text-muted-foreground" data-testid="text-locate-note">
              {state.status === "denied"
                ? "לא ניתנה הרשאת מיקום — הרשימה מוצגת לפי שם."
                : state.status === "unavailable"
                  ? "לא ניתן לקבל מיקום מהדפדפן — הרשימה מוצגת לפי שם."
                  : located
                    ? "המרחק הוא אווירי, לא מרחק הליכה. המיקום שלכם נשאר בדפדפן."
                    : "המיקום נקרא בדפדפן בלבד ואינו נשמר."}
            </p>
          </div>
        )}

        {isLoading ? (
          <CardGridSkeleton count={6} />
        ) : list.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="עדיין לא נוספו בתי כנסת"
            description="בתי הכנסת יתווספו על ידי המועצה הדתית וגבאי הקהילות."
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((s, i) => (
              <SynagogueCard key={s.id} s={s} index={i} meters={s.meters} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
