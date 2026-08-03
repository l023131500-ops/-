import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

export default function Gallery() {
  const { tenant } = useTenant();
  const { data } = useQuery({
    queryKey: ["gallery", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase.from("gallery_images").select("*").eq("tenant_id", tenant!.id).order("created_at", { ascending: false });
      return data || [];
    },
  });
  return (
    <div>
      <h1 className="font-heading text-3xl mb-6">גלריה</h1>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {(data || []).map((g: any) => (
          <img key={g.id} src={g.image_url} alt={g.caption || ""} className="aspect-square object-cover rounded-md bg-muted" />
        ))}
      </div>
      {(data?.length || 0) === 0 && <div className="text-muted-foreground">אין תמונות</div>}
    </div>
  );
}
