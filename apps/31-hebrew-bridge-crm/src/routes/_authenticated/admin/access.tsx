import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { VisibilityRulesGrid } from "@/components/admin/VisibilityRulesGrid";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/admin/access")({
  component: AccessPage,
});

function AccessPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">מנוע הגדרת חשיפת נתונים</h1>
        <p className="text-muted-foreground mt-1">קבע אילו שדות מהפרופיל גלויים לכל קטגוריית שותף.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <VisibilityRulesGrid />
      </Suspense>
    </div>
  );
}
