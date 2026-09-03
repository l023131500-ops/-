import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, MapPin, Phone, User, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

const DAY_NAMES = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"];

// Reached either via /synagogues/:id (internal, from the tenant-scoped public
// directory) or /s/:token (architecture.md §5.2 synagogue bullet "כרטיס ביכ"נ
// ציבורי /s/[token]" -- a standalone shareable link independent of the
// directory). synagogues.public_token has existed on every row since the
// column was added (NOT NULL, auto-generated via igud_new_token()) but until
// now nothing anywhere ever read it -- no route, no lookup, no share link.
// A row with is_public=false is only reachable via /synagogues/:id (internal
// tenant browsing); the /s/:token entrypoint additionally requires is_public.
export default function SynagogueDetail() {
  const { id, token } = useParams();
  const { data } = useQuery({
    queryKey: ["synagogue", id, token],
    enabled: !!id || !!token,
    queryFn: async () => {
      const query = supabase.from("synagogues").select("*, prayer_times(*)");
      const { data } = token
        ? await query.eq("public_token", token).eq("is_public", true).maybeSingle()
        : await query.eq("id", id!).maybeSingle();
      return data;
    },
  });

  if (!data) return (
    <div className="container mx-auto px-4 py-10 text-center">
      {token ? (
        <>
          <h1 className="font-heading text-2xl font-bold mb-2">הדף לא נמצא</h1>
          <p className="text-muted-foreground">הקישור אינו תקף או שבית הכנסת אינו מפורסם עוד</p>
        </>
      ) : "טוען..."}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      {!token && (
        <Button asChild variant="ghost" className="mb-4"><Link to="/synagogues"><ArrowRight className="ml-2 h-4 w-4" /> חזור</Link></Button>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">{data.name}</CardTitle>
          {data.nusach && <Badge variant="secondary" className="w-fit">{data.nusach}</Badge>}
        </CardHeader>
        <CardContent className="space-y-3">
          {data.address && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> {data.address}{data.city ? `, ${data.city}` : ""}</div>}
          {data.gabbai_name && <div className="flex items-center gap-2"><User className="h-4 w-4 text-primary" /> גבאי: {data.gabbai_name}</div>}
          {data.gabbai_phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> {data.gabbai_phone}</div>}
          {data.description && <p className="text-foreground/85 pt-3">{data.description}</p>}
        </CardContent>
      </Card>

      {data.prayer_times && data.prayer_times.length > 0 && (
        <Card className="mt-6">
          <CardHeader><CardTitle className="text-xl">זמני תפילה</CardTitle></CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-3">
              {data.prayer_times.map((pt: any) => (
                <div key={pt.id} className="border rounded-md p-3">
                  <div className="font-medium">{pt.prayer_type}</div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Clock className="h-3 w-3" /> {pt.time_hhmm}
                  </div>
                  {typeof pt.day_of_week === "number" && (
                    <div className="flex gap-1 mt-2">
                      <Badge variant="outline" className="text-xs">{DAY_NAMES[pt.day_of_week]}</Badge>
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
