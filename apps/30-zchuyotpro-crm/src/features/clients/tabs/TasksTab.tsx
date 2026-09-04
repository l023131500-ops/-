import { useState } from "react";
import { useSuspenseQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Loader2, Trash2, CheckCircle2, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { clientQuery, meProfileQuery, tenantAgentsQuery } from "@/features/clients/queries";
import { clientTasksQuery, TASK_PRIORITY, TASK_PRIORITY_COLOR } from "@/features/tasks/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDateTimeHe } from "@/lib/format";
import { cn } from "@/lib/utils";

export function TasksTab({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const { data: client } = useSuspenseQuery(clientQuery(clientId));
  const { data: me } = useSuspenseQuery(meProfileQuery());
  const { data: tasks } = useSuspenseQuery(clientTasksQuery(clientId));
  const { data: agents } = useQuery(tenantAgentsQuery());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    due_date: "",
    priority: "medium" as "low" | "medium" | "high",
    assigned_to: "",
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["tasks", "client", clientId] });
    qc.invalidateQueries({ queryKey: ["tasks"] });
  }

  const create = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("חובה לציין כותרת");
      const { error } = await supabase.from("tasks").insert({
        tenant_id: client.tenant_id,
        client_id: clientId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        priority: form.priority,
        assigned_to: form.assigned_to || me?.id || null,
        created_by: me?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setForm({ title: "", description: "", due_date: "", priority: "medium", assigned_to: "" });
      setOpen(false);
      invalidate();
      toast.success("המשימה נוצרה");
    },
    onError: (e: Error) => toast.error("שגיאה", { description: e.message }),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status: done ? "done" : "open", completed_at: done ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const now = Date.now();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>משימות ותזכורות</CardTitle>
        <Button size="sm" onClick={() => setOpen(!open)}>
          {open ? "ביטול" : (<><Plus className="h-4 w-4 ms-1" /> משימה חדשה</>)}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {open && (
          <div className="grid gap-3 sm:grid-cols-2 p-3 bg-muted/40 rounded">
            <div className="sm:col-span-2">
              <Label>כותרת</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>תיאור</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>תאריך יעד</Label>
              <Input type="datetime-local" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
            <div>
              <Label>עדיפות</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as "low" | "medium" | "high" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_PRIORITY).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>הוקצה ל</Label>
              <Select value={form.assigned_to || (me?.id ?? "")} onValueChange={(v) => setForm({ ...form, assigned_to: v })}>
                <SelectTrigger><SelectValue placeholder="בחר סוכן" /></SelectTrigger>
                <SelectContent>
                  {(agents ?? []).map((a) => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Button onClick={() => create.mutate()} disabled={create.isPending} className="w-full">
                {create.isPending && <Loader2 className="h-4 w-4 animate-spin me-1" />} צור משימה
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {tasks.length === 0 && <div className="text-center text-muted-foreground py-8">אין משימות</div>}
          {tasks.map((t) => {
            const overdue = t.status === "open" && t.due_date && new Date(t.due_date).getTime() < now;
            const done = t.status === "done";
            return (
              <div
                key={t.id}
                className={cn(
                  "flex items-start gap-2 p-3 rounded border",
                  done && "opacity-60",
                  overdue && "border-red-300 bg-red-50/30 dark:bg-red-950/20",
                )}
              >
                <Checkbox
                  checked={done}
                  onCheckedChange={(v) => toggle.mutate({ id: t.id, done: !!v })}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("font-medium", done && "line-through")}>{t.title}</span>
                    <Badge className={TASK_PRIORITY_COLOR[t.priority]}>{TASK_PRIORITY[t.priority]}</Badge>
                    {overdue && <Badge variant="destructive">באיחור</Badge>}
                  </div>
                  {t.description && <p className="text-sm text-muted-foreground mt-1">{t.description}</p>}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    {t.due_date && <span>יעד: {formatDateTimeHe(t.due_date)}</span>}
                    {(t as { assignee?: { full_name: string } | null }).assignee?.full_name && (
                      <span>{(t as { assignee?: { full_name: string } | null }).assignee?.full_name}</span>
                    )}
                    {(() => {
                      const creator = (t as { creator?: { id: string; full_name: string } | null }).creator;
                      const assignee = (t as { assignee?: { id: string; full_name: string } | null }).assignee;
                      return creator?.full_name && creator.id !== assignee?.id ? (
                        <span>נוצרה ע"י {creator.full_name}</span>
                      ) : null;
                    })()}
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => remove.mutate(t.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
