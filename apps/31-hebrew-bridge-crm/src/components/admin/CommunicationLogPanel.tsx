import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { MessageCircle, Phone, Send, Zap } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  COMMUNICATION_TEMPLATES,
  listCommunicationLogs,
  triggerCommunication,
} from "@/lib/communication.functions";

const dateFmt = new Intl.DateTimeFormat("he-IL", { dateStyle: "medium", timeStyle: "short" });

export function CommunicationLogPanel({ clientId }: { clientId: string }) {
  const [template, setTemplate] = useState<string>(COMMUNICATION_TEMPLATES[0].value);
  const qc = useQueryClient();
  const listFn = useServerFn(listCommunicationLogs);
  const triggerFn = useServerFn(triggerCommunication);

  const logs = useQuery({
    queryKey: ["communicationLogs", clientId],
    queryFn: () => listFn({ data: { clientId } }),
  });

  const send = useMutation({
    mutationFn: () => triggerFn({ data: { clientId, templateType: template } }),
    onSuccess: () => {
      toast.success("ההודעה הופעלה (סימולציה)");
      qc.invalidateQueries({ queryKey: ["communicationLogs", clientId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div dir="rtl" className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Zap className="h-4 w-4 text-primary" />
          הפעלת אוטומציה
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-48">
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COMMUNICATION_TEMPLATES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => send.mutate()} disabled={send.isPending}>
            <Send className="ml-1 h-4 w-4" />
            {send.isPending ? "שולח..." : "הפעל"}
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">היסטוריית תקשורת</h3>
        {logs.isLoading && <p className="text-sm text-muted-foreground">טוען...</p>}
        {logs.data?.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            עדיין לא נשלחו הודעות אוטומטיות ללקוח זה.
          </Card>
        )}
        <ol className="relative border-r-2 border-border pr-5 space-y-4">
          {(logs.data ?? []).map((log) => {
            const Icon = log.channel === "yemot" ? Phone : MessageCircle;
            return (
              <li key={log.id} className="relative animate-slide-up">
                <span className="absolute -right-[31px] top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Icon className="h-3 w-3" />
                </span>
                <Card className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground text-sm">{log.template_label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ערוץ: {log.channel === "yemot" ? "ימות המשיח" : "וואטסאפ"} · סטטוס: {log.status === "simulated" ? "סימולציה" : log.status}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {dateFmt.format(new Date(log.created_at))}
                    </span>
                  </div>
                </Card>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
