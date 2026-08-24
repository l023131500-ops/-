import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { clientQuery, meProfileQuery } from "@/features/clients/queries";
import { PersonalAreasPanel } from "@/features/clients/components/PersonalAreasPanel";

export function PersonalAreasTab({ clientId }: { clientId: string }) {
  const { data: client } = useSuspenseQuery(clientQuery(clientId));
  const { data: me } = useQuery(meProfileQuery());
  return <PersonalAreasPanel clientId={clientId} tenantId={client.tenant_id} mode="staff" profileId={me?.id ?? null} />;
}
