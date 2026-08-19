import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { FolderLock } from "lucide-react";
import { clientDashboardQueryOptions } from "@/components/client/queries";
import { TreatmentTracker } from "@/components/client/TreatmentTracker";
import { AssignedPartnerBanner } from "@/components/client/AssignedPartnerBanner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/client/status")({
  loader: ({ context }) =>
    (context as any).queryClient.ensureQueryData(clientDashboardQueryOptions),
  component: StatusPage,
  errorComponent: ({ error }) => {
    const router = useRouter();
    return (
      <div dir="rtl" className="p-6">
        <Card className="p-6">
          <p className="text-destructive font-medium">לא ניתן לטעון את מסך הבית.</p>
          <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
          <Button className="mt-4" onClick={() => router.invalidate()}>
            נסה שוב
          </Button>
        </Card>
      </div>
    );
  },
  notFoundComponent: () => (
    <div dir="rtl" className="p-6 text-muted-foreground">העמוד לא נמצא.</div>
  ),
});

function StatusPage() {
  return (
    <div dir="rtl" className="p-6 space-y-6">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardBody />
      </Suspense>
    </div>
  );
}

function DashboardBody() {
  const { data } = useSuspenseQuery(clientDashboardQueryOptions);
  const greeting = data.fullName ? `שלום, ${data.fullName}` : "שלום";

  return (
    <>
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{greeting}</h1>
        <p className="text-muted-foreground">
          ברוך הבא לאזור האישי שלך. כאן תוכל לעקוב אחר התקדמות הטיפול ולנהל את המסמכים שלך.
        </p>
      </header>

      <Card className="p-6 space-y-5">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">ציר התקדמות הבדיקה</h2>
          <p className="text-sm text-muted-foreground">סטטוס הטיפול הנוכחי בתיק שלך</p>
        </div>
        <TreatmentTracker status={data.treatmentStatus} />
      </Card>

      {data.assignedPartnerName && (
        <AssignedPartnerBanner partnerName={data.assignedPartnerName} />
      )}

      <Card className="p-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FolderLock className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">תיק המסמכים המאובטח</h3>
            <p className="text-sm text-muted-foreground">
              {data.uploadedDocuments.length > 0
                ? `הועלו ${data.uploadedDocuments.length} מסמכים`
                : "עדיין לא הועלו מסמכים"}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link to="/client/documents">פתיחת הכספת</Link>
        </Button>
      </Card>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
