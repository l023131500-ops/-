import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { meClientQuery } from "@/routes/client-area";
import { CustomFieldsSection } from "@/features/customize/CustomFieldsSection";

export const Route = createFileRoute("/client-area/")({
  head: () => ({ meta: [{ title: "פרופיל אישי | זכויות פרו" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { data: c } = useQuery(meClientQuery());
  if (!c) return null;
  const Row = ({ l, v }: { l: string; v?: string | null }) => (
    <div className="grid grid-cols-[110px_1fr] gap-2 text-sm border-b py-1.5">
      <span className="text-muted-foreground">{l}</span>
      <span className="font-medium">{v || "—"}</span>
    </div>
  );
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>פרטי הפרופיל שלי</CardTitle></CardHeader>
        <CardContent>
          <Row l="מספר תיק" v={c.file_number} />
          <Row l="שם" v={`${c.first_name} ${c.last_name}`} />
          <Row l="ת.ז" v={c.id_number} />
          <Row l="טלפון" v={c.phone} />
          <Row l="אימייל" v={c.email} />
          <Row l="כתובת" v={[c.address, c.city].filter(Boolean).join(", ") || null} />
          <Row l="סטטוס" v={c.status} />
          <p className="text-xs text-muted-foreground mt-3">לעדכון פרטים יש לפנות לארגון.</p>
        </CardContent>
      </Card>
      {/* fields the organization exposed to the client (RLS returns only
          visible_to_client definitions; editable only where client_editable) */}
      <CustomFieldsSection clientId={c.id} portal />
    </div>
  );
}
