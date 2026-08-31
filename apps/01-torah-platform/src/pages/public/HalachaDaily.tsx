import { useQuery } from "@tanstack/react-query";
import { ScrollText, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { localDateString } from "@/lib/utils";

export default function HalachaDaily() {
  const { tenant } = useTenant();
  const { data } = useQuery({
    queryKey: ["halacha-list", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const today = localDateString();
      const { data } = await supabase
        .from("halacha_daily")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .lte("date", today)
        .order("date", { ascending: false })
        .limit(60);
      return data || [];
    },
  });

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <ScrollText className="h-8 w-8 text-primary" />
        <h1 className="font-heading text-3xl md:text-4xl">הלכה יומית</h1>
      </div>
      <div className="space-y-4">
        {(data || []).map((h: any) => (
          <Card key={h.id}>
            <CardHeader>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Calendar className="h-3 w-3" /> {new Date(h.date).toLocaleDateString("he-IL")}
              </div>
              <CardTitle className="text-xl">{h.title}</CardTitle>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap text-foreground/85">{h.body}</CardContent>
          </Card>
        ))}
        {(data?.length || 0) === 0 && <div className="text-muted-foreground">אין הלכות עדיין</div>}
      </div>
    </div>
  );
}
