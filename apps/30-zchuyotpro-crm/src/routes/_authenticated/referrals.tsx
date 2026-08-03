import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { allReferralsQuery, referralsStatsQuery } from "@/features/partners/queries";
import { partnersQuery } from "@/features/clients/queries";
import { PARTNER_CATEGORY, REFERRAL_STATUS } from "@/features/clients/constants";
import { ReferralStatusBadge } from "@/features/clients/components/badges";
import { formatDateHe } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated/referrals")({
  head: () => ({ meta: [{ title: "הפניות לשת״פ | זכויות פרו" }] }),
  component: ReferralsDashboardPage,
});

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card><CardContent className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
    </CardContent></Card>
  );
}

function ReferralsDashboardPage() {
  const [partnerId, setPartnerId] = useState("all");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const { data: stats } = useSuspenseQuery(referralsStatsQuery());
  const { data: partners } = useSuspenseQuery(partnersQuery());
  const { data: rows } = useSuspenseQuery(allReferralsQuery({ partnerId, status, from: from || undefined, to: to || undefined, search }));

  const selectedRow = rows.find((r) => r.id === selected);

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">הפניות לשת״פ</h2>
        <p className="text-muted-foreground text-sm mt-1">סקירת כל ההפניות לשותפים במערכת</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatCard label="סה״כ" value={stats.total} color="" />
        <StatCard label="נשלח" value={stats.sent} color="text-muted-foreground" />
        <StatCard label="ממתין" value={stats.pending} color="text-yellow-700 dark:text-yellow-300" />
        <StatCard label="בטיפול" value={stats.in_progress} color="text-blue-700 dark:text-blue-300" />
        <StatCard label="הושלם" value={stats.completed} color="text-green-700 dark:text-green-300" />
        <StatCard label="נדחה" value={stats.rejected} color="text-red-700 dark:text-red-300" />
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">חיפוש לקוח</Label>
            <div className="relative">
              <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pe-9" placeholder="שם או תיק..." />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">שותף</Label>
            <Select value={partnerId} onValueChange={setPartnerId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל השותפים</SelectItem>
                {partners.map((p) => <SelectItem key={p.id} value={p.id}>{p.company_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">סטטוס</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">הכל</SelectItem>
                {Object.entries(REFERRAL_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">מתאריך</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="space-y-1.5"><Label className="text-xs">עד תאריך</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>תיק</TableHead>
                <TableHead>לקוח</TableHead>
                <TableHead>שותף</TableHead>
                <TableHead>קטגוריה</TableHead>
                <TableHead>נשלח</TableHead>
                <TableHead>סטטוס</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">לא נמצאו הפניות</TableCell></TableRow>}
              {rows.map((r) => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(r.id)}>
                  <TableCell className="font-mono text-xs">{r.client?.file_number ?? "—"}</TableCell>
                  <TableCell>{r.client?.first_name} {r.client?.last_name}</TableCell>
                  <TableCell>{r.partner?.company_name ?? "—"}</TableCell>
                  <TableCell className="text-sm">{r.partner ? (PARTNER_CATEGORY as Record<string, string>)[r.partner.category] ?? r.partner.category : "—"}</TableCell>
                  <TableCell className="text-sm">{formatDateHe(r.sent_at)}</TableCell>
                  <TableCell><ReferralStatusBadge status={r.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="left" dir="rtl" className="sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>פרטי הפניה</SheetTitle></SheetHeader>
          {selectedRow && (
            <div className="space-y-4 mt-4 px-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">סטטוס</span>
                <ReferralStatusBadge status={selectedRow.status} />
              </div>
              <div className="space-y-1"><div className="text-muted-foreground text-xs">לקוח</div>
                {selectedRow.client && <Link to="/clients/$id" params={{ id: selectedRow.client.id }} className="text-primary hover:underline">{selectedRow.client.first_name} {selectedRow.client.last_name} · {selectedRow.client.file_number}</Link>}
              </div>
              <div className="space-y-1"><div className="text-muted-foreground text-xs">שותף</div>
                {selectedRow.partner && <Link to="/partners/$id" params={{ id: selectedRow.partner.id }} className="text-primary hover:underline">{selectedRow.partner.company_name}</Link>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><div className="text-muted-foreground text-xs">נשלח</div><div>{formatDateHe(selectedRow.sent_at)}</div></div>
                <div><div className="text-muted-foreground text-xs">עודכן</div><div>{formatDateHe(selectedRow.updated_at)}</div></div>
                {selectedRow.completed_at && <div><div className="text-muted-foreground text-xs">הושלם</div><div>{formatDateHe(selectedRow.completed_at)}</div></div>}
              </div>
              {selectedRow.notes && <div><div className="text-muted-foreground text-xs">הערות פנימיות</div><div className="rounded-md border bg-muted/30 p-2 mt-1 whitespace-pre-wrap">{selectedRow.notes}</div></div>}
              {selectedRow.partner_notes && <div><div className="text-muted-foreground text-xs">הערות השותף</div><div className="rounded-md border bg-muted/30 p-2 mt-1 whitespace-pre-wrap">{selectedRow.partner_notes}</div></div>}
              {selectedRow.rejection_reason && <div><div className="text-muted-foreground text-xs">סיבת דחייה</div><div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-950/30 p-2 mt-1 whitespace-pre-wrap">{selectedRow.rejection_reason}</div></div>}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
