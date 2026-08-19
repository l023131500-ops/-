import { AlertTriangle, BookOpen, Building2, HeartHandshake, Inbox, MessageCircleQuestion, RefreshCw } from "lucide-react";
import { useLessons, useServices } from "@/hooks/useData";
import { useAllSynagogues, useInquiries, useRabbiQuestions } from "@/hooks/useAdminData";
import { useAuth } from "@/lib/auth";
import { Skeleton } from "@/components/ui/Skeleton";

export function AdminOverview() {
  const { isDemo } = useAuth();
  const synagogues = useAllSynagogues();
  const lessons = useLessons();
  const services = useServices();
  const inquiries = useInquiries();
  const questions = useRabbiQuestions();

  /* ‏`data?.length ?? 0` הפך כל קריאה שנכשלה ל-"0" — מספר שנראה כמו מדידה
     ‏ואינו כזה. אריח שהשאילתה שלו נכשלה אומר "לא זמין" ולא מספר. */
  const stats = [
    { label: "בתי כנסת", query: synagogues, count: () => synagogues.data!.length, icon: Building2, color: "text-accent" },
    { label: "שיעורים", query: lessons, count: () => lessons.data!.length, icon: BookOpen, color: "text-accent" },
    { label: "שירותי קהילה", query: services, count: () => services.data!.length, icon: HeartHandshake, color: "text-gold" },
    { label: "פניות שלא נקראו", query: inquiries, count: () => inquiries.data!.filter((i) => !i.isRead).length, icon: Inbox, color: "text-accent" },
    { label: "שאלות לרב", query: questions, count: () => questions.data!.length, icon: MessageCircleQuestion, color: "text-gold" },
  ];

  const failed = stats.filter((s) => s.query.isError);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">סקירה כללית</h1>
      <p className="mt-1 text-muted-foreground">ניהול המועצה הדתית חצור הגלילית.</p>

      {isDemo && (
        <div className="mt-4 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold">
          מצב הדגמה: השינויים נשמרים בזיכרון הדפדפן בלבד ומתאפסים ברענון. לחיבור קבוע — הגדירו את משתני ה-Supabase.
        </div>
      )}

      {failed.length > 0 && (
        <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-red-400/50 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          <span className="flex-1">
            {failed.length === stats.length
              ? "אף אחד מהנתונים בסקירה לא נטען — כל האריחים מסומנים ״לא זמין״."
              : `${failed.length} מתוך ${stats.length} מהנתונים בסקירה לא נטענו ומסומנים ״לא זמין״.`}
          </span>
          <button
            type="button"
            onClick={() => failed.forEach((s) => s.query.refetch())}
            className="inline-flex items-center gap-1.5 rounded-md border border-red-400/50 px-2.5 py-1 font-semibold hover:bg-red-500/10"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            נסו שוב
          </button>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className={`h-5 w-5 ${s.color}`} aria-hidden />
            </div>
            {s.query.isError ? (
              <div className="mt-2 text-xl font-bold text-red-500" data-testid="stat-unavailable">לא זמין</div>
            ) : s.query.isPending ? (
              <Skeleton className="mt-3 h-7 w-16" />
            ) : (
              <div className="mt-2 text-3xl font-bold tabular-nums text-foreground">{s.count()}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
