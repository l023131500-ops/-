import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import type { SynagogueInput } from "@/lib/types";
import { updateSynagogue } from "@/data/repositories";
import { useToast } from "@/components/ui/Toaster";
import { SynagogueForm } from "@/pages/admin/SynagogueForm";
import { useGabai } from "./GabaiLayout";
import { useSynagogueGate } from "./SynagogueGate";

export function GabaiDetails() {
  const { synagogue } = useGabai();
  const toast = useToast();
  const qc = useQueryClient();
  const gate = useSynagogueGate();

  const save = useMutation({
    mutationFn: (input: SynagogueInput) => updateSynagogue(synagogue!.id, input),
    onSuccess: () => {
      ["managed-synagogues", "synagogues", "all-synagogues", "synagogue"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast("פרטי בית הכנסת עודכנו.", "success");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  if (gate || !synagogue) return gate;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">פרטי בית הכנסת</h1>
          <p className="mt-1 text-muted-foreground">עדכון הפרטים, המיתוג והעיצוב של דף בית הכנסת.</p>
        </div>
        <a href={`${import.meta.env.BASE_URL}k/${synagogue.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent/80">
          <ExternalLink className="h-4 w-4" /> צפייה בדף החי
        </a>
      </div>
      <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-soft">
        <SynagogueForm key={synagogue.id} initial={synagogue} submitting={save.isPending} onSubmit={(input) => save.mutate(input)} />
      </div>
    </div>
  );
}
