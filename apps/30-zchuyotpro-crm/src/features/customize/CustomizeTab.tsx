import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { myTenantQuery, type TenantSettings } from "@/features/settings/queries";
import { OPTIONAL_MODULES, isModuleEnabled, type ModulesMap } from "@/features/customize/modules";
import {
  customFieldDefsQuery,
  CATEGORY_LABELS,
  FIELD_TYPE_LABELS,
  type CustomFieldDef,
} from "@/features/customize/queries";

// AI proposal action, as returned by /api/ai-extend
type AiAction = {
  kind: "add_field" | "enable_module" | "disable_module" | "note";
  reason?: string;
  category?: string;
  label?: string;
  field_type?: string;
  options?: string[];
  visible_to_client?: boolean;
  client_editable?: boolean;
  module_key?: string;
  note?: string;
};

function newFieldKey() {
  return `cf_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

export function CustomizeTab() {
  return (
    <div className="space-y-4">
      <AiAssistantCard />
      <ModulesCard />
      <FieldsCard />
    </div>
  );
}

function useInvalidateCustomize() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["custom-field-defs"] });
    qc.invalidateQueries({ queryKey: ["tenant-modules"] });
    qc.invalidateQueries({ queryKey: ["my-tenant"] });
  };
}

// ---------- module visibility ----------

function ModulesCard() {
  const { data: tenant, isLoading } = useQuery(myTenantQuery());
  const invalidate = useInvalidateCustomize();
  const settings = (tenant?.settings ?? {}) as TenantSettings & { modules?: ModulesMap };
  const modules = settings.modules ?? {};

  const toggle = useMutation({
    mutationFn: async ({ key, enabled }: { key: string; enabled: boolean }) => {
      if (!tenant?.id) throw new Error("no tenant");
      const newSettings = { ...settings, modules: { ...modules, [key]: enabled } };
      const { error } = await supabase.from("tenants").update({ settings: newSettings }).eq("id", tenant.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("המודולים עודכנו");
      invalidate();
    },
    onError: (e: Error) => toast.error("עדכון נכשל", { description: e.message }),
  });

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">מודולים במערכת</CardTitle>
        <p className="text-sm text-muted-foreground">
          מודול כבוי מוסתר מתיק הלקוח ומהאזור האישי של הלקוח. פונקציות הליבה (פרטים אישיים, משפחה,
          זכאויות, משימות, תקשורת ומסמכים) פעילות תמיד.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {OPTIONAL_MODULES.map((m) => (
          <div key={m.key} className="flex items-center justify-between border-b pb-2 gap-4">
            <div>
              <Label htmlFor={`mod-${m.key}`}>{m.label}</Label>
              <p className="text-xs text-muted-foreground">{m.description}</p>
            </div>
            <Switch
              id={`mod-${m.key}`}
              checked={isModuleEnabled(modules, m.key)}
              disabled={toggle.isPending}
              onCheckedChange={(v) => toggle.mutate({ key: m.key, enabled: v })}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ---------- custom fields ----------

const EMPTY_FIELD = {
  label: "",
  category: "personal",
  field_type: "text",
  options: "",
  visible_to_client: false,
  client_editable: false,
};

function FieldsCard() {
  const { data: tenant } = useQuery(myTenantQuery());
  const { data: defs, isLoading } = useQuery(customFieldDefsQuery());
  const invalidate = useInvalidateCustomize();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FIELD);

  const add = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("no tenant");
      if (!form.label.trim()) throw new Error("יש להזין שם שדה");
      const needsOptions = form.field_type === "select" || form.field_type === "multiselect";
      const options = form.options.split(",").map((s) => s.trim()).filter(Boolean);
      if (needsOptions && options.length === 0) throw new Error("לשדה בחירה יש להזין אפשרויות (מופרדות בפסיק)");
      const { error } = await supabase.from("custom_field_definitions").insert({
        tenant_id: tenant.id,
        field_key: newFieldKey(),
        label: form.label.trim(),
        category: form.category,
        field_type: form.field_type,
        options: needsOptions ? options : [],
        visible_to_client: form.visible_to_client,
        client_editable: form.visible_to_client && form.client_editable,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("השדה נוסף");
      setForm(EMPTY_FIELD);
      setOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error("הוספה נכשלה", { description: e.message }),
  });

  const updateDef = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<CustomFieldDef> }) => {
      const { error } = await supabase.from("custom_field_definitions").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error("עדכון נכשל", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("custom_field_definitions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("השדה נמחק");
      invalidate();
    },
    onError: (e: Error) => toast.error("מחיקה נכשלה", { description: e.message }),
  });

  const needsOptions = form.field_type === "select" || form.field_type === "multiselect";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">שדות מותאמים אישית</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            שדות שנוספים לתיק הלקוח לפי קטגוריה; ניתן לחשוף אותם ללקוח באזור האישי ואף לאפשר לו למלא.
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(!open)}>
          {open ? "ביטול" : <><Plus className="h-4 w-4 ms-1" /> הוסף שדה</>}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {open && (
          <div className="grid gap-3 sm:grid-cols-2 p-3 bg-muted/40 rounded">
            <div>
              <Label>שם השדה</Label>
              <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="למשל: קופת גמל" />
            </div>
            <div>
              <Label>קטגוריה</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>סוג</Label>
              <Select value={form.field_type} onValueChange={(v) => setForm({ ...form, field_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FIELD_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {needsOptions && (
              <div>
                <Label>אפשרויות (מופרדות בפסיק)</Label>
                <Input value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} placeholder="מכבי, כללית, מאוחדת" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch id="new-visible" checked={form.visible_to_client} onCheckedChange={(v) => setForm({ ...form, visible_to_client: v, client_editable: v && form.client_editable })} />
              <Label htmlFor="new-visible" className="text-sm">מוצג ללקוח</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="new-editable" checked={form.client_editable} disabled={!form.visible_to_client} onCheckedChange={(v) => setForm({ ...form, client_editable: v })} />
              <Label htmlFor="new-editable" className="text-sm">הלקוח יכול למלא</Label>
            </div>
            <div className="sm:col-span-2">
              <Button onClick={() => add.mutate()} disabled={add.isPending}>
                {add.isPending && <Loader2 className="h-4 w-4 animate-spin me-1" />} צור שדה
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>שדה</TableHead>
                <TableHead>קטגוריה</TableHead>
                <TableHead>סוג</TableHead>
                <TableHead>מוצג ללקוח</TableHead>
                <TableHead>הלקוח ממלא</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(defs ?? []).map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.label}</TableCell>
                  <TableCell>{CATEGORY_LABELS[d.category] ?? d.category}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{FIELD_TYPE_LABELS[d.field_type] ?? d.field_type}</TableCell>
                  <TableCell>
                    <Switch
                      checked={d.visible_to_client}
                      onCheckedChange={(v) =>
                        updateDef.mutate({ id: d.id, patch: { visible_to_client: v, client_editable: v && d.client_editable } })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={d.client_editable}
                      disabled={!d.visible_to_client}
                      onCheckedChange={(v) => updateDef.mutate({ id: d.id, patch: { client_editable: v } })}
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => remove.mutate(d.id)} title="מחק שדה (כולל הערכים שמולאו בו)">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(defs ?? []).length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">אין שדות מותאמים עדיין</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- AI assistant ----------

function AiAssistantCard() {
  const { data: tenant } = useQuery(myTenantQuery());
  const invalidate = useInvalidateCustomize();
  const [ask, setAsk] = useState("");
  const [proposal, setProposal] = useState<{ summary: string; actions: AiAction[] } | null>(null);
  const [approved, setApproved] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  async function propose() {
    if (!ask.trim()) return;
    setLoading(true);
    setProposal(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error("נדרשת התחברות מחדש");
      const res = await fetch(`${import.meta.env.BASE_URL}api/ai-extend`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ request: ask.trim() }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? `שגיאה ${res.status}`);
      const actions: AiAction[] = Array.isArray(body.actions) ? body.actions : [];
      setProposal({ summary: body.summary ?? "", actions });
      // pre-approve everything appliable except hide-module actions (those remove UI)
      setApproved(new Set(
        actions.map((a, i) => (a.kind === "add_field" || a.kind === "enable_module" ? i : -1)).filter((i) => i >= 0),
      ));
      if (actions.length === 0) toast.info("לא נמצאו שינויים מוצעים לבקשה הזו");
    } catch (e) {
      toast.error("הפקת ההצעה נכשלה", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setLoading(false);
    }
  }

  async function apply() {
    if (!proposal || !tenant?.id) return;
    setApplying(true);
    let done = 0;
    try {
      const settings = (tenant.settings ?? {}) as TenantSettings & { modules?: ModulesMap };
      let modules = { ...(settings.modules ?? {}) };
      let modulesChanged = false;

      for (const [i, a] of proposal.actions.entries()) {
        if (!approved.has(i)) continue;
        if (a.kind === "add_field" && a.label) {
          const { error } = await supabase.from("custom_field_definitions").insert({
            tenant_id: tenant.id,
            field_key: newFieldKey(),
            label: a.label,
            category: a.category && a.category in CATEGORY_LABELS ? a.category : "other",
            field_type: a.field_type && a.field_type in FIELD_TYPE_LABELS ? a.field_type : "text",
            options: Array.isArray(a.options) ? a.options : [],
            visible_to_client: !!a.visible_to_client,
            client_editable: !!a.visible_to_client && !!a.client_editable,
          });
          if (error) throw error;
          done++;
        } else if ((a.kind === "enable_module" || a.kind === "disable_module") && a.module_key) {
          modules = { ...modules, [a.module_key]: a.kind === "enable_module" };
          modulesChanged = true;
          done++;
        }
      }

      if (modulesChanged) {
        const { error } = await supabase
          .from("tenants")
          .update({ settings: { ...settings, modules } })
          .eq("id", tenant.id);
        if (error) throw error;
      }

      toast.success(`הוחלו ${done} פעולות`);
      setProposal(null);
      setAsk("");
      invalidate();
    } catch (e) {
      toast.error("החלת ההצעה נכשלה", { description: e instanceof Error ? e.message : undefined });
      invalidate();
    } finally {
      setApplying(false);
    }
  }

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> הרחבת המערכת עם AI
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          תארו במילים שלכם מה חסר לכם — למשל: ״אני מטפל גם בביטוחי רכב, צריך לתעד חברת ביטוח, סוג פוליסה
          ותאריך חידוש, והלקוח ימלא בעצמו״ — ותקבלו הצעת שינויים לאישור. שום דבר לא משתנה בלי אישורכם.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea rows={3} value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="מה להוסיף למערכת שלך?" />
        <Button onClick={propose} disabled={loading || !ask.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <Wand2 className="h-4 w-4 me-1" />}
          הצע שינויים
        </Button>

        {proposal && (
          <div className="border rounded-md p-3 space-y-3 bg-muted/30">
            {proposal.summary && <p className="text-sm">{proposal.summary}</p>}
            {proposal.actions.map((a, i) => (
              <label key={i} className="flex items-start gap-2 text-sm border-b pb-2 last:border-b-0">
                {a.kind !== "note" && (
                  <Checkbox
                    checked={approved.has(i)}
                    onCheckedChange={(v) =>
                      setApproved((p) => {
                        const n = new Set(p);
                        if (v) n.add(i); else n.delete(i);
                        return n;
                      })
                    }
                  />
                )}
                <span>
                  <ActionBadge action={a} />
                  <span className="ms-2">{describeAction(a)}</span>
                  {a.reason && <span className="block text-xs text-muted-foreground mt-0.5">{a.reason}</span>}
                </span>
              </label>
            ))}
            {proposal.actions.some((a) => a.kind !== "note") && (
              <Button onClick={apply} disabled={applying || approved.size === 0}>
                {applying && <Loader2 className="h-4 w-4 animate-spin me-1" />}
                החל {approved.size} פעולות מאושרות
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActionBadge({ action }: { action: AiAction }) {
  if (action.kind === "add_field") return <Badge>שדה חדש</Badge>;
  if (action.kind === "enable_module") return <Badge className="bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200">הצגת מודול</Badge>;
  if (action.kind === "disable_module") return <Badge variant="destructive">הסתרת מודול</Badge>;
  return <Badge variant="secondary">הערה</Badge>;
}

function describeAction(a: AiAction): string {
  if (a.kind === "add_field") {
    const parts = [
      `${a.label} (${CATEGORY_LABELS[a.category ?? ""] ?? a.category} · ${FIELD_TYPE_LABELS[a.field_type ?? ""] ?? a.field_type})`,
      a.visible_to_client ? (a.client_editable ? "מוצג ללקוח וניתן למילוי" : "מוצג ללקוח") : "פנימי לצוות",
    ];
    if (a.options?.length) parts.push(`אפשרויות: ${a.options.join(" / ")}`);
    return parts.join(" · ");
  }
  if (a.kind === "enable_module" || a.kind === "disable_module") {
    const label = OPTIONAL_MODULES.find((m) => m.key === a.module_key)?.label ?? a.module_key ?? "";
    return label;
  }
  return a.note ?? "";
}
