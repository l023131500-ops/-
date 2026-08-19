import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

export default function Forums() {
  const { tenant } = useTenant();
  const { data } = useQuery({
    queryKey: ["forum-cats", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase.from("forum_categories").select("*").eq("tenant_id", tenant!.id).eq("is_active", true).order("sort_order");
      return data || [];
    },
  });
  return (
    <div>
      <h1 className="font-heading text-3xl mb-6">פורומים</h1>
      <div className="grid sm:grid-cols-2 gap-4">
        {(data || []).map((c: any) => (
          <Card key={c.id}><CardHeader>
            <div className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-primary" /><CardTitle className="text-lg">{c.name}</CardTitle></div>
          </CardHeader><CardContent><div className="text-sm text-muted-foreground">{c.description}</div></CardContent></Card>
        ))}
        {(data?.length || 0) === 0 && <div className="text-muted-foreground">אין פורומים</div>}
      </div>
    </div>
  );
}
