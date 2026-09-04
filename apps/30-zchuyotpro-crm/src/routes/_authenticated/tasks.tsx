import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { allTasksQuery, TASK_PRIORITY, TASK_PRIORITY_COLOR, TASK_STATUS } from "@/features/tasks/queries";
import { meProfileQuery } from "@/features/clients/queries";
import { formatDateTimeHe } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({ meta: [{ title: "משימות | זכויות פרו" }] }),
  component: TasksPage,
});

function TasksPage() {
  const { data: me } = useQuery(meProfileQuery());
  const [status, setStatus] = useState("open");
  const [mine, setMine] = useState(true);
  const { data: tasks, isLoading } = useQuery(allTasksQuery({ status, mine, myId: me?.id ?? null }));

  const now = Date.now();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">משימות</h2>
        <p className="text-muted-foreground text-sm mt-1">כל המשימות במערכת</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Tabs value={status} onValueChange={setStatus}>
          <TabsList>
            <TabsTrigger value="open">פתוחות</TabsTrigger>
            <TabsTrigger value="done">הושלמו</TabsTrigger>
            <TabsTrigger value="all">הכל</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs value={mine ? "mine" : "all"} onValueChange={(v) => setMine(v === "mine")}>
          <TabsList>
            <TabsTrigger value="mine">שלי</TabsTrigger>
            <TabsTrigger value="all">כולם</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>כותרת</TableHead>
                  <TableHead>לקוח</TableHead>
                  <TableHead>יעד</TableHead>
                  <TableHead>עדיפות</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead>הוקצה</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(tasks ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">אין משימות</TableCell></TableRow>
                )}
                {(tasks ?? []).map((t) => {
                  const overdue = t.status === "open" && t.due_date && new Date(t.due_date).getTime() < now;
                  const client = (t as { client?: { id: string; first_name: string; last_name: string } | null }).client;
                  const assignee = (t as { assignee?: { id: string; full_name: string } | null }).assignee;
                  const creator = (t as { creator?: { id: string; full_name: string } | null }).creator;
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">
                        {t.title}
                        {t.description && (
                          <div className="text-xs text-muted-foreground font-normal mt-0.5 line-clamp-1">{t.description}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {client ? (
                          <Link to="/clients/$id" params={{ id: client.id }} className="text-primary hover:underline">
                            {client.first_name} {client.last_name}
                          </Link>
                        ) : "—"}
                      </TableCell>
                      <TableCell className={overdue ? "text-destructive font-medium" : ""}>
                        {t.due_date ? formatDateTimeHe(t.due_date) : "—"}
                        {overdue && <Badge variant="destructive" className="ms-1">באיחור</Badge>}
                      </TableCell>
                      <TableCell><Badge className={TASK_PRIORITY_COLOR[t.priority]}>{TASK_PRIORITY[t.priority]}</Badge></TableCell>
                      <TableCell>
                        {TASK_STATUS[t.status]}
                        {t.status === "done" && t.completed_at && (
                          <div className="text-xs text-muted-foreground font-normal mt-0.5">{formatDateTimeHe(t.completed_at)}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {assignee?.full_name ?? "—"}
                        {creator?.full_name && creator.id !== assignee?.id && (
                          <div className="text-xs text-muted-foreground font-normal mt-0.5">נוצרה ע"י {creator.full_name}</div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
