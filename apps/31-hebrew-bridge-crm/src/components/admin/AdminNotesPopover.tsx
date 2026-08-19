import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateClientAdminNotes } from "@/lib/admin.functions";

interface Props {
  clientId: string;
  initialNotes: string | null;
  children: React.ReactNode;
}

export function AdminNotesPopover({ clientId, initialNotes, children }: Props) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const qc = useQueryClient();
  const updateFn = useServerFn(updateClientAdminNotes);

  const mutation = useMutation({
    mutationFn: () => updateFn({ data: { clientId, notes } }),
    onSuccess: () => {
      toast.success("הערות נשמרו");
      qc.invalidateQueries({ queryKey: ["adminClients"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-96" dir="rtl">
        <div className="space-y-3">
          <h4 className="font-semibold text-right">הערות מנהל פנימיות</h4>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            placeholder="הוסף הערה פנימית..."
            className="text-right"
            dir="rtl"
          />
          <div className="flex gap-2 justify-start">
            <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? "שומר..." : "שמירה"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
