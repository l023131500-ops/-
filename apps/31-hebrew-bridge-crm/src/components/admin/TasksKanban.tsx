import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Calendar, Flag, MoreHorizontal, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  updateTaskStatus, updateTaskPriority, deleteTask,
  type TaskRow, type TaskStatus, type TaskPriority,
} from "@/lib/tasks.functions";
import { cn } from "@/lib/utils";

const COLUMNS: { status: TaskStatus; label: string; accent: string }[] = [
  { status: "pending", label: "ממתין לטיפול", accent: "border-t-amber-500" },
  { status: "in_progress", label: "בביצוע", accent: "border-t-primary" },
  { status: "completed", label: "הושלם", accent: "border-t-emerald-600" },
];

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "נמוכה",
  medium: "בינונית",
  high: "גבוהה",
};

const PRIORITY_CLASS: Record<TaskPriority, string> = {
  low: "bg-slate-200 text-slate-700",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-rose-100 text-rose-800",
};

const dateFmt = new Intl.DateTimeFormat("he-IL", { dateStyle: "medium" });

export function TasksKanban({ tasks, canManage = true }: { tasks: TaskRow[]; canManage?: boolean }) {
  const qc = useQueryClient();
  const statusFn = useServerFn(updateTaskStatus);
  const prioFn = useServerFn(updateTaskPriority);
  const deleteFn = useServerFn(deleteTask);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["tasksForClient"] });
  };

  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: TaskStatus }) => statusFn({ data: v }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const setPrio = useMutation({
    mutationFn: (v: { id: string; priority: TaskPriority }) => prioFn({ data: v }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("המשימה נמחקה");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-4 md:grid-cols-3" dir="rtl">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.status);
        return (
          <div key={col.status} className="flex flex-col gap-3">
            <Card className={cn("p-4 border-t-4 bg-card animate-fade-in", col.accent)}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">{col.label}</h3>
                <Badge variant="secondary">{colTasks.length}</Badge>
              </div>
            </Card>

            <div className="flex flex-col gap-3 min-h-24">
              {colTasks.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">אין משימות בעמודה זו</p>
              )}
              {colTasks.map((task) => (
                <Card key={task.id} className="p-4 space-y-3 hover:shadow-md transition-shadow animate-slide-up">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground leading-tight">{task.title}</h4>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>שינוי סטטוס</DropdownMenuLabel>
                        {COLUMNS.filter((c) => c.status !== task.status).map((c) => (
                          <DropdownMenuItem
                            key={c.status}
                            onClick={() => setStatus.mutate({ id: task.id, status: c.status })}
                          >
                            העבר ל-{c.label}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>שינוי עדיפות</DropdownMenuLabel>
                        {(["high", "medium", "low"] as TaskPriority[])
                          .filter((p) => p !== task.priority)
                          .map((p) => (
                            <DropdownMenuItem
                              key={p}
                              onClick={() => setPrio.mutate({ id: task.id, priority: p })}
                            >
                              עדיפות {PRIORITY_LABEL[p]}
                            </DropdownMenuItem>
                          ))}
                        {canManage && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => remove.mutate(task.id)}
                            >
                              <Trash2 className="ml-2 h-4 w-4" />
                              מחיקת משימה
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium", PRIORITY_CLASS[task.priority])}>
                      <Flag className="h-3 w-3" />
                      {PRIORITY_LABEL[task.priority]}
                    </span>
                    {task.due_date && (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {dateFmt.format(new Date(task.due_date))}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
                    <span className="inline-flex items-center gap-1 truncate">
                      <User className="h-3 w-3" />
                      {task.client_name ?? "לקוח"}
                    </span>
                    {task.partner_name && (
                      <span className="truncate">שותף: {task.partner_name}</span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
