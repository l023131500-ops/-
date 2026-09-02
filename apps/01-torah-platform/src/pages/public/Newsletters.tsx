import { useQuery } from "@tanstack/react-query";
import { Download, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

export default function Newsletters() {
  const { tenant } = useTenant();
  const { data, isLoading } = useQuery({
    queryKey: ["newsletters", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("newsletters")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .eq("is_published", true)
        .order("issue_number", { ascending: false, nullsFirst: false })
        .order("publish_date", { ascending: false });
      return data || [];
    },
  });

  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="font-heading text-3xl md:text-4xl mb-6">ניוזלטר ועלוני שבת</h1>
      {isLoading ? (
        <div>טוען...</div>
      ) : (data?.length || 0) === 0 ? (
        <div className="text-muted-foreground">אין גיליונות שפורסמו עדיין</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data!.map((n: any) => (
            <Card key={n.id} className="h-full hover:shadow-md transition-shadow">
              <CardHeader>
                {n.cover_image_url ? (
                  <img src={n.cover_image_url} alt={n.title} className="w-full h-40 object-cover rounded-md mb-3" />
                ) : (
                  <div className="w-full h-40 rounded-md mb-3 bg-muted flex items-center justify-center">
                    <FileText className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                <CardTitle className="text-lg">{n.title}</CardTitle>
                {(n.issue_number != null || n.publish_date) && (
                  <CardDescription>
                    {n.issue_number != null ? `גיליון ${n.issue_number}` : ""}
                    {n.issue_number != null && n.publish_date ? " · " : ""}
                    {n.publish_date || ""}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <Button asChild size="sm" className="w-full">
                  <a href={n.pdf_url} target="_blank" rel="noreferrer">
                    <Download className="ml-2 h-4 w-4" /> הורדת הגיליון
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
