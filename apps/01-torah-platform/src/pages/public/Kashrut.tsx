import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

export default function Kashrut() {
  const { tenant } = useTenant();
  const { data } = useQuery({
    queryKey: ["kashrut", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase.from("kashrut_certifications").select("*").eq("tenant_id", tenant!.id).eq("status", "active").order("business_name");
      return data || [];
    },
  });
  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-6"><ShieldCheck className="h-8 w-8 text-primary" /><h1 className="font-heading text-3xl md:text-4xl">תעודות כשרות</h1></div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(data || []).map((k: any) => (
          <Card key={k.id}>
            <CardHeader>
              <Badge variant="success" className="w-fit mb-1">{k.certification_level || "כשרות"}</Badge>
              <CardTitle className="text-lg">{k.business_name}</CardTitle>
              <CardDescription>{k.business_type}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-1 text-muted-foreground">
              {k.address && <div>{k.address}</div>}
              {k.valid_until && <div>תוקף עד: {k.valid_until}</div>}
            </CardContent>
          </Card>
        ))}
      </div>
      {(data?.length || 0) === 0 && <div className="text-muted-foreground text-center py-12">אין רשומות כשרות כרגע</div>}
    </div>
  );
}
