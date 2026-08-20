import { useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { MoreHorizontal, Search, UserPlus, FileText, Eye } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { listClientsForAdmin, type AdminClientRow } from "@/lib/admin.functions";
import { LeadSourceBadge, PaymentStatusBadge } from "./badges";
import { AssignPartnerDialog } from "./AssignPartnerDialog";
import { AdminNotesPopover } from "./AdminNotesPopover";

export const adminClientsQueryOptions = {
  queryKey: ["adminClients"] as const,
  queryFn: undefined as unknown as () => Promise<AdminClientRow[]>,
};

export function ClientsTable() {
  const listFn = useServerFn(listClientsForAdmin);

  const { data } = useSuspenseQuery({
    queryKey: ["adminClients"],
    queryFn: () => listFn(),
  });

  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [assignFor, setAssignFor] = useState<AdminClientRow | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((c) => {
      if (sourceFilter !== "all" && c.lead_source !== sourceFilter) return false;
      if (!q) return true;
      return (
        (c.full_name ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q)
      );
    });
  }, [data, search, sourceFilter]);

  const fmtDate = (s: string) => new Intl.DateTimeFormat("he-IL", { dateStyle: "short" }).format(new Date(s));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='חיפוש לפי שם, טלפון או דוא"ל...'
            className="pr-9 text-right"
            dir="rtl"
          />
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-48 text-right"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל המקורות</SelectItem>
            <SelectItem value="whatsapp">וואטסאפ</SelectItem>
            <SelectItem value="email">דוא"ל</SelectItem>
            <SelectItem value="yemot_hamashiach">ימות המשיח</SelectItem>
            <SelectItem value="nedarim_plus">נדרים פלוס</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">שם מלא</TableHead>
              <TableHead className="text-right">טלפון</TableHead>
              <TableHead className="text-right">דוא"ל</TableHead>
              <TableHead className="text-right">מקור הגעה</TableHead>
              <TableHead className="text-right">סטטוס מנוי</TableHead>
              <TableHead className="text-right">שותף מטפל</TableHead>
              <TableHead className="text-right">תאריך רישום</TableHead>
              <TableHead className="text-right w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                  {data.length === 0
                    ? "אין עדיין לקוחות רשומים. לקוח חדש יופיע כאן עם הרשמתו."
                    : "אין לקוחות התואמים לחיפוש או לסינון."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-right font-medium">{c.full_name ?? "—"}</TableCell>
                  <TableCell className="text-right" dir="ltr">{c.phone ?? "—"}</TableCell>
                  <TableCell className="text-right">{c.email ?? "—"}</TableCell>
                  <TableCell className="text-right"><LeadSourceBadge source={c.lead_source} /></TableCell>
                  <TableCell className="text-right"><PaymentStatusBadge status={c.payment_status} /></TableCell>
                  <TableCell className="text-right">
                    {c.assigned_partner_name ?? <span className="text-muted-foreground">לא משויך</span>}
                  </TableCell>
                  <TableCell className="text-right">{fmtDate(c.registered_at)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to="/admin/clients/$clientId" params={{ clientId: c.id }}>
                            <Eye className="w-4 h-4 ml-2" /> צפייה בפרופיל מלא
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setAssignFor(c)}>
                          <UserPlus className="w-4 h-4 ml-2" /> שיוך שותף עסקי
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AdminNotesPopover clientId={c.id} initialNotes={c.internal_admin_notes}>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <FileText className="w-4 h-4 ml-2" /> עריכת הערות מנהל
                          </DropdownMenuItem>
                        </AdminNotesPopover>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {assignFor && (
        <AssignPartnerDialog
          open={!!assignFor}
          onOpenChange={(o) => !o && setAssignFor(null)}
          clientId={assignFor.id}
          clientName={assignFor.full_name ?? ""}
        />
      )}
    </div>
  );
}
