import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

export default function Participants() {
  const { tenant } = useTenant();
  const { data } = useQuery({
    queryKey: ["participants", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase.from("participants").select("*, lessons(title)").eq("tenant_id", tenant!.id).order("created_at", { ascending: false });
      return data || [];
    },
  });
  return (
    <div>
      <h1 className="font-heading text-3xl mb-6">משתתפים</h1>
      <div className="space-y-2">
        {(data || []).map((p: any) => (
          <Card key={p.id}><CardContent className="py-3 flex justify-between"><div><div className="font-medium">{p.full_name}</div><div className="text-sm text-muted-foreground">{p.lessons?.title} · {p.phone}</div></div></CardContent></Card>
        ))}
        {(data?.length || 0) === 0 && <div className="text-muted-foreground">אין משתתפים עדיין</div>}
      </div>
    </div>
  );
}
