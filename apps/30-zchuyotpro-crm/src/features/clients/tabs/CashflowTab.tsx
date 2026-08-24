import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { clientQuery, meProfileQuery } from "@/features/clients/queries";
import { CashflowPanel } from "@/features/clients/components/CashflowPanel";

export function CashflowTab({ clientId }: { clientId: string }) {
  const { data: client } = useSuspenseQuery(clientQuery(clientId));
  const { data: me } = useQuery(meProfileQuery());
  return <CashflowPanel clientId={clientId} tenantId={client.tenant_id} mode="staff" profileId={me?.id ?? null} />;
}
