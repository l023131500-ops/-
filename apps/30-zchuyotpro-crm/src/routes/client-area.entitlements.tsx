import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { queryOptions } from "@tanstack/react-query";
import { meClientQuery } from "@/routes/client-area";
import { ENTITLEMENT_STATUS, ENTITLEMENT_STATUS_COLOR } from "@/features/clients/constants";
import { EntitlementCategoryBadge } from "@/features/clients/components/badges";

const myEntsQuery = (clientId: string | undefined) =>
  queryOptions({
    queryKey: ["my-ents", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("client_entitlements")
        .select("*, entitlement:entitlements(*)")
        .eq("client_id", clientId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clientId,
  });

export const Route = createFileRoute("/client-area/entitlements")({
  head: () => ({ meta: [{ title: "זכאויות | אזור אישי" }] }),
  component: EntsPage,
});

function EntsPage() {
  const { data: client } = useQuery(meClientQuery());
  const { data: ents, isLoading } = useQuery(myEntsQuery(client?.id));

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (ents ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">לא נמצאו זכאויות</p>
        ) : (
          (ents ?? []).map((e) => (
            <div key={e.id} className="border-b last:border-0 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-sm">
                  {e.entitlement?.title}
                  {e.entitlement?.year && <span className="text-xs text-muted-foreground font-normal ms-1">({e.entitlement.year})</span>}
                </div>
                <div className="flex items-center gap-2">
                  <EntitlementCategoryBadge category={e.entitlement?.category ?? null} />
                  <Badge className={ENTITLEMENT_STATUS_COLOR[e.status] ?? ""}>
                    {ENTITLEMENT_STATUS[e.status as keyof typeof ENTITLEMENT_STATUS] ?? e.status}
                  </Badge>
                </div>
              </div>
              {e.entitlement?.description && (
                <p className="text-xs text-muted-foreground mt-1">{e.entitlement.description}</p>
              )}
              {e.entitlement?.source && (
                <p className="text-xs text-muted-foreground mt-1">מקור: {e.entitlement.source}</p>
              )}
              {e.notes && <p className="text-xs mt-1"><span className="text-muted-foreground">הערות: </span>{e.notes}</p>}
              {e.status === "handled" && e.handled_at && (
                <p className="text-xs text-muted-foreground mt-1">טופל בתאריך {new Date(e.handled_at).toLocaleDateString("he-IL")}</p>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
