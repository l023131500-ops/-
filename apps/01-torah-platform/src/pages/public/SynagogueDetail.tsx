import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, MapPin, Phone, User, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

const DAY_NAMES = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"];

export default function SynagogueDetail() {
  const { id } = useParams();
  const { data } = useQuery({
    queryKey: ["synagogue", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from("synagogues").select("*, prayer_times(*)").eq("id", id!).maybeSingle();
      return data;
    },
  });

  if (!data) return <div className="container mx-auto px-4 py-10">טוען...</div>;

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <Button asChild variant="ghost" className="mb-4"><Link to="/synagogues"><ArrowRight className="ml-2 h-4 w-4" /> חזור</Link></Button>
      <Card>
        <CardHeader>
          <CardTitle as="h1" className="text-3xl">{data.name}</CardTitle>
          {data.nusach && <Badge variant="secondary" className="w-fit">{data.nusach}</Badge>}
        </CardHeader>
        <CardContent className="space-y-3">
          {data.address && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> {data.address}{data.city ? `, ${data.city}` : ""}</div>}
          {data.gabai_name && <div className="flex items-center gap-2"><User className="h-4 w-4 text-primary" /> גבאי: {data.gabai_name}</div>}
          {data.contact_phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> <span dir="ltr">{data.contact_phone}</span></div>}
          {data.description && <p className="text-foreground/85 pt-3">{data.description}</p>}
        </CardContent>
      </Card>

      {data.prayer_times && data.prayer_times.length > 0 && (
        <Card className="mt-6">
          <CardHeader><CardTitle as="h2" className="text-xl">זמני תפילה</CardTitle></CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-3">
              {data.prayer_times.map((pt: any) => (
                <div key={pt.id} className="border rounded-md p-3">
                  <div className="font-medium">{pt.prayer_name}</div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Clock className="h-3 w-3" /> {pt.time}
                  </div>
                  {Array.isArray(pt.days_of_week) && (
                    <div className="flex gap-1 mt-2">
                      {pt.days_of_week.map((d: number) => <Badge key={d} variant="outline" className="text-xs">{DAY_NAMES[d]}</Badge>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
