import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { StickyNote, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export function QuickNoteButton({ clientId, tenantId, profileId }: { clientId: string; tenantId: string; profileId: string | null }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      if (!note.trim()) throw new Error("הזן הערה");
      const { error } = await supabase.from("messages").insert({
        tenant_id: tenantId,
        client_id: clientId,
        channel: "internal",
        direction: "outbound",
        status: "sent",
        content: note.trim(),
        sent_by: profileId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ההערה נשמרה");
      setNote("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["messages", clientId] });
      qc.invalidateQueries({ queryKey: ["timeline", clientId] });
    },
    onError: (e: Error) => toast.error("שגיאה", { description: e.message }),
  });

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 start-6 z-40 shadow-lg rounded-full h-14 w-14 p-0"
        title="הוסף הערה מהירה"
      >
        <StickyNote className="h-6 w-6" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>הערה פנימית מהירה</DialogTitle></DialogHeader>
          <Textarea
            autoFocus
            rows={5}
            placeholder="הזן הערה פנימית..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>ביטול</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !note.trim()}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin me-1" />} שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
