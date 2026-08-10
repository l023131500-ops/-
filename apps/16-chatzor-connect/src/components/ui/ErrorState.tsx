import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * ‏מצב כשל בקריאה — ההפך מ-EmptyState.
 *
 * ‏EmptyState טוען טענה על העולם ("עדיין לא נוספו שירותים"). כשהשאילתה נכשלה
 * ‏`data` נשאר undefined, ומסך שמצייר `data ?? []` היה מציג בדיוק את הטענה הזו
 * ‏על נתון שהוא כלל לא הצליח לקרוא. ה-Toast הגלובלי מודיע פעם אחת ונעלם אחרי
 * ‏חמש שניות; מה שנשאר על המסך חייב להמשיך לומר את האמת.
 */
export function ErrorState({
  title = "לא הצלחנו לטעון את הנתונים",
  description = "ייתכן שיש תקלת רשת זמנית. נסו שוב.",
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "mx-auto max-w-md rounded-lg border border-red-400/50 bg-card px-6 py-12 text-center",
        className,
      )}
      data-testid="state-error"
    >
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-500/10 text-red-500">
        <AlertTriangle className="h-7 w-7" aria-hidden />
      </span>
      <h3 className="mt-4 font-display text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {/* ‏אין כאן מצב "טוען מחדש": refetch מחזיר את השאילתה ל-pending, ולכן
          המסך מחליף את הרכיב הזה בשלד הטעינה שלו ברגע הלחיצה. */}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-soft transition-colors hover:bg-secondary"
          data-testid="button-retry"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          נסו שוב
        </button>
      )}
    </div>
  );
}
