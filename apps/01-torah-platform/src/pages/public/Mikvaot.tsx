import { useQuery } from "@tanstack/react-query";
import { Droplet, MapPin, Phone, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

export default function Mikvaot() {
  const { tenant } = useTenant();
  const { data } = useQuery({
    queryKey: ["mikvaot", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase.from("community_services").select("*").eq("tenant_id", tenant!.id).eq("service_type", "mikveh").eq("is_active", true).order("title");
      return data || [];
    },
  });
  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-6"><Droplet className="h-8 w-8 text-primary" /><h1 className="font-heading text-3xl md:text-4xl">מקוואות</h1></div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(data || []).map((m: any) => (
          <Card key={m.id}>
            <CardHeader><CardTitle className="text-lg">{m.title}</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2 text-muted-foreground">
              {m.address && <div className="flex items-center gap-2"><MapPin className="h-3 w-3" /> {m.address}</div>}
              {m.contact_phone && <div className="flex items-center gap-2"><Phone className="h-3 w-3" /> {m.contact_phone}</div>}
              {m.hours && <div className="flex items-center gap-2"><Clock className="h-3 w-3" /> {m.hours}</div>}
            </CardContent>
          </Card>
        ))}
      </div>
      {(data?.length || 0) === 0 && <div className="text-muted-foreground text-center py-12">אין מקוואות רשומים</div>}
    </div>
  );
}
