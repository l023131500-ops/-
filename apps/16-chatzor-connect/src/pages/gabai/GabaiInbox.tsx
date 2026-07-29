import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Inbox, Mail, Phone } from "lucide-react";
import { markInquiryRead } from "@/data/repositories";
import { useInquiries } from "@/hooks/useAdminData";
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/ui/EmptyState";
import { useGabai } from "./GabaiLayout";
import { NoSynagogue } from "./NoSynagogue";

export function GabaiInbox() {
  const { synagogue } = useGabai();
  const qc = useQueryClient();
  const { data: all } = useInquiries();

  const markRead = useMutation({
    mutationFn: (id: string) => markInquiryRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inquiries"] }),
  });

  if (!synagogue) return <NoSynagogue />;

  const inquiries = (all ?? []).filter((i) => i.synagogueId === synagogue.id);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">פניות</h1>
      <p className="mt-1 text-muted-foreground">פניות שהתקבלו דרך דף בית הכנסת.</p>

      <div className="mt-6 space-y-3">
        {inquiries.length === 0 ? (
          <EmptyState icon={Inbox} title="אין פניות" description="פניות מדף בית הכנסת יופיעו כאן." />
        ) : (
          inquiries.map((i) => (
            <div key={i.id} className={cn("rounded-lg border bg-card p-4 shadow-soft", i.isRead ? "border-border" : "border-accent/50")}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-foreground">{i.name}{i.subject ? ` · ${i.subject}` : ""}</div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    {i.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {i.phone}</span>}
                    {i.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {i.email}</span>}
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
