import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import type { Synagogue, SynagogueInput } from "@/lib/types";
import { createSynagogue, deleteSynagogue, updateSynagogue } from "@/data/repositories";
import { useAllSynagogues } from "@/hooks/useAdminData";
import { useToast } from "@/components/ui/Toaster";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { CardGridSkeleton } from "@/components/ui/Skeleton";
import { SynagogueForm } from "./SynagogueForm";

export function AdminSynagogues() {
  const toast = useToast();
  const qc = useQueryClient();
  const { data: synagogues, isLoading } = useAllSynagogues();
  const [modal, setModal] = useState<{ open: boolean; editing?: Synagogue }>({ open: false });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["all-synagogues"] });
    qc.invalidateQueries({ queryKey: ["synagogues"] });
  };

  const saveMutation = useMutation({
    mutationFn: async (input: SynagogueInput): Promise<void> => {
      if (modal.editing) await updateSynagogue(modal.editing.id, input);
      else await createSynagogue(input);
    },
    onSuccess: () => {
      invalidate();
      toast(modal.editing ? "בית הכנסת עודכן." : "בית הכנסת נוצר.", "success");
      setModal({ open: false });
    },
    onError: (e: Error) => toast(e.message || "שגיאה בשמירה", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSynagogue(id),
    onSuccess: () => { invalidate(); toast("בית הכנסת נמחק.", "success"); },
    onError: (e: Error) => toast(e.message || "שגיאה במחיקה", "error"),
  });

  const togglePublish = useMutation({
    mutationFn: (s: Synagogue) => updateSynagogue(s.id, { isPublished: !s.isPublished }),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast(e.message, "error"),
  });

  function copyLink(slug: string) {
    const url = `${window.location.origin}/k/${slug}`;
    navigator.clipboard?.writeText(url).then(
      () => toast("הקישור לאתר בית הכנסת הועתק. ניתן להפיץ אותו למתפללים.", "success"),
      () => toast(url, "info"),
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">בתי כנסת</h1>
          <p className="mt-1 text-muted-foreground">ניהול בתי הכנסת, פרסום, ויצירת קישורי הפצה למתפללים.</p>
        </div>
        <Button onClick={() => setModal({ open: true })}>
          <Plus className="h-4 w-4" /> בית כנסת חדש
        </Button>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <CardGridSkeleton count={3} />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
            <ul className="divide-y divide-border">
              {(synagogues ?? []).map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 p-4">
                  <span className="h-10 w-10 shrink-0 rounded-lg" style={{ background: s.brandGradient }} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{s.name}</span>
                      {!s.isPublished && <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px] text-muted-foreground">טיוטה</span>}
                    </div>
                    <div className="text-xs text-muted-foreground" dir="ltr">/k/{s.slug}{s.nusach ? ` · ${s.nusach}` : ""}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <button onClick={() => togglePublish.mutate(s)} className="rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
                      {s.isPublished ? "הסתר" : "פרסם"}
                    </button>
                    <button onClick={() => copyLink(s.slug)} title="העתק קישור למתפללים" className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground">
                      <Copy className="h-4 w-4" />
                    </button>
                    <a href={`/k/${s.slug}`} target="_blank" rel="noreferrer" title="צפייה באתר" className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <button onClick={() => setModal({ open: true, editing: s })} title="עריכה" className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => { if (window.confirm(`למחוק את "${s.name}"?`)) deleteMutation.mutate(s.id); }}
                      title="מחיקה" className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-red-500/10 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
              {(synagogues ?? []).length === 0 && (
                <li className="p-8 text-center text-muted-foreground">אין בתי כנסת עדיין. הוסיפו את הראשון.</li>
              )}
            </ul>
          </div>
        )}
      </div>

      <Modal open={modal.open} onClose={() => setModal({ open: false })} title={modal.editing ? "עריכת בית כנסת" : "בית כנסת חדש"}>
        <SynagogueForm initial={modal.editing} submitting={saveMutation.isPending} onSubmit={(input) => saveMutation.mutate(input)} />
      </Modal>
    </div>
  );
}
