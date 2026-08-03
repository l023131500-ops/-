import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { PartnersTable } from "@/components/admin/PartnersTable";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/admin/partners")({
  component: PartnersPage,
});

function PartnersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">רשת שותפים</h1>
        <p className="text-muted-foreground mt-1">ניהול שותפים עסקיים, התמחויות ועומסי טיפול.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <PartnersTable />
      </Suspense>
    </div>
  );
}
