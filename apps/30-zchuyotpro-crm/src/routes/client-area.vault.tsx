import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { meClientQuery } from "@/routes/client-area";
import { PersonalAreasPanel } from "@/features/clients/components/PersonalAreasPanel";

export const Route = createFileRoute("/client-area/vault")({
  head: () => ({ meta: [{ title: "אזורים אישיים | אזור אישי" }] }),
  component: VaultPage,
});

function VaultPage() {
  const { data: client, isLoading } = useQuery(meClientQuery());

  if (isLoading || !client) {
    return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return <PersonalAreasPanel clientId={client.id} tenantId={client.tenant_id} mode="client" />;
}
