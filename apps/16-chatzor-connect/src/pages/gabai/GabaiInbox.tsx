import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Inbox, Mail, Phone } from "lucide-react";
import { markInquiryRead } from "@/data/repositories";
import { useInquiries } from "@/hooks/useAdminData";
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { useGabai } from "./GabaiLayout";
import { useSynagogueGate } from "./SynagogueGate";

export function GabaiInbox() {
  const { synagogue } = useGabai();
  const qc = useQueryClient();
  const { data: all, isLoading, isError, refetch } = useInquiries();
  const gate = useSynagogueGate();

  const markRead = useMutation({
    mutationFn: (id: string) => markInquiryRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inquiries"] }),
  });

  if (gate || !synagogue) return gate;

  const inquiries = (all ?? []).filter((i) => i.synagogueId === synagogue.id);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">פניות</h1>
      <p className="mt-1 text-muted-foreground">פניות שהתקבלו דרך דף בית הכנסת.</p>

      <div className="mt-6 space-y-3">
        {isLoading ? (
          <ListSkeleton count={3} />
        ) : isError ? (
          /* ‏"אין פניות" על קריאה שנכשלה גורם לגבאי לסגור את התיבה בזמן
             ‏שפניות של מתפללים ממתינות בה ללא מענה. */
          <ErrorState
            title="לא הצלחנו לטעון את הפניות"
            description="התיבה אינה מוצגת כי הקריאה נכשלה — ייתכן שממתינות פניות שלא נקראו."
            onRetry={() => refetch()}
          />
        ) : inquiries.length === 0 ? (
          <EmptyState icon={Inbox} title="אין פניות" description="פניות מדף בית הכנסת יופיעו כאן." />
        ) : (
          inquiries.map((i) => (
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
                    <Check className="h-3.5 w-3.5" /> נקרא
                  </button>
                )}
              </div>
              <p className="mt-2 text-sm text-foreground/90">{i.body}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
