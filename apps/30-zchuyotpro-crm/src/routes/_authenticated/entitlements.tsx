import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Loader2, Upload, Pencil, Trash2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ENTITLEMENT_CATEGORY } from "@/features/clients/constants";
import { EntitlementCategoryBadge } from "@/features/clients/components/badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/entitlements")({
  head: () => ({ meta: [{ title: "זכאויות | זכויות פרו" }] }),
  component: Page,
});

type Row = {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  category: string | null;
  year: number | null;
  source: string | null;
  is_active: boolean;
  eligible_criteria: unknown;
};

type ImportRow = {
  title: string;
  description?: string;
  category?: string;
  year?: number;
  source?: string;
  eligible_criteria?: unknown;
};

function Page() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [editing, setEditing] = useState<Partial<Row> | null>(null);
  const [importPreview, setImportPreview] = useState<ImportRow[] | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["entitlements-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("entitlements").select("*").order("year", { ascending: false }).order("title");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const years = useMemo(() => Array.from(new Set(rows.map((r) => r.year).filter(Boolean))).sort((a, b) => Number(b) - Number(a)) as number[], [rows]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
    if (yearFilter !== "all" && String(r.year) !== yearFilter) return false;
    if (activeFilter !== "all" && r.is_active !== (activeFilter === "active")) return false;
    return true;
  }), [rows, search, categoryFilter, yearFilter, activeFilter]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["entitlements-admin"] });

  const save = useMutation({
    mutationFn: async (r: Partial<Row>) => {
      const { data: profile } = await supabase.from("profiles").select("tenant_id").maybeSingle();
      if (!profile?.tenant_id) throw new Error("אין שיוך לארגון");
      const payload = {
        title: r.title ?? "",
        description: r.description ?? null,
        category: r.category ?? null,
        year: r.year ?? null,
        source: r.source ?? null,
        is_active: r.is_active ?? true,
        eligible_criteria: (r.eligible_criteria ?? {}) as never,
        tenant_id: profile.tenant_id,
      };
      if (r.id) {
        const { error } = await supabase.from("entitlements").update(payload).eq("id", r.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("entitlements").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("נשמר"); setEditing(null); invalidate(); },
    onError: (e: Error) => toast.error("שגיאה", { description: e.message }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("entitlements").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("entitlements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("נמחק"); invalidate(); },
    onError: (e: Error) => toast.error("שגיאה", { description: e.message }),
  });

  async function handleFile(file: File) {
    setImportErrors([]);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
      const errors: string[] = [];
      const parsed: ImportRow[] = [];
      json.forEach((row, i) => {
        const title = String(row.title ?? row.Title ?? "").trim();
        if (!title) { errors.push(`שורה ${i + 2}: חסר שם זכאות`); return; }
        let criteria: unknown = {};
        const rawCrit = row.eligible_criteria ?? row.criteria;
        if (rawCrit) {
          if (typeof rawCrit === "string") {
            try { criteria = JSON.parse(rawCrit); } catch { criteria = { text: rawCrit }; }
          } else criteria = rawCrit;
        }
        parsed.push({
          title,
          description: row.description ? String(row.description) : undefined,
          category: row.category ? String(row.category).trim() : undefined,
          year: row.year ? Number(row.year) : undefined,
          source: row.source ? String(row.source) : undefined,
          eligible_criteria: criteria,
        });
      });
      setImportErrors(errors);
      setImportPreview(parsed);
    } catch (e) {
      toast.error("שגיאה בקריאת קובץ", { description: (e as Error).message });
    }
  }

  const doImport = useMutation({
    mutationFn: async (data: ImportRow[]) => {
      const { data: profile } = await supabase.from("profiles").select("tenant_id").maybeSingle();
      if (!profile?.tenant_id) throw new Error("אין שיוך לארגון");
      const payload = data.map((r) => ({
        title: r.title,
        description: r.description ?? null,
        category: r.category ?? null,
        year: r.year ?? null,
        source: r.source ?? null,
        eligible_criteria: (r.eligible_criteria ?? {}) as never,
        tenant_id: profile.tenant_id,
        is_active: true,
      }));
      const { error, data: inserted } = await supabase.from("entitlements").insert(payload).select("id");
      if (error) throw error;
      return inserted?.length ?? 0;
    },
    onSuccess: (count) => {
      toast.success(`יובאו ${count} זכאויות`);
      setImportPreview(null);
      invalidate();
    },
    onError: (e: Error) => toast.error("שגיאת ייבוא", { description: e.message }),
  });

  async function bulkAssign() {
    const activeEnts = rows.filter((r) => r.is_active);
    if (activeEnts.length === 0) { toast.error("אין זכאויות פעילות"); return; }
    const { data: clients, error } = await supabase.from("clients").select("id, tenant_id").eq("status", "active");
    if (error) { toast.error(error.message); return; }
    if (!clients || clients.length === 0) { toast.error("אין לקוחות פעילים"); return; }
    const records = clients.flatMap((c) => activeEnts.map((e) => ({
      client_id: c.id, tenant_id: c.tenant_id, entitlement_id: e.id, status: "to_check",
    })));
    setBulkProgress({ done: 0, total: records.length });
    const chunk = 200;
    for (let i = 0; i < records.length; i += chunk) {
      const slice = records.slice(i, i + chunk);
      const { error: insErr } = await supabase.from("client_entitlements").upsert(slice, { onConflict: "client_id,entitlement_id", ignoreDuplicates: true });
      if (insErr) { toast.error(insErr.message); setBulkProgress(null); return; }
      setBulkProgress({ done: Math.min(i + chunk, records.length), total: records.length });
    }
    setBulkProgress(null);
    toast.success(`הוקצו ${activeEnts.length} זכאויות ל-${clients.length} לקוחות`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">זכאויות</h2>
          <p className="text-muted-foreground text-sm mt-1">קטלוג זכאויות וניהול הקצאה ללקוחות</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
          <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4 ms-2" />ייבוא מאקסל</Button>
          <Button variant="outline" onClick={bulkAssign} disabled={!!bulkProgress}><Users className="h-4 w-4 ms-2" />הקצה ללקוחות רלוונטיים</Button>
          <Button onClick={() => setEditing({ is_active: true })}>זכאות חדשה</Button>
        </div>
      </div>

      {bulkProgress && (
        <Card><CardContent className="p-4 space-y-2">
          <div className="text-sm">מקצה זכאויות... {bulkProgress.done} / {bulkProgress.total}</div>
          <Progress value={(bulkProgress.done / bulkProgress.total) * 100} />
        </CardContent></Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <CardTitle>קטלוג</CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Input placeholder="חיפוש..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-48" />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הקטגוריות</SelectItem>
                {Object.entries(ENTITLEMENT_CATEGORY).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל השנים</SelectItem>
                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={activeFilter} onValueChange={setActiveFilter}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">הכל</SelectItem>
                <SelectItem value="active">פעיל</SelectItem>
                <SelectItem value="inactive">לא פעיל</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>זכאות</TableHead>
              <TableHead>קטגוריה</TableHead>
              <TableHead>שנה</TableHead>
              <TableHead>מקור</TableHead>
              <TableHead>פעיל</TableHead>
              <TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-6"><Loader2 className="h-4 w-4 animate-spin inline" /></TableCell></TableRow>}
              {!isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">אין נתונים</TableCell></TableRow>}
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {r.title}
                    {r.description && (
                      <div className="text-xs text-muted-foreground font-normal mt-0.5 line-clamp-1">{r.description}</div>
                    )}
                  </TableCell>
                  <TableCell><EntitlementCategoryBadge category={r.category} /></TableCell>
                  <TableCell>{r.year ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.source ?? "—"}</TableCell>
                  <TableCell><Switch checked={r.is_active} onCheckedChange={(v) => toggleActive.mutate({ id: r.id, is_active: v })} aria-label={`הפעלה/כיבוי של הזכאות ${r.title}`} /></TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(r)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm(`למחוק את "${r.title}"?`)) del.mutate(r.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "עריכת זכאות" : "זכאות חדשה"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>כותרת *</Label><Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>תיאור</Label><Textarea rows={3} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>קטגוריה</Label>
                  <Select value={editing.category ?? ""} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                    <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
                    <SelectContent>{Object.entries(ENTITLEMENT_CATEGORY).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>שנה</Label><Input type="number" value={editing.year ?? ""} onChange={(e) => setEditing({ ...editing, year: e.target.value ? Number(e.target.value) : null })} /></div>
              </div>
              <div className="space-y-1.5"><Label>מקור</Label><Input value={editing.source ?? ""} onChange={(e) => setEditing({ ...editing, source: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>קריטריוני זכאות (טקסט חופשי או JSON)</Label>
                <Textarea rows={3} value={typeof editing.eligible_criteria === "string" ? editing.eligible_criteria : JSON.stringify(editing.eligible_criteria ?? {}, null, 2)}
                  onChange={(e) => { const v = e.target.value; try { setEditing({ ...editing, eligible_criteria: JSON.parse(v) }); } catch { setEditing({ ...editing, eligible_criteria: { text: v } }); } }} />
              </div>
              <div className="flex items-center gap-2"><Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /><Label>פעיל</Label></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>ביטול</Button>
            <Button onClick={() => editing && save.mutate(editing)} disabled={save.isPending || !editing?.title}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin ms-2" />}שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import preview dialog */}
      <Dialog open={!!importPreview} onOpenChange={(o) => !o && setImportPreview(null)}>
        <DialogContent dir="rtl" className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>תצוגה מקדימה לייבוא ({importPreview?.length ?? 0} שורות)</DialogTitle></DialogHeader>
          {importErrors.length > 0 && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm space-y-1">
              {importErrors.slice(0, 10).map((e, i) => <div key={i}>{e}</div>)}
              {importErrors.length > 10 && <div>+ עוד {importErrors.length - 10} שגיאות</div>}
            </div>
          )}
          {importPreview && importPreview.length > 0 && (
            <Table>
              <TableHeader><TableRow>
                <TableHead>כותרת</TableHead><TableHead>קטגוריה</TableHead><TableHead>שנה</TableHead><TableHead>מקור</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {importPreview.slice(0, 50).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.title}</TableCell>
                    <TableCell>{r.category ?? "—"}</TableCell>
                    <TableCell>{r.year ?? "—"}</TableCell>
                    <TableCell>{r.source ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportPreview(null)}>ביטול</Button>
            <Button onClick={() => importPreview && doImport.mutate(importPreview)} disabled={doImport.isPending || !importPreview?.length}>
              {doImport.isPending && <Loader2 className="h-4 w-4 animate-spin ms-2" />}ייבא הכל
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
