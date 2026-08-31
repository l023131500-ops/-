import { useQuery } from "@tanstack/react-query";
import { Pin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

const CATEGORY_LABELS: Record<string, string> = {
  general: "כללי",
  urgent: "דחוף",
  event: "אירוע",
  condolence: "אבל ותנחומים",
};

export default function Announcements() {
  const { tenant } = useTenant();
  const { data, isLoading } = useQuery({
    queryKey: ["public-announcements", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("announcements")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .eq("is_published", true)
        .or(`expires_at.is.null,expires_at.gte.${today}`)
        .order("is_pinned", { ascending: false })
        .order("publish_date", { ascending: false });
      return data || [];
    },
  });

  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="font-heading text-3xl md:text-4xl mb-6">מודעות</h1>
      {isLoading ? (
        <div>טוען...</div>
      ) : (data?.length || 0) === 0 ? (
        <div className="text-muted-foreground">אין מודעות כרגע</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data!.map((a: any) => (
            <Card key={a.id} className={a.is_pinned ? "border-primary h-full" : "h-full"}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {CATEGORY_LABELS[a.category as string] || "כללי"}
                  </Badge>
                  {a.is_pinned && (
                    <Badge className="text-xs gap-1">
                      <Pin className="h-3 w-3" /> מוצמד
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg">{a.title}</CardTitle>
                {a.publish_date && <CardDescription>{a.publish_date}</CardDescription>}
              </CardHeader>
              {a.body && (
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{a.body}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
