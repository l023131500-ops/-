import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Plus, Search, Users, UserCheck, Clock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { clientsListQuery, clientStatsQuery } from "@/features/clients/queries";
import { StatusBadge } from "@/features/clients/components/badges";
import { CLIENT_STATUS } from "@/features/clients/constants";
import { formatDateHe } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/clients/")({
  head: () => ({ meta: [{ title: "לקוחות | זכויות פרו" }] }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(clientStatsQuery());
    context.queryClient.ensureQueryData(clientsListQuery({}));
  },
  component: ClientsList,
  errorComponent: ({ error }) => <div className="p-4 text-destructive">שגיאה: {error.message}</div>,
});

function ClientsList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const stats = useSuspenseQuery(clientStatsQuery()).data;
  const { data: clients } = useSuspenseQuery(clientsListQuery({ search, status }));

  const statCards = [
    { label: "סה״כ לקוחות", value: stats.total, icon: Users },
    { label: "פעילים", value: stats.active, icon: UserCheck },
    { label: "ממתינים", value: stats.pending, icon: Clock },
    { label: "חדשים החודש", value: stats.monthly, icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">לקוחות</h2>
          <p className="text-muted-foreground text-sm mt-1">ניהול לקוחות וזכאויות</p>
        </div>
        <Button asChild>
          <Link to="/clients/new"><Plus className="h-4 w-4 ms-2" /> לקוח חדש</Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
                <div className="text-2xl font-bold mt-1">{s.value}</div>
              </div>
              <s.icon className="h-8 w-8 text-muted-foreground/50" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2 flex-wrap mb-4">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="ps-3 pe-9"
                placeholder="חיפוש לפי שם, מספר תיק, טלפון או ת.ז."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                {Object.entries(CLIENT_STATUS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>מספר תיק</TableHead>
                <TableHead>שם</TableHead>
                <TableHead>טלפון</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>נוצר</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">אין לקוחות להצגה</TableCell></TableRow>
              )}
              {clients.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate({ to: "/clients/$id", params: { id: c.id } })}
                >
                  <TableCell className="font-mono text-xs">{c.file_number ?? "—"}</TableCell>
                  <TableCell className="font-medium">{c.first_name} {c.last_name}</TableCell>
                  <TableCell dir="ltr" className="text-start">{c.phone ?? "—"}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDateHe(c.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
