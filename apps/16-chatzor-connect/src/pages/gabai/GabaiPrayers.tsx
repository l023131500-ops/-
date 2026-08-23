import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Plus, Trash2 } from "lucide-react";
import type { PrayerTimeInput, PrayerType } from "@/lib/types";
import { createPrayerTime, deletePrayerTime } from "@/data/repositories";
import { usePrayerTimes } from "@/hooks/useData";
import { useToast } from "@/components/ui/Toaster";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { SampleBadge } from "@/components/ui/SampleBadge";
import { sampleRowProps } from "@/lib/sampleRow";
import { useGabai } from "./GabaiLayout";
import { useSynagogueGate } from "./SynagogueGate";

const TYPE_LABELS: Record<PrayerType, string> = {
  shacharit: "שחרית", mincha: "מנחה", arvit: "ערבית", special: "מיוחד",
};

export function GabaiPrayers() {
  const { synagogue } = useGabai();
  const toast = useToast();
  const qc = useQueryClient();
  const { data: times, isLoading, isError, refetch } = usePrayerTimes(synagogue?.id);
  const [open, setOpen] = useState(false);
  const gate = useSynagogueGate();

  const key = ["prayer-times", synagogue?.id];
  const create = useMutation({
    mutationFn: (input: PrayerTimeInput) => createPrayerTime(input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast("זמן התפילה נוסף.", "success"); setOpen(false); },
    onError: (e: Error) => toast(e.message, "error"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deletePrayerTime(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast("נמחק.", "success"); },
    onError: (e: Error) => toast(e.message, "error"),
  });

  if (gate || !synagogue) return gate;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const time = String(f.get("time") ?? "").trim();
    const label = String(f.get("label") ?? "").trim();
    if (!/^\d{1,2}:\d{2}$/.test(time)) { toast("יש להזין שעה בפורמט HH:MM", "error"); return; }
    if (!label) { toast("יש להזין שם לתפילה", "error"); return; }
    create.mutate({
      synagogueId: synagogue!.id,
      type: String(f.get("type") ?? "shacharit") as PrayerType,
      label, time,
      note: String(f.get("note") ?? "") || null,
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">זמני תפילה</h1>
          <p className="mt-1 text-muted-foreground">{synagogue.name}</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> זמן תפילה חדש</Button>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <ListSkeleton count={3} />
        ) : isError ? (
          /* ‏"אין זמני תפילה" על קריאה שנכשלה מוביל את הגבאי להזין מחדש זמנים
             ‏שכבר קיימים, ולפרסם למתפללים לוח כפול. */
          <ErrorState
            title="לא הצלחנו לטעון את זמני התפילה"
            description="הרשימה אינה מוצגת כי הקריאה נכשלה — ייתכן שכבר קיימים זמנים. נסו שוב לפני הוספת זמן."
            onRetry={() => refetch()}
          />
        ) : (times ?? []).length === 0 ? (
          <EmptyState icon={Clock} title="אין זמני תפילה" description="הוסיפו את זמן התפילה הראשון." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
            <ul className="divide-y divide-border">
              {times!.map((p) => (
                <li key={p.id} className="flex items-center gap-3 p-4">
                  <span className="rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground">{TYPE_LABELS[p.type]}</span>
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-foreground">{p.label}</span>
                    {p.note && <span className="text-xs text-muted-foreground"> · {p.note}</span>}
                    {p.isSample && <SampleBadge className="ms-2" />}
                  </div>
                  <span className="text-lg font-bold tabular-nums">{p.time}</span>
                  <button onClick={() => remove.mutate(p.id)} {...sampleRowProps(p.isSample)} disabled={p.isSample || (remove.isPending && remove.variables === p.id)}><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="זמן תפילה חדש">
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="סוג התפילה" htmlFor="type">
            <Select id="type" name="type">
              {(Object.keys(TYPE_LABELS) as PrayerType[]).map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="שם התפילה" htmlFor="label" required><Input id="label" name="label" placeholder="שחרית א׳" /></Field>
            <Field label="שעה" htmlFor="time" required><Input id="time" name="time" placeholder="06:00" dir="ltr" /></Field>
          </div>
          <Field label="הערה" htmlFor="note"><Input id="note" name="note" placeholder="ותיקין / בימים א׳-ה׳" /></Field>
          <Button type="submit" disabled={create.isPending} className="w-full">{create.isPending ? "שומר…" : "הוספה"}</Button>
        </form>
      </Modal>
    </div>
  );
}
