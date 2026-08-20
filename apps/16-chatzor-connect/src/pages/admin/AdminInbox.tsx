import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Inbox, Mail, MessageCircleQuestion, Phone } from "lucide-react";
import { markInquiryRead } from "@/data/repositories";
import { useInquiries, useRabbiQuestions } from "@/hooks/useAdminData";
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toaster";

type Tab = "inquiries" | "questions";

export function AdminInbox() {
  const qc = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("inquiries");
  const inquiriesQuery = useInquiries();
  const questionsQuery = useRabbiQuestions();
  const { data: inquiries } = inquiriesQuery;
  const { data: questions } = questionsQuery;

  const markRead = useMutation({
    mutationFn: (id: string) => markInquiryRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inquiries"] }),
    onError: (e: Error) => toast(e.message || "שגיאה בסימון כנקרא", "error"),
  });

  const unread = inquiries?.filter((i) => !i.isRead).length ?? 0;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">תיבת פניות</h1>
      <p className="mt-1 text-muted-foreground">פניות הציבור ושאלות לרב.</p>

      <div className="mt-6 inline-flex rounded-lg border border-border bg-card p-1">
        <button onClick={() => setTab("inquiries")} className={cn("rounded-md px-4 py-2 text-sm font-medium", tab === "inquiries" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
          פניות{" "}
          {/* ‏מונה שנעלם בכשל אומר "אין פניות שלא נקראו" — הוא נשאר, ומודה שהוא לא יודע. */}
          {inquiriesQuery.isError ? (
            <span className="mr-1 rounded-full bg-red-500/15 px-1.5 text-xs text-red-500" title="מספר הפניות שלא נקראו אינו זמין">
              ?
            </span>
          ) : (
            unread > 0 && <span className="mr-1 rounded-full bg-gold px-1.5 text-xs text-gold-foreground">{unread}</span>
          )}
        </button>
        <button onClick={() => setTab("questions")} className={cn("rounded-md px-4 py-2 text-sm font-medium", tab === "questions" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
          שאלות לרב
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {tab === "inquiries" &&
          (inquiriesQuery.isLoading ? (
            <ListSkeleton />
          ) : inquiriesQuery.isError ? (
            /* ‏"אין פניות" על קריאה שנכשלה גורם למנהל לסגור את התיבה
               ‏בזמן שפניות ציבור אמיתיות ממתינות בה. */
            <ErrorState
              title="לא הצלחנו לטעון את הפניות"
              description="התיבה אינה מוצגת כי הקריאה נכשלה — ייתכן שממתינות פניות שלא נקראו."
              onRetry={() => inquiriesQuery.refetch()}
            />
          ) : (inquiries ?? []).length === 0 ? (
            <EmptyState icon={Inbox} title="אין פניות" description="פניות מהאתר יופיעו כאן." />
          ) : (
            inquiries!.map((i) => (
              <div key={i.id} className={cn("rounded-lg border bg-card p-4 shadow-soft", i.isRead ? "border-border" : "border-accent/50")}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-foreground">{i.name}{i.subject ? ` · ${i.subject}` : ""}</div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      {i.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> <span dir="ltr">{i.phone}</span></span>}
                      {i.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> <span dir="ltr">{i.email}</span></span>}
                    </div>
                  </div>
                  {!i.isRead && (
                    <button onClick={() => markRead.mutate(i.id)} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium hover:brightness-95">
                      <Check className="h-3.5 w-3.5" /> סמן כנקרא
                    </button>
                  )}
                </div>
                <p className="mt-2 text-sm text-foreground/90">{i.body}</p>
              </div>
            ))
          ))}

        {tab === "questions" &&
          (questionsQuery.isLoading ? (
            <ListSkeleton />
          ) : questionsQuery.isError ? (
            <ErrorState
              title="לא הצלחנו לטעון את השאלות לרב"
              description="הרשימה אינה מוצגת כי הקריאה נכשלה — ייתכן שממתינות שאלות ללא מענה."
              onRetry={() => questionsQuery.refetch()}
            />
          ) : (questions ?? []).length === 0 ? (
            <EmptyState icon={MessageCircleQuestion} title="אין שאלות" description="שאלות לרב יופיעו כאן." />
          ) : (
            questions!.map((q) => (
              <div key={q.id} className="rounded-lg border border-border bg-card p-4 shadow-soft">
                <div className="text-xs text-muted-foreground">{q.name || "אנונימי"}{q.contact ? ` · ${q.contact}` : ""}</div>
                <p className="mt-1 text-sm text-foreground">{q.question}</p>
              </div>
            ))
          ))}
      </div>
    </div>
  );
}
