import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import type { AnnouncementInput } from "@/lib/types";
import { createAnnouncement, deleteAnnouncement } from "@/data/repositories";
import { useAnnouncements } from "@/hooks/useData";
import { useToast } from "@/components/ui/Toaster";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { useGabai } from "./GabaiLayout";
import { NoSynagogue } from "./NoSynagogue";

export function GabaiAnnouncements() {
  const { synagogue } = useGabai();
  const toast = useToast();
  const qc = useQueryClient();
  const { data: items } = useAnnouncements(synagogue?.id);
  const [open, setOpen] = useState(false);

  const create = useMutation({
    mutationFn: (input: AnnouncementInput) => createAnnouncement(input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["announcements"] }); toast("המודעה פורסמה.", "success"); setOpen(false); },
    onError: (e: Error) => toast(e.message, "error"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteAnnouncement(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["announcements"] }); toast("נמחק.", "success"); },
    onError: (e: Error) => toast(e.message, "error"),
  });

  if (!synagogue) return <NoSynagogue />;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const title = String(f.get("title") ?? "").trim();
    if (title.length < 2) { toast("יש להזין כותרת", "error"); return; }
    create.mutate({ synagogueId: synagogue!.id, title, body: String(f.get("body") ?? "") || null });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">מודעות והודעות</h1>
          <p className="mt-1 text-muted-foreground">הודעות למתפללי {synagogue.name}.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> מודעה חדשה</Button>
      </div>

      <div className="mt-6">
        {(items ?? []).length === 0 ? (
          <EmptyState icon={Megaphone} title="אין מודעות" description="פרסמו את המודעה הראשונה." />
        ) : (
          <div className="space-y-3">
            {items!.map((a) => (
              <div key={a.id} className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-soft">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gold/15 text-gold"><Megaphone className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-foreground">{a.title}</div>
                  {a.body && <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>}
                </div>
                <button onClick={() => remove.mutate(a.id)} className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-red-500/10 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="מודעה חדשה">
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="כותרת" htmlFor="title" required><Input id="title" name="title" placeholder="כותרת המודעה" /></Field>
          <Field label="תוכן" htmlFor="body"><Textarea id="body" name="body" placeholder="תוכן ההודעה למתפללים…" /></Field>
          <Button type="submit" disabled={create.isPending} className="w-full">{create.isPending ? "מפרסם…" : "פרסום"}</Button>
        </form>
      </Modal>
    </div>
  );
}
