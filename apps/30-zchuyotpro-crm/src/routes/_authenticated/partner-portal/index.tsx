import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { myPartnerQuery, portalReferralsQuery } from "@/features/partners/queries";
import { ReferralStatusBadge } from "@/features/clients/components/badges";
import { formatDateHe } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/partner-portal/")({
  head: () => ({ meta: [{ title: "פורטל שותפים | זכויות פרו" }] }),
  component: PortalHome,
});

function PortalHome() {
  const { data: partner } = useSuspenseQuery(myPartnerQuery());
  const { data: referrals } = useSuspenseQuery(portalReferralsQuery());

  if (!partner) {
    return (
      <div dir="rtl">
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          חשבונך אינו מקושר לפרופיל שותף. פנה למנהל המערכת.
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="text-2xl font-bold">שלום, {partner.contact_name ?? partner.company_name}</h2>
        <p className="text-muted-foreground text-sm mt-1">להלן ההפניות שהופנו אליך</p>
      </div>
      <Card>
        <CardHeader><CardTitle>הפניות פעילות ({referrals.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>תיק</TableHead>
                <TableHead>לקוח</TableHead>
                <TableHead>תאריך</TableHead>
                <TableHead>סטטוס</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {referrals.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">אין הפניות</TableCell></TableRow>}
              {referrals.map((r) => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-mono text-xs"><Link to="/partner-portal/$referralId" params={{ referralId: r.id }} className="hover:underline">{r.client?.file_number ?? "—"}</Link></TableCell>
                  <TableCell><Link to="/partner-portal/$referralId" params={{ referralId: r.id }} className="hover:underline">{r.client?.first_name} {r.client?.last_name}</Link></TableCell>
                  <TableCell>{formatDateHe(r.sent_at)}</TableCell>
                  <TableCell><ReferralStatusBadge status={r.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
