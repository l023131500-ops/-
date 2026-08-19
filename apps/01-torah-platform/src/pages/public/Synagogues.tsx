import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Phone, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

export default function Synagogues() {
  const { tenant } = useTenant();
  const { data, isLoading } = useQuery({
    queryKey: ["synagogues", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase.from("synagogues").select("*").eq("tenant_id", tenant!.id).order("name");
      return data || [];
    },
  });

  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="font-heading text-3xl md:text-4xl mb-6">בתי כנסת</h1>
      {isLoading ? <div>טוען...</div> : (data?.length || 0) === 0 ? (
        <div className="text-muted-foreground">אין בתי כנסת רשומים עדיין</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data!.map((s: any) => (
            <Link key={s.id} to={`/synagogues/${s.id}`}>
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{s.name}</CardTitle>
                  {s.nusach && <CardDescription>{s.nusach}</CardDescription>}
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {s.address && <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-3 w-3" /> {s.address}{s.city ? `, ${s.city}` : ""}</div>}
                  {s.gabai_name && <div className="flex items-center gap-2 text-muted-foreground"><User className="h-3 w-3" /> {s.gabai_name}</div>}
                  {s.contact_phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3 w-3" /> {s.contact_phone}</div>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
