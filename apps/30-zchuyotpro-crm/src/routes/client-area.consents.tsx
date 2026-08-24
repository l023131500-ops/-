import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Handshake, ShieldCheck, ShieldX, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { formatDateHe } from "@/lib/format";
import { PARTNER_CATEGORY, REFERRAL_STATUS } from "@/features/clients/constants";
import { ALLOWED_CLIENT_FIELDS } from "@/features/partners/constants";
import {
  myReferralRequestsQuery,
  myConsentStateQuery,
  respondReferralConsent,
  setMyConsent,
  CONSENT_STATUS_LABELS,
  type MyReferralRequest,
} from "@/features/clients/consents";

export const Route = createFileRoute("/client-area/consents")({
  head: () => ({ meta: [{ title: "שיתופי פעולה | אזור אישי" }] }),
  component: ConsentsPage,
});

const categoryLabel = (c: string) => (PARTNER_CATEGORY as Record<string, string>)[c] ?? c;
const fieldLabel = (f: string) => (ALLOWED_CLIENT_FIELDS as Record<string, string>)[f] ?? f;

function FieldList({ fields }: { fields: string[] }) {
  if (fields.length === 0) {
    return <p className="text-xs text-muted-foreground">לא הוגדרו שדות לחשיפה — לא יועברו פרטים.</p>;
  }
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="text-xs font-medium text-muted-foreground mb-2">בדיוק הפרטים האלה יועברו — ולא מעבר להם:</div>
      <ul className="grid grid-cols-2 gap-1 text-sm">
        {fields.map((f) => (
          <li key={f} className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {fieldLabel(f)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PendingRequestCard({ req }: { req: MyReferralRequest }) {
  const qc = useQueryClient();
  const respond = useMutation({
    mutationFn: (approve: boolean) => respondReferralConsent(req.id, approve),
    onSuccess: (res) => {
      toast.success(res.consent_status === "approved" ? "אישרת את העברת הפרטים" : "דחית את הבקשה — שום פרט לא הועבר");
      qc.invalidateQueries({ queryKey: ["my-referral-requests"] });
      qc.invalidateQueries({ queryKey: ["my-consent-state"] });
      qc.invalidateQueries({ queryKey: ["portal-notifications"] });
    },
    onError: (e: Error) => toast.error("שגיאה", { description: e.message }),
  });

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <div className="font-semibold">{req.partner_name}</div>
          <div className="text-xs text-muted-foreground">תחום: {categoryLabel(req.partner_category)} · {formatDateHe(req.sent_at)}</div>
        </div>
        <Badge className="bg-amber-100 text-amber-800 border-0">
          <Clock className="h-3 w-3 me-1" /> ממתין לאישורך
        </Badge>
      </div>
      {req.notes && (
        <p className="text-sm">
          <span className="text-muted-foreground">הודעה מהמשרד: </span>
          {req.notes}
        </p>
      )}
      <FieldList fields={req.allowed_fields} />
      <p className="text-xs text-muted-foreground">
        אישור הבקשה יעניק גם הסכמה קבועה לתחום {categoryLabel(req.partner_category)} — פניות עתידיות בתחום זה יישלחו מיד.
        ניתן לבטל את ההסכמה בכל רגע בהמשך העמוד.
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => respond.mutate(true)} disabled={respond.isPending}>
          {respond.isPending ? <Loader2 className="h-4 w-4 animate-spin ms-1" /> : <ShieldCheck className="h-4 w-4 ms-1" />}
          מאשר/ת את ההעברה
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-destructive"
          disabled={respond.isPending}
          onClick={() => {
            if (window.confirm("לדחות את הבקשה? שום פרט לא יועבר לשותף.")) respond.mutate(false);
          }}
        >
          <ShieldX className="h-4 w-4 ms-1" /> לא מאשר/ת
        </Button>
      </div>
    </div>
  );
}

function ConsentsPage() {
  const qc = useQueryClient();
  const { data: requests, isLoading: reqLoading } = useQuery(myReferralRequestsQuery());
  const { data: topics, isLoading: topicsLoading } = useQuery(myConsentStateQuery());

  const toggle = useMutation({
    mutationFn: ({ category, grant }: { category: string; grant: boolean }) => setMyConsent(category, grant),
    onSuccess: (_res, vars) => {
      toast.success(vars.grant ? `הסכמה קבועה ניתנה לתחום ${categoryLabel(vars.category)}` : `ההסכמה לתחום ${categoryLabel(vars.category)} בוטלה`);
      qc.invalidateQueries({ queryKey: ["my-consent-state"] });
    },
    onError: (e: Error) => toast.error("שגיאה", { description: e.message }),
  });

  const pending = (requests ?? []).filter((r) => r.consent_status === "awaiting_client");
  const decided = (requests ?? []).filter((r) => r.consent_status !== "awaiting_client");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Handshake className="h-4 w-4" /> בקשות להעברת פרטים
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            המשרד מבקש להעביר חלק מהפרטים שלך לגורם מקצועי לבדיקה. לפני כל העברה מוצג לך בדיוק מה יועבר —
            ושום פרט לא עובר בלי אישורך.
          </p>
          {reqLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : pending.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">אין בקשות שממתינות לאישורך</p>
          ) : (
            pending.map((req) => <PendingRequestCard key={req.id} req={req} />)
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">הסכמות קבועות לפי תחום</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-sm text-muted-foreground pb-2">
            תחום שאושר באופן קבוע — פניות עתידיות אליו יישלחו מיד, בלי בקשת אישור נוספת. אפשר לבטל בכל רגע.
          </p>
          {topicsLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (topics ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">אין תחומי שיתוף פעולה פעילים במשרד</p>
          ) : (
            (topics ?? []).map((t) => (
              <div key={t.category} className="border-b last:border-0 py-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-sm">{categoryLabel(t.category)}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.is_granted === true
                        ? `הסכמה פעילה${t.decided_at ? ` מאז ${formatDateHe(t.decided_at)}` : ""}`
                        : t.is_granted === false
                          ? "ההסכמה בוטלה — כל פנייה תדרוש אישור"
                          : "טרם הוחלט — כל פנייה תדרוש אישור"}
                    </div>
                  </div>
                  <Switch
                    checked={t.is_granted === true}
                    disabled={toggle.isPending}
                    onCheckedChange={(checked) => toggle.mutate({ category: t.category, grant: checked === true })}
                  />
                </div>
                {t.fields.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    פרטים שעשויים להיות מועברים בתחום זה: {t.fields.map(fieldLabel).join(", ")}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">היסטוריית העברות</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {reqLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : decided.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">אין העברות קודמות</p>
          ) : (
            decided.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 border-b last:border-0 py-2">
                <div>
                  <div className="text-sm font-medium">{r.partner_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {categoryLabel(r.partner_category)} · {formatDateHe(r.sent_at)} · סטטוס טיפול: {(REFERRAL_STATUS as Record<string, string>)[r.status] ?? r.status}
                  </div>
                </div>
                <Badge
                  className={cn(
                    "border-0",
                    r.consent_status === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800",
                  )}
                >
                  {CONSENT_STATUS_LABELS[r.consent_status]}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
