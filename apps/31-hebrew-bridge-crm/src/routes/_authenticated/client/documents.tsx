import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { clientDashboardQueryOptions } from "@/components/client/queries";
import { DocumentDropzone } from "@/components/client/DocumentDropzone";
import { DocumentsList } from "@/components/client/DocumentsList";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/client/documents")({
  loader: ({ context }) =>
    (context as any).queryClient.ensureQueryData(clientDashboardQueryOptions),
  component: DocumentsPage,
  errorComponent: ({ error }) => {
    const router = useRouter();
    return (
      <div dir="rtl" className="p-6">
        <Card className="p-6">
          <p className="text-destructive font-medium">לא ניתן לטעון את תיק המסמכים.</p>
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

function DocumentsPage() {
  return (
    <div dir="rtl" className="p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          תיק מסמכים מאובטח
        </h1>
        <p className="text-muted-foreground">
          העלאה וניהול של מסמכים אישיים. הקבצים נשמרים באחסון מוצפן ופרטי.
        </p>
      </header>

      <Suspense fallback={<Skeleton className="h-80 w-full" />}>
        <DocumentsBody />
      </Suspense>
    </div>
  );
}

function DocumentsBody() {
  const { data } = useSuspenseQuery(clientDashboardQueryOptions);
  return (
    <div className="space-y-6">
      <DocumentDropzone userId={data.userId} />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">מסמכים שהועלו</h2>
        <DocumentsList documents={data.uploadedDocuments} />
      </section>
    </div>
  );
}
