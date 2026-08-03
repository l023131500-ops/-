import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Suspense } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { listTasks } from "@/lib/tasks.functions";
import { TasksKanban } from "@/components/admin/TasksKanban";
import { AddTaskDialog } from "@/components/admin/AddTaskDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const tasksQueryOptions = queryOptions({
  queryKey: ["tasks", "all"],
  queryFn: () => listTasks(),
});

export const Route = createFileRoute("/_authenticated/admin/tasks")({
  loader: ({ context }) => (context as any).queryClient.ensureQueryData(tasksQueryOptions),
  component: TasksPage,
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

function TasksPage() {
  return (
    <div dir="rtl" className="space-y-6 animate-fade-in">
      <header className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">יומן משימות חכם</h1>
          <p className="text-muted-foreground mt-1">ניהול ושיוך משימות ללקוחות ולשותפים מטפלים</p>
        </div>
        <div className="flex gap-2">
          <ExportButton />
          <AddTaskDialog />
        </div>
      </header>

      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <TasksBody />
      </Suspense>
    </div>
  );
}

function TasksBody() {
  const { data } = useSuspenseQuery(tasksQueryOptions);
  return <TasksKanban tasks={data} />;
}

function ExportButton() {
  const listFn = useServerFn(listTasks);
  const handle = async () => {
    try {
      const rows = await listFn();
      const header = ["כותרת", "לקוח", "שותף", "סטטוס", "עדיפות", "תאריך יעד"].join(",");
      const csv = [
        header,
        ...rows.map((r) =>
          [r.title, r.client_name ?? "", r.partner_name ?? "", r.status, r.priority, r.due_date ?? ""]
            .map((v) => `"${String(v).replace(/"/g, '""')}"`)
            .join(",")
        ),
      ].join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tasks-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("הקובץ יוצא בהצלחה");
    } catch (e: any) {
      toast.error(e.message || "שגיאה בייצוא");
    }
  };
  return (
    <Button variant="outline" onClick={handle}>
      <Download className="ml-1 h-4 w-4" />
      ייצוא לדוח
    </Button>
  );
}
