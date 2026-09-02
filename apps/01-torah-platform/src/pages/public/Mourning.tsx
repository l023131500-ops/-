import { useQuery } from "@tanstack/react-query";
import { Phone, Mail, MapPin, Clock, Link as LinkIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

// community_services rows with service_type='mourning' ("מדריך אבלות מקומי") are
// already fully manageable by tenant staff via portal/CommunityServices.tsx, and
// community_services_tenant_read RLS already grants public/anon SELECT for active
// tenants (same pattern public/Mikvaot.tsx and public/Kashrut.tsx rely on) — but
// this page, unlike its siblings, never queried the table: it was 100% hardcoded
// generic halachic text with no tenant awareness at all, so a religious council or
// synagogue had no way to publish their own chevra kadisha contact, local burial
// society hours, or guidance links here. The generic halachic overview below is
// still useful on its own, so it stays; the tenant's local contacts are added above
// it when the tenant has published any.
export default function Mourning() {
  const { tenant } = useTenant();
  const { data } = useQuery({
    queryKey: ["mourning-services", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("community_services")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .eq("service_type", "mourning")
        .eq("is_active", true)
        .order("title");
      return data || [];
    },
  });

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <h1 className="font-heading text-3xl md:text-4xl mb-6">מדריך אבלות</h1>

      {(data?.length || 0) > 0 && (
        <div className="mb-10 space-y-4">
          <h2 className="font-heading text-2xl mb-2">יצירת קשר מקומית</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {data!.map((m: any) => (
              <Card key={m.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{m.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2 text-muted-foreground">
                  {m.description && <p>{m.description}</p>}
                  {m.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3" /> {m.address}
                    </div>
                  )}
                  {m.hours && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" /> {m.hours}
                    </div>
                  )}
                  {m.contact_name && (
                    <div>
                      {m.contact_name}
                      {m.contact_phone && ` · ${m.contact_phone}`}
                    </div>
                  )}
                  {!m.contact_name && m.contact_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3" /> {m.contact_phone}
                    </div>
                  )}
                  {m.contact_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3" /> {m.contact_email}
                    </div>
                  )}
                  {Array.isArray(m.links) &&
                    m.links.map((l: any, i: number) => (
                      <a
                        key={i}
                        href={l.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <LinkIcon className="h-3 w-3" /> {l.label || l.url}
                      </a>
                    ))}
                  {m.notes && <p className="text-xs">{m.notes}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6 text-foreground/85">
        <section>
          <h2 className="font-heading text-2xl mb-2">קריעה</h2>
          <p>מנהג הקריעה הוא ביטוי לאבל על קרוב משפחה. הקריעה נעשית לפני הקבורה, בעמידה, בצד שמאל למת קרוב (חוץ מהורים — בצד ימין).</p>
        </section>
        <section>
          <h2 className="font-heading text-2xl mb-2">שבעה</h2>
          <p>שבעת ימי האבל מתחילים מיד אחרי הקבורה. בימים אלו האבל יושב בבית, נמנע מיציאה, מרחיצה, מנעלי עור, ומיחסי אישות.</p>
        </section>
        <section>
          <h2 className="font-heading text-2xl mb-2">שלושים</h2>
          <p>שלושים יום מהקבורה — אסור בתספורת, גיהוץ, ובשמחות. על הורים — שנה שלמה.</p>
        </section>
        <section>
          <h2 className="font-heading text-2xl mb-2">קדיש ויארצייט</h2>
          <p>הבן (או קרוב) אומר קדיש 11 חודשים על הורים, ו-30 יום על קרובים אחרים. יום השנה (יארצייט) נקבע לפי תאריך הפטירה העברי.</p>
        </section>
        <section className="border-t pt-6">
          <p className="text-sm text-muted-foreground">לכל שאלה בענייני אבלות — צור קשר עם המועצה הדתית או הרב המקומי.</p>
        </section>
      </div>
    </div>
  );
}
