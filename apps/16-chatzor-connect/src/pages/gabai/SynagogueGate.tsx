import type { ReactNode } from "react";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { useGabai } from "./GabaiLayout";
import { NoSynagogue } from "./NoSynagogue";

/**
 * ‏השער שכל מסך גבאי עובר בו לפני שהוא מצייר משהו.
 *
 * ‏קודם כל מסך עשה `if (!synagogue) return <NoSynagogue />`, ו-NoSynagogue טוען
 * ‏טענה: "לא שויך בית כנסת — פנו למועצה הדתית". כש-listManagedSynagogues נכשלת
 * ‏`managed` נשאר ריק ו-synagogue הוא null, כלומר גבאי שכן מנהל בית כנסת נשלח
 * ‏להתקשר למועצה הדתית בגלל תקלת רשת. וכל עוד השאילתה בטעינה, אותו מסך הופיע
 * ‏לרגע ואמר את אותו הדבר לפני שידע.
 *
 * ‏מחזיר את מה שיש לצייר במקום המסך, או null כשיש בית כנסת ואפשר להמשיך.
 */
export function useSynagogueGate(): ReactNode | null {
  const { synagogue, isLoading, isError, refetch } = useGabai();

  if (isError) {
    return (
      <ErrorState
        title="לא הצלחנו לטעון את בתי הכנסת שלכם"
        description="המסך אינו מוצג כי הקריאה נכשלה — אין זה אומר שלא שויך לכם בית כנסת. נסו שוב."
        onRetry={() => refetch()}
      />
    );
  }
  if (isLoading) return <ListSkeleton count={2} />;
  if (!synagogue) return <NoSynagogue />;
  return null;
}
