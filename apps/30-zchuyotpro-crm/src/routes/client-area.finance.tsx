import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { meClientQuery } from "@/routes/client-area";
import { CashflowPanel } from "@/features/clients/components/CashflowPanel";

export const Route = createFileRoute("/client-area/finance")({
  head: () => ({ meta: [{ title: "כספים | אזור אישי" }] }),
  component: FinancePage,
});

function FinancePage() {
  const { data: client, isLoading } = useQuery(meClientQuery());

  if (isLoading || !client) {
    return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return <CashflowPanel clientId={client.id} tenantId={client.tenant_id} mode="client" />;
}
