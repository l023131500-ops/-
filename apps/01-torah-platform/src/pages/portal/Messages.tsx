import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

export default function Messages() {
  const { tenant } = useTenant();
  const { data } = useQuery({
    queryKey: ["portal-messages", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase.from("portal_messages").select("*").eq("tenant_id", tenant!.id).order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });
  return (
    <div>
      <h1 className="font-heading text-3xl mb-6">הודעות</h1>
      <div className="space-y-3">
        {(data || []).map((m: any) => (
          <Card key={m.id}><CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">{m.subject}</div>
              {!m.read_at && <Badge>חדש</Badge>}
            </div>
            <div className="text-sm text-foreground/85 whitespace-pre-wrap">{m.body}</div>
            <div className="text-xs text-muted-foreground mt-2">{new Date(m.created_at).toLocaleDateString("he-IL")}</div>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}
