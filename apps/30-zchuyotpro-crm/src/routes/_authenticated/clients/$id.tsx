import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { clientQuery } from "@/features/clients/queries";
import { StatusBadge } from "@/features/clients/components/badges";
import { formatDateTimeHe } from "@/lib/format";
import { PersonalTab } from "@/features/clients/tabs/PersonalTab";
import { FamilyTab } from "@/features/clients/tabs/FamilyTab";
import { FinancialTab } from "@/features/clients/tabs/FinancialTab";
import { HousingTab } from "@/features/clients/tabs/HousingTab";
import { VehiclesTab } from "@/features/clients/tabs/VehiclesTab";
import { EntitlementsTab } from "@/features/clients/tabs/EntitlementsTab";
import { MessagesTab } from "@/features/clients/tabs/MessagesTab";
import { DocumentsTab } from "@/features/clients/tabs/DocumentsTab";
import { ReferralsTab } from "@/features/clients/tabs/ReferralsTab";
import { TasksTab } from "@/features/clients/tabs/TasksTab";
import { TimelineTab } from "@/features/clients/tabs/TimelineTab";
import { QuickNoteButton } from "@/features/clients/components/QuickNoteButton";
import { meProfileQuery } from "@/features/clients/queries";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/clients/$id")({
  head: () => ({ meta: [{ title: "תיק לקוח | זכויות פרו" }] }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(clientQuery(params.id)),
  component: ClientProfilePage,
  errorComponent: ({ error }) => <div className="p-4 text-destructive">שגיאה: {error.message}</div>,
  notFoundComponent: () => <div className="p-4">לקוח לא נמצא</div>,
});

const TABS = [
  { v: "personal", l: "פרטים אישיים" },
  { v: "family", l: "משפחה" },
  { v: "financial", l: "פיננסי" },
  { v: "housing", l: "דיור וחשבונות" },
  { v: "vehicles", l: "רכבים" },
  { v: "entitlements", l: "זכאויות" },
  { v: "tasks", l: "משימות" },
  { v: "timeline", l: "ציר זמן" },
  { v: "messages", l: "תקשורת" },
  { v: "documents", l: "מסמכים" },
  { v: "referrals", l: "הפניות לשת״פ" },
] as const;

function ClientProfilePage() {
  const { id } = Route.useParams();
  const { data: client } = useSuspenseQuery(clientQuery(id));
  const { data: me } = useQuery(meProfileQuery());

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/clients"><ArrowRight className="h-4 w-4 ms-1" /> חזרה לרשימה</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs text-muted-foreground font-mono">{client.file_number ?? "—"}</div>
            <h2 className="text-2xl font-bold tracking-tight mt-1">{client.first_name} {client.last_name}</h2>
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
              {client.phone && <span dir="ltr">{client.phone}</span>}
              {client.email && <span dir="ltr">{client.email}</span>}
              {client.city && <span>{client.city}</span>}
              {client.assigned_agent && (
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {client.assigned_agent.full_name}
                </span>
              )}
            </div>
            {client.updated_at && (
              <div className="text-xs text-muted-foreground mt-1">
                עודכן לאחרונה: {formatDateTimeHe(client.updated_at)}
              </div>
            )}
            {client.tags && client.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {client.tags.map((t) => (
                  <Badge key={t} variant="secondary">{t}</Badge>
                ))}
              </div>
            )}
          </div>
          <StatusBadge status={client.status} />
        </CardContent>
      </Card>

      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="flex flex-wrap h-auto justify-start gap-1 bg-card border p-1">
          {TABS.map((t) => (
            <TabsTrigger key={t.v} value={t.v} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              {t.l}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="personal" className="mt-4"><PersonalTab clientId={id} /></TabsContent>
        <TabsContent value="family" className="mt-4"><FamilyTab clientId={id} /></TabsContent>
        <TabsContent value="financial" className="mt-4"><FinancialTab clientId={id} /></TabsContent>
        <TabsContent value="housing" className="mt-4"><HousingTab clientId={id} /></TabsContent>
        <TabsContent value="vehicles" className="mt-4"><VehiclesTab clientId={id} /></TabsContent>
        <TabsContent value="entitlements" className="mt-4"><EntitlementsTab clientId={id} /></TabsContent>
        <TabsContent value="tasks" className="mt-4"><TasksTab clientId={id} /></TabsContent>
        <TabsContent value="timeline" className="mt-4"><TimelineTab clientId={id} /></TabsContent>
        <TabsContent value="messages" className="mt-4"><MessagesTab clientId={id} /></TabsContent>
        <TabsContent value="documents" className="mt-4"><DocumentsTab clientId={id} /></TabsContent>
        <TabsContent value="referrals" className="mt-4"><ReferralsTab clientId={id} /></TabsContent>
      </Tabs>

      <QuickNoteButton clientId={id} tenantId={client.tenant_id} profileId={me?.id ?? null} />
    </div>
  );
}
