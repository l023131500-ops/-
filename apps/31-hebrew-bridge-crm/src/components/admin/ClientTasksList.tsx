import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listTasksForClient } from "@/lib/tasks.functions";
import { TasksKanban } from "@/components/admin/TasksKanban";
import { Card } from "@/components/ui/card";

export function ClientTasksList({ clientId }: { clientId: string }) {
  const fn = useServerFn(listTasksForClient);
  const q = useQuery({
    queryKey: ["tasksForClient", clientId],
    queryFn: () => fn({ data: { clientId } }),
  });
  if (q.isLoading) return <p className="text-sm text-muted-foreground">טוען משימות...</p>;
  if (!q.data || q.data.length === 0) {
    return <Card className="p-6 text-center text-sm text-muted-foreground">אין משימות עבור לקוח זה.</Card>;
  }
  return <TasksKanban tasks={q.data} />;
}
