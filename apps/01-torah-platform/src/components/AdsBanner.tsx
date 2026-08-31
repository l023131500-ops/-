import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

// public.ads (architecture.md §3.2 "activity_slides – באנרי פרסום עם גדלים
// (small/medium/large)"): the table+RLS existed live since 20260519000002
// with a size ('small'/'medium'/'large'/'hero') + placement
// ('homepage'/'sidebar'/'footer'/'strip') column pair, but no React code
// anywhere read from it — only the platform's own hardcoded self-promo
// banners (DonationBanner/SynagogueBanner/StudyDayBanner/BulkUploadBanner)
// existed, so a tenant admin had no way to run an actual promotional banner
// on their own site. This renders whatever that tenant configured.

const SIZE_CLASSES: Record<string, string> = {
  small: "h-20 md:h-24",
  medium: "h-32 md:h-40",
  large: "h-48 md:h-64",
  hero: "h-64 md:h-96",
};

interface AdsBannerProps {
  placement: "homepage" | "sidebar" | "footer" | "strip";
  className?: string;
}

export default function AdsBanner({ placement, className }: AdsBannerProps) {
  const { tenant } = useTenant();

  const { data: ads } = useQuery({
    queryKey: ["ads-banner", tenant?.id, placement],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("ads")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .eq("placement", placement)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      const now = Date.now();
      return (data || []).filter((ad: any) => {
        if (ad.starts_at && new Date(ad.starts_at).getTime() > now) return false;
        if (ad.ends_at && new Date(ad.ends_at).getTime() < now) return false;
        return true;
      });
    },
  });

  if (!ads || ads.length === 0) return null;

  return (
    <section className={`container mx-auto px-4 py-4 space-y-3 ${className || ""}`} dir="rtl">
      {ads.map((ad: any) => {
        const img = (
          <img
            src={ad.image_url}
            alt={ad.title}
            className={`w-full object-cover rounded-2xl shadow-md ${SIZE_CLASSES[ad.size] || SIZE_CLASSES.medium}`}
          />
        );
        return ad.link_url ? (
          <a
            key={ad.id}
            href={ad.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block hover:opacity-95 transition-opacity"
          >
            {img}
          </a>
        ) : (
          <div key={ad.id}>{img}</div>
        );
      })}
    </section>
  );
}
