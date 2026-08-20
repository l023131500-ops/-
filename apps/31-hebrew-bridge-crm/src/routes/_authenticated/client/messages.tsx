import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { clientMessagesQueryOptions } from "@/components/client/queries";
import { MessagesList } from "@/components/client/MessagesList";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/client/messages")({
  loader: ({ context }) =>
    (context as any).queryClient.ensureQueryData(clientMessagesQueryOptions),
  component: MessagesPage,
  errorComponent: ({ error }) => {
    const router = useRouter();
    return (
      <div dir="rtl" className="p-6">
        <Card className="p-6">
          <p className="text-destructive font-medium">לא ניתן לטעון את העדכונים.</p>
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

function MessagesPage() {
  return (
    <div dir="rtl" className="p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">עדכונים</h1>
        <p className="text-muted-foreground">
          הודעות ועדכונים שנשלחו אליך מהצוות המטפל בתיק שלך.
        </p>
      </header>

      <Suspense fallback={<Skeleton className="h-80 w-full" />}>
        <MessagesBody />
      </Suspense>
    </div>
  );
}

function MessagesBody() {
  const { data } = useSuspenseQuery(clientMessagesQueryOptions);
  return <MessagesList messages={data} />;
}
