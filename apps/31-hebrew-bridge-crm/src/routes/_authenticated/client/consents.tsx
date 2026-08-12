import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { clientConsentsQueryOptions } from "@/components/client/queries";
import { ConsentsList } from "@/components/client/ConsentsList";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/client/consents")({
  loader: ({ context }) =>
    (context as any).queryClient.ensureQueryData(clientConsentsQueryOptions),
  component: ConsentsPage,
  errorComponent: ({ error }) => {
    const router = useRouter();
    return (
      <div dir="rtl" className="p-6">
        <Card className="p-6">
          <p className="text-destructive font-medium">לא ניתן לטעון את הרשאות השיתוף.</p>
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

function ConsentsPage() {
  return (
    <div dir="rtl" className="p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">ניהול שיתוף מידע</h1>
        <p className="text-muted-foreground">
          קבע אילו שותפים רשאים לצפות בפרטיך. ההרשאה נשמרת מיד וניתן לבטל אותה בכל רגע.
        </p>
      </header>

      <Suspense fallback={<ConsentsSkeleton />}>
        <ConsentsBody />
      </Suspense>
    </div>
  );
}

function ConsentsBody() {
  const { data } = useSuspenseQuery(clientConsentsQueryOptions);
  return <ConsentsList consents={data} />;
}

function ConsentsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
