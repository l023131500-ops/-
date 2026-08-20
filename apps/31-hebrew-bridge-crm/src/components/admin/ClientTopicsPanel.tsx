import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listClientTopics,
  setClientTopicRelevance,
  sendTopicToClient,
} from "@/lib/topics.functions";

export function ClientTopicsPanel({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const list = useServerFn(listClientTopics);
  const setRelevance = useServerFn(setClientTopicRelevance);
  const send = useServerFn(sendTopicToClient);

  const key = ["client-topics", clientId];
  const query = useQuery({ queryKey: key, queryFn: () => list({ data: { clientId } }) });

  const toggle = useMutation({
    mutationFn: (v: { topicId: string; isRelevant: boolean }) =>
      setRelevance({ data: { clientId, ...v } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e: any) => toast.error(e?.message ?? "שגיאה"),
  });

  const sendMut = useMutation({
    mutationFn: (topicId: string) => send({ data: { clientId, topicId } }),
    onSuccess: () => toast.success("ההודעה נוספה לתור השליחה"),
    onError: (e: any) => toast.error(e?.message ?? "שגיאה בשליחה"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>נושאים ושליחות</CardTitle>
        <CardDescription>
          סמן את הנושאים הרלוונטיים ללקוח ולחץ "שלח" כדי להפעיל את האוטומציה.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {query.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (query.data ?? []).length === 0 ? (
          <p className="text-center text-muted-foreground py-6 text-sm">
            אין נושאים מוגדרים. צור נושאים תחת "ניהול תוכן ונושאים".
          </p>
        ) : (
          (query.data ?? []).map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-md border p-3"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Switch
                  checked={t.is_relevant}
                  onCheckedChange={(v) =>
                    toggle.mutate({ topicId: t.id, isRelevant: v })
                  }
                  aria-label={`סימון הנושא ${t.name} כרלוונטי ללקוח`}
                />
                <div className="min-w-0">
                  <div className="font-medium truncate">{t.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {t.client_subject}
                  </div>
                </div>
                {t.notify_partner && (
                  <Badge variant="outline" className="shrink-0">יידוע שותף</Badge>
                )}
              </div>
              <Button
                size="sm"
                onClick={() => sendMut.mutate(t.id)}
                disabled={sendMut.isPending}
              >
                <Send className="ml-2 h-3 w-3" />
                שלח
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
