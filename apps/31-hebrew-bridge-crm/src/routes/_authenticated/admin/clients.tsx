import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { ClientsTable } from "@/components/admin/ClientsTable";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/admin/clients")({
  component: ClientsPage,
});

function ClientsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">ניהול לקוחות מרוכז</h1>
        <p className="text-muted-foreground mt-1">צפייה, סינון וניהול לקוחות במערכת.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ClientsTable />
      </Suspense>
    </div>
  );
}
