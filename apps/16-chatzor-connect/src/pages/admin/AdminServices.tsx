import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HeartHandshake, Plus, Trash2 } from "lucide-react";
import type { ServiceInput } from "@/lib/types";
import { createService, deleteService } from "@/data/repositories";
import { useServices } from "@/hooks/useData";
import { useToast } from "@/components/ui/Toaster";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { CardGridSkeleton } from "@/components/ui/Skeleton";
import { SampleBadge } from "@/components/ui/SampleBadge";
import { sampleRowProps } from "@/lib/sampleRow";

const CATEGORIES = ['גמ"ח', "שירות דת", "חסד", "בריאות", "חינוך"];

export function AdminServices() {
  const toast = useToast();
  const qc = useQueryClient();
  const { data: services, isLoading, isError, refetch } = useServices();
  const [open, setOpen] = useState(false);

  const create = useMutation({
    mutationFn: (input: ServiceInput) => createService(input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["services"] }); toast("השירות נוסף.", "success"); setOpen(false); },
    onError: (e: Error) => toast(e.message, "error"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteService(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["services"] }); toast("השירות נמחק.", "success"); },
    onError: (e: Error) => toast(e.message, "error"),
  });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") ?? "").trim();
    if (name.length < 2) { toast("יש להזין שם", "error"); return; }
    create.mutate({
      name,
      category: String(f.get("category") ?? CATEGORIES[0]),
      description: String(f.get("description") ?? "") || null,
      contact: String(f.get("contact") ?? "") || null,
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">גמ״חים ושירותי דת</h1>
          <p className="mt-1 text-muted-foreground">השירותים שהמועצה הדתית מעמידה לתושבים.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> שירות חדש</Button>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <CardGridSkeleton count={3} />
        ) : isError ? (
          <ErrorState
            title="לא הצלחנו לטעון את השירותים"
            description="הרשימה אינה מוצגת כי הקריאה נכשלה — ייתכן שיש שירותים קיימים. נסו שוב לפני הוספת שירות."
            onRetry={() => refetch()}
          />
        ) : (services ?? []).length === 0 ? (
          <EmptyState icon={HeartHandshake} title="אין שירותים" description="הוסיפו את השירות הראשון." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
            <ul className="divide-y divide-border">
              {services!.map((s) => (
                <li key={s.id} className="flex items-center gap-3 p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gold/15 text-gold"><HeartHandshake className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{s.name} <span className="text-xs font-normal text-muted-foreground">· {s.category}</span></span>
                      {s.isSample && <SampleBadge />}
                    </div>
                    {s.description && <div className="truncate text-xs text-muted-foreground">{s.description}</div>}
                  </div>
                  <button onClick={() => remove.mutate(s.id)} {...sampleRowProps(s.isSample)} disabled={s.isSample || (remove.isPending && remove.variables === s.id)}><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="שירות חדש">
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="שם השירות" htmlFor="name" required><Input id="name" name="name" placeholder='גמ"ח ...' /></Field>
          <Field label="קטגוריה" htmlFor="category">
            <Select id="category" name="category">{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select>
          </Field>
          <Field label="תיאור" htmlFor="description"><Textarea id="description" name="description" className="min-h-[80px]" placeholder="תיאור השירות" /></Field>
          <Field label="פרטי קשר" htmlFor="contact"><Input id="contact" name="contact" placeholder="טלפון / שם איש קשר" /></Field>
          <Button type="submit" disabled={create.isPending} className="w-full">{create.isPending ? "שומר…" : "הוספת שירות"}</Button>
        </form>
      </Modal>
    </div>
  );
}
