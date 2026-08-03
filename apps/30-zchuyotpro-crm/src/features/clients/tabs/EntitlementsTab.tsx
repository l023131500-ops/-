import { useMemo, useState } from "react";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Printer, ChevronDown, ChevronLeft, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { triggerN8nWebhook } from "@/lib/n8n";
import {
  entitlementsCatalogQuery,
  clientEntitlementsQuery,
  clientQuery,
  meProfileQuery,
  tenantAgentsQuery,
  useInvalidateClient,
} from "@/features/clients/queries";
import { ENTITLEMENT_STATUS, ENTITLEMENT_CATEGORY } from "@/features/clients/constants";
import { EntitlementStatusBadge, EntitlementCategoryBadge } from "@/features/clients/components/badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "to_check" | "recommended" | "handled" | "not_relevant";

export function EntitlementsTab({ clientId }: { clientId: string }) {
  const { data: client } = useSuspenseQuery(clientQuery(clientId));
  const { data: me } = useSuspenseQuery(meProfileQuery());
  const { data: agents } = useSuspenseQuery(tenantAgentsQuery());
  const { data: catalogAll } = useSuspenseQuery(entitlementsCatalogQuery({ category: "all" }));
  const { data: assigned } = useSuspenseQuery(clientEntitlementsQuery(clientId));
  const invalidate = useInvalidateClient();

  const currentYear = new Date().getFullYear();
  const yearsAvail = useMemo(() => {
    const s = new Set<number>();
    catalogAll.forEach((e) => e.year && s.add(e.year));
    if (s.size === 0) s.add(currentYear);
    return Array.from(s).sort((a, b) => b - a);
  }, [catalogAll, currentYear]);
  const [year, setYear] = useState<string>(String(yearsAvail[0] ?? currentYear));
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const assignedMap = useMemo(() => new Map(assigned.map((a) => [a.entitlement_id, a])), [assigned]);

  const catalog = useMemo(() => catalogAll.filter((e) => year === "all" || String(e.year) === year), [catalogAll, year]);

  const filtered = useMemo(() => catalog.filter((e) => {
    const a = assignedMap.get(e.id);
    const s = a?.status ?? "to_check";
    return statusFilter === "all" ? true : s === statusFilter;
  }), [catalog, assignedMap, statusFilter]);

  const counts = useMemo(() => {
    const c = { all: catalog.length, to_check: 0, recommended: 0, handled: 0, not_relevant: 0 };
    catalog.forEach((e) => {
      const s = assignedMap.get(e.id)?.status ?? "to_check";
      if (s in c) (c as Record<string, number>)[s]++;
    });
    return c;
  }, [catalog, assignedMap]);

  const checkedPct = catalog.length === 0 ? 0 : Math.round(((counts.handled + counts.recommended + counts.not_relevant) / catalog.length) * 100);

  const upsert = useMutation({
    mutationFn: async (d: { entitlement_id: string; status: string; notes?: string | null; handled_by?: string | null }) => {
      const existing = assignedMap.get(d.entitlement_id);
      const payload = {
        client_id: clientId,
        tenant_id: client.tenant_id,
        entitlement_id: d.entitlement_id,
        status: d.status,
        notes: d.notes !== undefined ? d.notes : existing?.notes ?? null,
        handled_by: d.handled_by !== undefined ? d.handled_by : existing?.handled_by ?? (d.status === "handled" ? me?.id ?? null : null),
        handled_at: d.status === "handled" ? new Date().toISOString() : null,
      };
      const { error } = await supabase.from("client_entitlements").upsert(payload, { onConflict: "client_id,entitlement_id" });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(clientId); },
    onError: (e: Error) => toast.error("שגיאה", { description: e.message }),
  });

  function handlePrint() {
    window.print();
  }

  const QUICK: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "הכל" },
    { key: "to_check", label: "לבדיקה" },
    { key: "recommended", label: "מומלץ" },
    { key: "handled", label: "טופל" },
    { key: "not_relevant", label: "לא רלוונטי" },
  ];

  const analyzing = useMutation({
    mutationFn: async () => {
      const res = await triggerN8nWebhook("analyze-entitlements", {
        clientId,
        tenantId: client.tenant_id,
      });
      if (res === null) throw new Error("nope");
    },
    onSuccess: () => { toast.success("ניתוח זכאויות נשלח"); invalidate(clientId); },
    // n8n helper already toasts on failure
    onError: () => {},
  });

  return (
    <div className="space-y-4 print:space-y-2">
      <div className="print:hidden flex items-center justify-between flex-wrap gap-3">
        <Tabs value={year} onValueChange={setYear}>
          <TabsList>
            {yearsAvail.map((y) => <TabsTrigger key={y} value={String(y)}>{y}</TabsTrigger>)}
            <TabsTrigger value="all">הכל</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => analyzing.mutate()} disabled={analyzing.isPending}>
            {analyzing.isPending ? <Loader2 className="h-4 w-4 animate-spin ms-2" /> : <Sparkles className="h-4 w-4 ms-2" />}
            נתח זכאויות
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="h-4 w-4 ms-2" />הדפס/PDF</Button>
        </div>
      </div>

      <Card className="print:shadow-none print:border-0">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>התקדמות בדיקה</span>
            <span className="text-muted-foreground">{checkedPct}% ({counts.handled + counts.recommended + counts.not_relevant} / {counts.all})</span>
          </div>
          <Progress value={checkedPct} />
        </CardContent>
      </Card>

      <div className="print:hidden flex gap-2 flex-wrap">
        {QUICK.map((q) => (
          <Button key={q.key} size="sm" variant={statusFilter === q.key ? "default" : "outline"} onClick={() => setStatusFilter(q.key)}>
            {q.label} <span className="ms-1 opacity-70">({q.key === "all" ? counts.all : (counts as Record<string, number>)[q.key]})</span>
          </Button>
        ))}
      </div>

      <Card className="print:shadow-none print:border-0">
        <CardHeader className="print:hidden">
          <CardTitle>זכאויות {year !== "all" && `– ${year}`}</CardTitle>
        </CardHeader>
        <div className="hidden print:block px-4 pt-4 pb-2 border-b">
          <h2 className="text-lg font-bold">דוח זכאויות – {client.first_name} {client.last_name}</h2>
          <div className="text-sm text-muted-foreground">תיק: {client.file_number ?? "—"} · נוצר {new Date().toLocaleDateString("he-IL")}</div>
        </div>
        <CardContent className="p-0">
          <ul className="divide-y">
            {filtered.length === 0 && <li className="text-center text-muted-foreground py-8 text-sm">אין זכאויות להצגה</li>}
            {filtered.map((e) => {
              const a = assignedMap.get(e.id);
              const status = a?.status ?? "to_check";
              const handler = agents.find((g) => g.id === a?.handled_by);
              const isOpen = expanded === e.id;
              return (
                <li key={e.id} className={cn("p-3 print:p-2", isOpen && "bg-accent/30")}>
                  <div className="flex items-start gap-3 cursor-pointer print:cursor-default" onClick={() => setExpanded(isOpen ? null : e.id)}>
                    <Button size="icon" variant="ghost" className="h-6 w-6 print:hidden" aria-label="הרחב">
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    </Button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{e.title}</span>
                        <EntitlementCategoryBadge category={e.category} />
                        {e.year && <span className="text-xs text-muted-foreground">{e.year}</span>}
                        <EntitlementStatusBadge status={status} />
                      </div>
                      {a?.notes && <div className="text-sm text-muted-foreground mt-1 line-clamp-2 print:line-clamp-none">{a.notes}</div>}
                      {handler && <div className="text-xs text-muted-foreground mt-1">טופל ע"י {handler.full_name}{a?.handled_at && ` · ${new Date(a.handled_at).toLocaleDateString("he-IL")}`}</div>}
                    </div>
                    <div className="print:hidden" onClick={(ev) => ev.stopPropagation()}>
                      <Select value={status} onValueChange={(v) => upsert.mutate({ entitlement_id: e.id, status: v })}>
                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(ENTITLEMENT_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="mt-3 ps-9 pe-2 space-y-3 print:ps-0">
                      {e.description && <div className="text-sm whitespace-pre-wrap">{e.description}</div>}
                      {e.eligible_criteria && Object.keys(e.eligible_criteria as object).length > 0 && (
                        <div className="text-xs bg-muted/50 rounded p-2"><pre className="whitespace-pre-wrap font-mono">{JSON.stringify(e.eligible_criteria, null, 2)}</pre></div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 print:hidden">
                        <div>
                          <label className="text-xs text-muted-foreground">הערות</label>
                          <Textarea rows={2} defaultValue={a?.notes ?? ""} onBlur={(ev) => { if (ev.target.value !== (a?.notes ?? "")) upsert.mutate({ entitlement_id: e.id, status, notes: ev.target.value }); }} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">טופל ע"י</label>
                          <Select value={a?.handled_by ?? "none"} onValueChange={(v) => upsert.mutate({ entitlement_id: e.id, status, handled_by: v === "none" ? null : v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">—</SelectItem>
                              {agents.map((g) => <SelectItem key={g.id} value={g.id}>{g.full_name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {upsert.isPending && <div className="p-2 text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" />שומר…</div>}
        </CardContent>
      </Card>
    </div>
  );
}
