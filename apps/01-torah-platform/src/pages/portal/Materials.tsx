import { useQuery } from "@tanstack/react-query";
import { FileText, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

export default function Materials() {
  const { tenant } = useTenant();
  const { data } = useQuery({
    queryKey: ["materials", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase.from("materials").select("*").eq("tenant_id", tenant!.id).order("created_at", { ascending: false });
      return data || [];
    },
  });
  return (
    <div>
      <h1 className="font-heading text-3xl mb-6">חומרי לימוד</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(data || []).map((m: any) => (
          <Card key={m.id}><CardContent className="pt-6">
            <FileText className="h-10 w-10 text-primary mb-3" />
            <div className="font-medium mb-1">{m.title}</div>
            <div className="text-sm text-muted-foreground mb-3">{m.description}</div>
            {m.file_url && <Button asChild size="sm" variant="outline"><a href={m.file_url} target="_blank" rel="noreferrer"><Download className="ml-2 h-4 w-4" /> הורד</a></Button>}
          </CardContent></Card>
        ))}
        {(data?.length || 0) === 0 && <div className="text-muted-foreground">אין חומרים עדיין</div>}
      </div>
    </div>
  );
}
