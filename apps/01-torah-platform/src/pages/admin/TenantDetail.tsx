import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function TenantDetail() {
  const { id } = useParams();
  const [features, setFeatures] = useState<any>(null);

  const { data: tenant } = useQuery({
    queryKey: ["tenant-admin", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from("tenants").select("*, tenant_branding(*), tenant_features(*)").eq("id", id!).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (tenant?.tenant_features) setFeatures(Array.isArray(tenant.tenant_features) ? tenant.tenant_features[0] : tenant.tenant_features);
  }, [tenant]);

  const saveFeatures = async () => {
    if (!features) return;
    const { error } = await supabase.from("tenant_features").update(features).eq("tenant_id", id!);
    if (error) toast.error(error.message); else toast.success("תכונות נשמרו");
  };

  if (!tenant) return <div>טוען...</div>;

  return (
    <div>
      <Button asChild variant="ghost" className="mb-4"><Link to="/admin/tenants"><ArrowRight className="ml-2 h-4 w-4" /> חזור</Link></Button>
      <h1 className="font-heading text-3xl mb-2">{tenant.display_name || tenant.name}</h1>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-muted-foreground">/{tenant.slug}</span>
        <Button asChild size="sm" variant="outline"><a href={`/t/${tenant.slug}`} target="_blank"><ExternalLink className="ml-1 h-3 w-3" /> צפה באתר</a></Button>
      </div>
      <Card>
        <CardHeader><CardTitle>תכונות מופעלות</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {features && Object.keys(features).filter((k) => typeof features[k] === "boolean").map((k) => (
            <div key={k} className="flex items-center justify-between border-b py-2">
              <Label>{k}</Label>
              <Switch checked={features[k]} onCheckedChange={(v) => setFeatures({ ...features, [k]: v })} />
            </div>
          ))}
          <Button onClick={saveFeatures} className="mt-4">שמור</Button>
        </CardContent>
      </Card>
    </div>
  );
}
