import { BookOpen, Building2, HeartHandshake, Inbox, MessageCircleQuestion } from "lucide-react";
import { useLessons, useServices } from "@/hooks/useData";
import { useAllSynagogues, useInquiries, useRabbiQuestions } from "@/hooks/useAdminData";
import { useAuth } from "@/lib/auth";

export function AdminOverview() {
  const { isDemo } = useAuth();
  const synagogues = useAllSynagogues();
  const lessons = useLessons();
  const services = useServices();
  const inquiries = useInquiries();
  const questions = useRabbiQuestions();

  const stats = [
    { label: "בתי כנסת", value: synagogues.data?.length ?? 0, icon: Building2, color: "text-accent" },
    { label: "שיעורים", value: lessons.data?.length ?? 0, icon: BookOpen, color: "text-accent" },
    { label: "שירותי קהילה", value: services.data?.length ?? 0, icon: HeartHandshake, color: "text-gold" },
    { label: "פניות שלא נקראו", value: inquiries.data?.filter((i) => !i.isRead).length ?? 0, icon: Inbox, color: "text-accent" },
    { label: "שאלות לרב", value: questions.data?.length ?? 0, icon: MessageCircleQuestion, color: "text-gold" },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">סקירה כללית</h1>
      <p className="mt-1 text-muted-foreground">ניהול המועצה הדתית חצור הגלילית.</p>

      {isDemo && (
        <div className="mt-4 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold">
          מצב הדגמה: השינויים נשמרים בזיכרון הדפדפן בלבד ומתאפסים ברענון. לחיבור קבוע — הגדירו את משתני ה-Supabase.
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className={`h-5 w-5 ${s.color}`} aria-hidden />
            </div>
            <div className="mt-2 text-3xl font-bold tabular-nums text-foreground">{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
