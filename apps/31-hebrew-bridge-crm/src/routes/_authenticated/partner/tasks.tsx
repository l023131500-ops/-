import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Suspense } from "react";
import { listTasks } from "@/lib/tasks.functions";
import { TasksKanban } from "@/components/admin/TasksKanban";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const partnerTasksQuery = queryOptions({
  queryKey: ["tasks", "partner"],
  queryFn: () => listTasks(),
});

export const Route = createFileRoute("/_authenticated/partner/tasks")({
  loader: ({ context }) => (context as any).queryClient.ensureQueryData(partnerTasksQuery),
  component: PartnerTasksPage,
  errorComponent: ({ error }) => {
    const router = useRouter();
    return (
      <Card className="p-6" dir="rtl">
        <p className="text-destructive">לא ניתן לטעון את המשימות.</p>
        <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
        <Button className="mt-4" onClick={() => router.invalidate()}>נסה שוב</Button>
      </Card>
    );
  },
  notFoundComponent: () => <div dir="rtl">העמוד לא נמצא.</div>,
});

function PartnerTasksPage() {
  return (
    <div dir="rtl" className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">המשימות שלי</h1>
        <p className="text-muted-foreground mt-1">משימות ששויכו אליך מהמערכת</p>
      </header>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Body />
      </Suspense>
    </div>
  );
}

function Body() {
  const { data } = useSuspenseQuery(partnerTasksQuery);
  return <TasksKanban tasks={data} canManage={false} />;
}
