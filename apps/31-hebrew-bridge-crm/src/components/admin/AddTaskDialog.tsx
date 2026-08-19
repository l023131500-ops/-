import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { listClientsForAdmin, listPartnersForAssignment } from "@/lib/admin.functions";
import { createTask, type TaskPriority } from "@/lib/tasks.functions";

const NONE = "__none__";

export function AddTaskDialog({ defaultClientId }: { defaultClientId?: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState<string>(defaultClientId ?? "");
  const [partnerId, setPartnerId] = useState<string>(NONE);
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");

  const qc = useQueryClient();
  const createFn = useServerFn(createTask);
  const listClientsFn = useServerFn(listClientsForAdmin);
  const listPartnersFn = useServerFn(listPartnersForAssignment);

  const clients = useQuery({
    queryKey: ["adminClientsForTasks"],
    queryFn: () => listClientsFn(),
    enabled: open && !defaultClientId,
  });
  const partners = useQuery({
    queryKey: ["partnersForAssignment"],
    queryFn: () => listPartnersFn(),
    enabled: open,
  });

  const reset = () => {
    setTitle("");
    setDescription("");
    if (!defaultClientId) setClientId("");
    setPartnerId(NONE);
    setPriority("medium");
    setDueDate("");
  };

  const mutation = useMutation({
    mutationFn: (vars: Parameters<typeof createFn>[0]["data"]) => createFn({ data: vars }),
    onSuccess: () => {
      toast.success("המשימה נוצרה בהצלחה");
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["tasksForClient"] });
      setOpen(false);
      reset();
    },
    onError: (e: Error) => toast.error(e.message || "שגיאה ביצירת המשימה"),
  });

  const submit = () => {
    if (!clientId) return toast.error("יש לבחור לקוח");
    if (!title.trim()) return toast.error("יש להזין כותרת");
    mutation.mutate({
      clientId,
      partnerId: partnerId === NONE ? null : partnerId,
      title: title.trim(),
      description: description.trim() || null,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      priority,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="ml-1 h-4 w-4" />
          הוספת משימה
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>משימה חדשה</DialogTitle>
          <DialogDescription>הגדרת משימה ושיוכה ללקוח ולשותף מטפל.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>כותרת המשימה</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="לדוגמה: לתאם פגישת היכרות" />
          </div>

          <div className="space-y-2">
            <Label>תיאור (אופציונלי)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={3} />
          </div>

          {!defaultClientId && (
            <div className="space-y-2">
              <Label>לקוח</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="בחר לקוח" /></SelectTrigger>
                <SelectContent>
                  {(clients.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name ?? c.email ?? c.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>שיוך לשותף מטפל (אופציונלי)</Label>
            <Select value={partnerId} onValueChange={setPartnerId}>
              <SelectTrigger><SelectValue placeholder="ללא שותף" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>ללא שותף</SelectItem>
                {(partners.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name ?? p.company_name ?? p.id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>עדיפות</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">נמוכה</SelectItem>
                  <SelectItem value="medium">בינונית</SelectItem>
                  <SelectItem value="high">גבוהה</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>תאריך יעד</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? "יוצר..." : "צור משימה"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
