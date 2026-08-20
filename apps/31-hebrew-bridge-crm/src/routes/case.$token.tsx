import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TreatmentTracker } from "@/components/client/TreatmentTracker";

/**
 * כתובת מוחלטת בתוך האפליקציה — אותו תיקון בדיוק כמו ב-auth.tsx (מערכת 30
 * נפלה בבאג #201 כש-window.location.origin לבדו נשלח בלי /gesher).
 */
const appUrl = (path: string) =>
  `${window.location.origin}${import.meta.env.BASE_URL}${path}`.replace(/([^:]\/)\/+/g, "$1");

// Public, no-login case-status page — the link an admin shares from the
// client's "קישור מעקב ללא כניסה" card (see ShareLinkCard). Mirrors the
// identical page built for the sibling CRM 30-zchuyotpro-crm, adapted to
// this app's own treatment-status vocabulary (TreatmentTracker, already used
// on the logged-in client's own /client/status page).
type CaseStatus = {
  full_name: string | null;
  treatment_status: "not_started" | "sent" | "in_progress" | "completed";
  assigned_partner_name: string | null;
  document_count: number;
  registered_at: string;
};

export const Route = createFileRoute("/case/$token")({
  head: () => ({ meta: [{ title: "מעקב תיק | גשר CRM" }] }),
  ssr: false,
  component: PublicCaseStatusPage,
});

function PublicCaseStatusPage() {
  const { token } = Route.useParams();
  const [data, setData] = useState<CaseStatus | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetch(appUrl(`api/public/case-status?token=${encodeURIComponent(token)}`))
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData(null); });
    return () => { cancelled = true; };
  }, [token]);

  if (data === undefined) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md text-center space-y-2">
          <h1 className="text-xl font-bold">הקישור אינו זמין</h1>
          <p className="text-sm text-muted-foreground">הקישור שגוי, פג תוקף, או שהשיתוף כובה על ידי הצוות המטפל.</p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background flex flex-col items-center p-4 sm:p-8">
      <div className="w-full max-w-lg space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4" /> מעקב תיק — צפייה ללא כניסה
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{data.full_name ?? "לקוח/ה"}</CardTitle>
            {data.assigned_partner_name && (
              <p className="text-sm text-muted-foreground mt-1">שותף מטפל: {data.assigned_partner_name}</p>
            )}
          </CardHeader>
          <CardContent>
            <TreatmentTracker status={data.treatment_status} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div className="text-sm text-muted-foreground">
              {data.document_count > 0
                ? `הועלו ${data.document_count} מסמכים לתיק המאובטח`
                : "עדיין לא הועלו מסמכים לתיק"}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
