import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listMyClients,
  savePartnerFeedback,
  FEEDBACK_MAX_LENGTH,
  type PartnerClientRow,
  type TreatmentStatus,
} from "@/lib/partner.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

// Same query as /partner/clients: one server call, one cache entry, and a saved note
// invalidates both screens at once.
const myClientsQuery = queryOptions({
  queryKey: ["partner", "clients"],
  queryFn: () => listMyClients(),
});

const STATUS_LABEL: Record<TreatmentStatus, string> = {
  sent: "הועבר לטיפול",
  in_progress: "בטיפול",
  completed: "הושלם",
};

export const Route = createFileRoute("/_authenticated/partner/feedbacks")({
  loader: ({ context }) => (context as any).queryClient.ensureQueryData(myClientsQuery),
  component: PartnerFeedbacksPage,
  errorComponent: ({ error }) => {
    const router = useRouter();
    return (
      <Card className="p-6" dir="rtl">
        <p className="text-destructive">לא ניתן לטעון את המשובים.</p>
        <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
        <Button className="mt-4" onClick={() => router.invalidate()}>נסה שוב</Button>
      </Card>
    );
  },
  notFoundComponent: () => <div dir="rtl">העמוד לא נמצא.</div>,
});

function PartnerFeedbacksPage() {
  return (
    <div dir="rtl" className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">משובים ועדכונים</h1>
        <p className="text-muted-foreground mt-1">
          המשוב שתכתוב כאן נשמר על השיוך ונקרא על ידי מנהל המערכת. סטטוס הטיפול מוצג לצד כל לקוח
          ומתעדכן במסך "לקוחות בטיפולי".
        </p>
      </header>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <Body />
      </Suspense>
    </div>
  );
}

function Body() {
  const { data } = useSuspenseQuery(myClientsQuery);

  if (data.length === 0) {
    return (
      <Card className="p-12 text-center text-muted-foreground" dir="rtl">
        עדיין לא שויכו אליך לקוחות, ולכן אין על מה לכתוב משוב.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((row) => (
        <FeedbackCard key={row.assignment_id} row={row} />
      ))}
    </div>
  );
}

function FeedbackCard({ row }: { row: PartnerClientRow }) {
  const qc = useQueryClient();
  const saveFn = useServerFn(savePartnerFeedback);
  const saved = row.feedback_notes ?? "";
  const [notes, setNotes] = useState(saved);
  const fieldId = `feedback-${row.assignment_id}`;

  const mutation = useMutation({
    mutationFn: (value: string) =>
      saveFn({ data: { assignmentId: row.assignment_id, notes: value } }),
    onSuccess: () => {
      toast.success("המשוב נשמר");
      qc.invalidateQueries({ queryKey: ["partner", "clients"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dirty = notes.trim() !== saved.trim();

  return (
    <Card className="p-5 space-y-4" dir="rtl">
      <div className="flex items-start justify-between gap-3">
        <p className="text-lg font-semibold text-foreground min-w-0 truncate">{row.display_name}</p>
        <Badge variant={row.treatment_status === "completed" ? "default" : "secondary"}>
          {STATUS_LABEL[row.treatment_status]}
        </Badge>
      </div>

      <div className="space-y-2">
        <Label htmlFor={fieldId}>המשוב שלי על הטיפול</Label>
        <Textarea
          id={fieldId}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={FEEDBACK_MAX_LENGTH}
          rows={4}
          className="text-right"
          placeholder="מה נעשה עד כה, מה נדרש מהמשרד, ומה הצעד הבא."
          disabled={mutation.isPending}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {saved === "" ? "טרם נכתב משוב" : "נשמר משוב קודם"} · {notes.length}/{FEEDBACK_MAX_LENGTH}
          </span>
          <div className="flex gap-2">
            {dirty && (
              <Button variant="ghost" onClick={() => setNotes(saved)} disabled={mutation.isPending}>
                בטל שינויים
              </Button>
            )}
            <Button onClick={() => mutation.mutate(notes)} disabled={!dirty || mutation.isPending}>
              {mutation.isPending ? "שומר..." : "שמור משוב"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
