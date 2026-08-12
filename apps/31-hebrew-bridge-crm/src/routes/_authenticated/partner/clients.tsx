import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Suspense } from "react";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import {
  listMyClients,
  updateTreatmentStatus,
  type PartnerClientRow,
  type TreatmentStatus,
} from "@/lib/partner.functions";
import { prettyField } from "@/lib/partner-categories";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const myClientsQuery = queryOptions({
  queryKey: ["partner", "clients"],
  queryFn: () => listMyClients(),
});

const STATUS_LABEL: Record<TreatmentStatus, string> = {
  sent: "הועבר לטיפול",
  in_progress: "בטיפול",
  completed: "הושלם",
};

export const Route = createFileRoute("/_authenticated/partner/clients")({
  loader: ({ context }) => (context as any).queryClient.ensureQueryData(myClientsQuery),
  component: PartnerClientsPage,
  errorComponent: ({ error }) => {
    const router = useRouter();
    return (
      <Card className="p-6" dir="rtl">
        <p className="text-destructive">לא ניתן לטעון את רשימת הלקוחות.</p>
        <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
        <Button className="mt-4" onClick={() => router.invalidate()}>נסה שוב</Button>
      </Card>
    );
  },
  notFoundComponent: () => <div dir="rtl">העמוד לא נמצא.</div>,
});

function PartnerClientsPage() {
  return (
    <div dir="rtl" className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">לקוחות בטיפולי</h1>
        <p className="text-muted-foreground mt-1">
          הלקוחות ששויכו אליך. הפרטים המוצגים הם רק אלה שהלקוח אישר לשתף עם תחום ההתמחות שלך.
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
        עדיין לא שויכו אליך לקוחות. כשמנהל המערכת ישייך לך לקוח, הוא יופיע כאן.
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {data.map((row) => (
        <ClientCard key={row.assignment_id} row={row} />
      ))}
    </div>
  );
}

function ClientCard({ row }: { row: PartnerClientRow }) {
  const qc = useQueryClient();
  const updateFn = useServerFn(updateTreatmentStatus);

  const mutation = useMutation({
    mutationFn: (status: TreatmentStatus) =>
      updateFn({ data: { assignmentId: row.assignment_id, status } }),
    onSuccess: () => {
      toast.success("סטטוס הטיפול עודכן");
      qc.invalidateQueries({ queryKey: ["partner", "clients"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const assignedAt = new Intl.DateTimeFormat("he-IL", { dateStyle: "short" }).format(
    new Date(row.assigned_at)
  );

  return (
    <Card className="p-5 space-y-4" dir="rtl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-semibold text-foreground truncate">{row.display_name}</p>
          <p className="text-sm text-muted-foreground">שויך אליך בתאריך {assignedAt}</p>
        </div>
        <Badge variant={row.treatment_status === "completed" ? "default" : "secondary"}>
          {STATUS_LABEL[row.treatment_status]}
        </Badge>
      </div>

      {row.consent_granted ? (
        row.fields.length > 0 ? (
          <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-sm">
            {row.fields.map((f) => (
              <div key={f.key} className="contents">
                <dt className="text-muted-foreground">{prettyField(f.key)}</dt>
                <dd className="text-foreground break-words">
                  {f.value ?? <span className="text-muted-foreground">לא זמין</span>}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            הלקוח אישר שיתוף, אך מנהל המערכת עדיין לא הגדיר אילו שדות תחום ההתמחות שלך רשאי לראות.
          </p>
        )
      ) : (
        <div className="flex items-start gap-2 rounded-md bg-muted/60 p-3 text-sm text-muted-foreground">
          <Lock className="h-4 w-4 mt-0.5 shrink-0" />
          <span>הלקוח טרם אישר שיתוף פרטים עם תחום ההתמחות שלך, ולכן לא מוצגים כאן פרטים מזהים.</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground shrink-0">סטטוס טיפול</span>
        <Select
          value={row.treatment_status}
          onValueChange={(v) => mutation.mutate(v as TreatmentStatus)}
          disabled={mutation.isPending}
        >
          <SelectTrigger className="text-right" aria-label="עדכון סטטוס הטיפול">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(STATUS_LABEL) as TreatmentStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </Card>
  );
}
