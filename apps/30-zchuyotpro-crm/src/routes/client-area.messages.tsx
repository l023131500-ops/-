import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { queryOptions } from "@tanstack/react-query";
import { meClientQuery } from "@/routes/client-area";

const myMessagesQuery = (clientId: string | undefined) =>
  queryOptions({
    queryKey: ["my-messages", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clientId,
  });

export const Route = createFileRoute("/client-area/messages")({
  head: () => ({ meta: [{ title: "הודעות | אזור אישי" }] }),
  component: MessagesPage,
});

function MessagesPage() {
  const { data: client } = useQuery(meClientQuery());
  const { data: messages, isLoading } = useQuery(myMessagesQuery(client?.id));
  const qc = useQueryClient();
  const [text, setText] = useState("");

  const send = useMutation({
    mutationFn: async () => {
      if (!client) throw new Error("no client");
      const { error } = await supabase.from("messages").insert({
        tenant_id: client.tenant_id,
        client_id: client.id,
        channel: "internal",
        direction: "inbound",
        content: text,
        status: "sent",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      toast.success("ההודעה נשלחה");
      qc.invalidateQueries({ queryKey: ["my-messages", client?.id] });
    },
    onError: (e: Error) => toast.error("שליחה נכשלה", { description: e.message }),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 max-h-[480px] overflow-auto space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (messages ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">אין הודעות עדיין</p>
          ) : (
            (messages ?? []).map((m) => (
              <div key={m.id} className={`flex ${m.direction === "inbound" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] p-2 rounded-lg text-sm ${
                  m.direction === "inbound" ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}>
                  <div>{m.content}</div>
                  <div className="text-[10px] opacity-70 mt-1">{new Date(m.created_at).toLocaleString("he-IL")}</div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3 space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="כתבו הודעה לארגון..."
            rows={3}
          />
          <Button onClick={() => send.mutate()} disabled={!text.trim() || send.isPending} size="sm">
            {send.isPending && <Loader2 className="h-4 w-4 animate-spin me-1" />}
            <Send className="h-4 w-4 me-1" /> שלח
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
