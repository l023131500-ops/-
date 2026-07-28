import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import type { LessonInput } from "@/lib/types";
import { createLesson, deleteLesson } from "@/data/repositories";
import { useLessons } from "@/hooks/useData";
import { useToast } from "@/components/ui/Toaster";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { useGabai } from "./GabaiLayout";
import { NoSynagogue } from "./NoSynagogue";

export function GabaiLessons() {
  const { synagogue } = useGabai();
  const toast = useToast();
  const qc = useQueryClient();
  const { data: lessons } = useLessons(synagogue?.id);
  const [open, setOpen] = useState(false);

  const create = useMutation({
    mutationFn: (input: LessonInput) => createLesson(input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lessons"] }); toast("השיעור נוסף.", "success"); setOpen(false); },
    onError: (e: Error) => toast(e.message, "error"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteLesson(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lessons"] }); toast("נמחק.", "success"); },
    onError: (e: Error) => toast(e.message, "error"),
  });

  if (!synagogue) return <NoSynagogue />;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const title = String(f.get("title") ?? "").trim();
    if (title.length < 2) { toast("יש להזין כותרת", "error"); return; }
    create.mutate({
      title, synagogueId: synagogue!.id,
      day: String(f.get("day") ?? "") || undefined,
      time: String(f.get("time") ?? "") || undefined,
      teacher: String(f.get("teacher") ?? "") || null,
      audience: String(f.get("audience") ?? "") || null,
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">שיעורים</h1>
          <p className="mt-1 text-muted-foreground">{synagogue.name}</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> שיעור חדש</Button>
      </div>

      <div className="mt-6">
        {(lessons ?? []).length === 0 ? (
          <EmptyState icon={BookOpen} title="אין שיעורים" description="הוסיפו שיעור." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
            <ul className="divide-y divide-border">
              {lessons!.map((l) => (
                <li key={l.id} className="flex items-center gap-3 p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent"><BookOpen className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-foreground">{l.title}</div>
                    <div className="text-xs text-muted-foreground">{[l.day, l.time, l.teacher, l.audience].filter(Boolean).join(" · ")}</div>
                  </div>
                  <button onClick={() => remove.mutate(l.id)} className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-red-500/10 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="שיעור חדש">
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="כותרת" htmlFor="title" required><Input id="title" name="title" placeholder="דף היומי" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="יום" htmlFor="day"><Input id="day" name="day" placeholder="יום שלישי / כל יום" /></Field>
            <Field label="שעה" htmlFor="time"><Input id="time" name="time" placeholder="20:00" dir="ltr" /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="מגיד השיעור" htmlFor="teacher"><Input id="teacher" name="teacher" placeholder="הרב ..." /></Field>
            <Field label="קהל יעד" htmlFor="audience"><Input id="audience" name="audience" placeholder="לכל הציבור" /></Field>
          </div>
          <Button type="submit" disabled={create.isPending} className="w-full">{create.isPending ? "שומר…" : "הוספה"}</Button>
        </form>
      </Modal>
    </div>
  );
}
