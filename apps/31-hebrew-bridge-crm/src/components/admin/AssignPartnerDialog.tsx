import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assignPartnerToClient, listPartnersForAssignment } from "@/lib/admin.functions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}

export function AssignPartnerDialog({ open, onOpenChange, clientId, clientName }: Props) {
  const [partnerId, setPartnerId] = useState<string>("");
  const qc = useQueryClient();
  const listFn = useServerFn(listPartnersForAssignment);
  const assignFn = useServerFn(assignPartnerToClient);

  const { data: partners, isLoading } = useQuery({
    queryKey: ["partnersForAssignment"],
    queryFn: () => listFn(),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: () => assignFn({ data: { clientId, partnerId } }),
    onSuccess: () => {
      toast.success("השותף שויך בהצלחה");
      qc.invalidateQueries({ queryKey: ["adminClients"] });
      onOpenChange(false);
      setPartnerId("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">שיוך שותף עסקי</DialogTitle>
          <DialogDescription className="text-right">בחר שותף עסקי לשיוך ללקוח {clientName}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Select value={partnerId} onValueChange={setPartnerId} disabled={isLoading}>
            <SelectTrigger className="text-right"><SelectValue placeholder="בחר שותף..." /></SelectTrigger>
            <SelectContent>
              {(partners ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.full_name ?? "ללא שם"}{p.company_name ? ` — ${p.company_name}` : ""}
                  {p.specialization_category ? ` (${p.specialization_category})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          <Button onClick={() => mutation.mutate()} disabled={!partnerId || mutation.isPending}>
            {mutation.isPending ? "משייך..." : "שיוך שותף"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
