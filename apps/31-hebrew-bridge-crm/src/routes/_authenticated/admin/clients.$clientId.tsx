import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommunicationLogPanel } from "@/components/admin/CommunicationLogPanel";
import { AddTaskDialog } from "@/components/admin/AddTaskDialog";
import { ClientTasksList } from "@/components/admin/ClientTasksList";
import { ClientTopicsPanel } from "@/components/admin/ClientTopicsPanel";
import { ClientProfessionalsPanel } from "@/components/admin/ClientProfessionalsPanel";
import { ShareLinkCard } from "@/components/admin/ShareLinkCard";

export const Route = createFileRoute("/_authenticated/admin/clients/$clientId")({
  component: ClientProfilePage,
});

function ClientProfilePage() {
  const { clientId } = Route.useParams();
  return (
    <div className="space-y-6 max-w-5xl animate-fade-in" dir="rtl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/clients"><ChevronRight className="w-4 h-4 ml-1" /> חזרה לרשימת לקוחות</Link>
        </Button>
      </div>
      <div>
        <h1 className="text-3xl font-bold">פרופיל לקוח</h1>
        <p className="text-muted-foreground mt-1 font-mono text-xs">{clientId}</p>
      </div>

      <ShareLinkCard clientId={clientId} />

      <Tabs defaultValue="overview" dir="rtl">
        <TabsList>
          <TabsTrigger value="overview">סקירה כללית</TabsTrigger>
          <TabsTrigger value="tasks">משימות</TabsTrigger>
          <TabsTrigger value="topics">נושאים</TabsTrigger>
          <TabsTrigger value="professionals">אנשי מקצוע</TabsTrigger>
          <TabsTrigger value="communication">יומן תקשורת</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>פרטים אישיים</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">יבנה בשלב הבא.</CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>היסטוריית טיפול</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">יבנה בשלב הבא.</CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <AddTaskDialog defaultClientId={clientId} />
          </div>
          <ClientTasksList clientId={clientId} />
        </TabsContent>

        <TabsContent value="topics" className="mt-4">
          <ClientTopicsPanel clientId={clientId} />
        </TabsContent>

        <TabsContent value="professionals" className="mt-4">
          <ClientProfessionalsPanel clientId={clientId} />
        </TabsContent>

        <TabsContent value="communication" className="mt-4">
          <CommunicationLogPanel clientId={clientId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
