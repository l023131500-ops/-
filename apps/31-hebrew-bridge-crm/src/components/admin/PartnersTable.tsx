import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { listPartnersForAdmin } from "@/lib/admin.functions";

export function PartnersTable() {
  const listFn = useServerFn(listPartnersForAdmin);
  const { data } = useSuspenseQuery({ queryKey: ["adminPartners"], queryFn: () => listFn() });

  const fmt = (s: string) => new Intl.DateTimeFormat("he-IL", { dateStyle: "short" }).format(new Date(s));

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">שם מלא</TableHead>
            <TableHead className="text-right">דוא"ל</TableHead>
            <TableHead className="text-right">שם חברה</TableHead>
            <TableHead className="text-right">תחום התמחות</TableHead>
            <TableHead className="text-right">לקוחות פעילים</TableHead>
            <TableHead className="text-right">תאריך הצטרפות</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                לא קיימים שותפים עסקיים במערכת.
              </TableCell>
            </TableRow>
          ) : (
            data.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="text-right font-medium">{p.full_name ?? "—"}</TableCell>
                <TableCell className="text-right">{p.email ?? "—"}</TableCell>
                <TableCell className="text-right">{p.company_name ?? "—"}</TableCell>
                <TableCell className="text-right">{p.specialization_category ?? <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className="text-right">
                  <Badge className={p.active_clients_count > 0 ? "bg-primary text-primary-foreground" : ""} variant={p.active_clients_count > 0 ? "default" : "secondary"}>
                    {p.active_clients_count}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{fmt(p.joined_at)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
