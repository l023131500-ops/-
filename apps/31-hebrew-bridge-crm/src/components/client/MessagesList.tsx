import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Mail, MailOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { markClientMessageRead, type ClientMessage } from "@/lib/client.functions";

const dateFmt = new Intl.DateTimeFormat("he-IL", {
  dateStyle: "medium",
  timeStyle: "short",
});

function MessageCard({ message }: { message: ClientMessage }) {
  const qc = useQueryClient();
  const markReadFn = useServerFn(markClientMessageRead);
  const { mutate: markRead } = useMutation({
    mutationFn: () => markReadFn({ data: { id: message.id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clientMessages"] });
      qc.invalidateQueries({ queryKey: ["clientDashboard"] });
    },
  });

  const unread = !message.readAt;

  // Marking read on mount (i.e. on actually opening this card in the list)
  // rather than behind a click — an unread badge that never clears without a
  // separate action is the same bug fixed today in the two sibling CRMs.
  useEffect(() => {
    if (unread) markRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.id, unread]);

  return (
    <Card className={`p-5 space-y-2 ${unread ? "border-primary/50 bg-primary/[.03]" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {unread ? (
            <Mail className="h-4 w-4 text-primary shrink-0" />
          ) : (
            <MailOpen className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <h3 className="font-semibold text-foreground">{message.subject}</h3>
          {unread && <Badge className="bg-primary hover:bg-primary text-primary-foreground">חדש</Badge>}
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{dateFmt.format(new Date(message.sentAt))}</span>
      </div>
      <div
        className="prose prose-sm max-w-none text-foreground/90"
        // Body is authored by staff via the Topics admin screen (topics.client_html_body),
        // the same trusted-source HTML already rendered as-is on that side; not user input.
        dangerouslySetInnerHTML={{ __html: message.bodyHtml }}
      />
    </Card>
  );
}

export function MessagesList({ messages }: { messages: ClientMessage[] }) {
  if (messages.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        עדיין לא התקבלו עדכונים.
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      {messages.map((m) => (
        <MessageCard key={m.id} message={m} />
      ))}
    </div>
  );
}
