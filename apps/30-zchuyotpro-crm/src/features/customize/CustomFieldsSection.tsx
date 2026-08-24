import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Save, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  customFieldDefsQuery,
  customFieldValuesQuery,
  CATEGORY_LABELS,
  type CustomFieldDef,
} from "@/features/customize/queries";

type Props = {
  clientId: string;
  // single category (staff client-file tab) — omit to render every category
  // the viewer can see, grouped (portal profile page)
  category?: string;
  // portal mode: only client_editable fields get inputs; the rest are read-only
  portal?: boolean;
};

// Renders the tenant's custom fields for one client. Returns null when the
// tenant defined no fields for the requested scope, so host tabs stay clean.
export function CustomFieldsSection({ clientId, category, portal }: Props) {
  const qc = useQueryClient();
  const { data: defs } = useQuery(customFieldDefsQuery());
  const { data: values } = useQuery(customFieldValuesQuery(clientId));

  const scoped = useMemo(
    () => (defs ?? []).filter((d) => (category ? d.category === category : true)),
    [defs, category],
  );

  const [draft, setDraft] = useState<Record<string, unknown>>({});
  useEffect(() => {
    const next: Record<string, unknown> = {};
    for (const v of values ?? []) next[v.definition_id] = v.value;
    setDraft(next);
  }, [values]);

  const save = useMutation({
    mutationFn: async () => {
      const editable = scoped.filter((d) => !portal || d.client_editable);
      const rows = editable
        .filter((d) => draft[d.id] !== undefined)
        .map((d) => ({
          tenant_id: d.tenant_id,
          client_id: clientId,
          definition_id: d.id,
          value: (draft[d.id] ?? null) as never,
        }));
      if (rows.length === 0) return;
      const { error } = await supabase
        .from("custom_field_values")
        .upsert(rows, { onConflict: "client_id,definition_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("השדות נשמרו");
      qc.invalidateQueries({ queryKey: ["custom-field-values", clientId] });
    },
    onError: (e: Error) => toast.error("שמירה נכשלה", { description: e.message }),
  });

  if (scoped.length === 0) return null;

  const hasEditable = scoped.some((d) => !portal || d.client_editable);
  const byCategory = category
    ? [[category, scoped] as const]
    : Object.entries(
        scoped.reduce<Record<string, CustomFieldDef[]>>((acc, d) => {
          (acc[d.category] ??= []).push(d);
          return acc;
        }, {}),
      );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" /> {portal ? "פרטים נוספים" : "שדות מותאמים אישית"}
        </CardTitle>
        {hasEditable && (
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin ms-1" /> : <Save className="h-4 w-4 ms-1" />}
            שמור
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {byCategory.map(([cat, catDefs]) => (
          <div key={cat} className="space-y-3">
            {!category && <div className="text-sm font-medium text-muted-foreground">{CATEGORY_LABELS[cat] ?? cat}</div>}
            <div className="grid gap-4 md:grid-cols-2">
              {catDefs.map((d) => (
                <FieldInput
                  key={d.id}
                  def={d}
                  value={draft[d.id]}
                  readOnly={!!portal && !d.client_editable}
                  onChange={(v) => setDraft((p) => ({ ...p, [d.id]: v }))}
                />
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function FieldInput({
  def,
  value,
  readOnly,
  onChange,
}: {
  def: CustomFieldDef;
  value: unknown;
  readOnly: boolean;
  onChange: (v: unknown) => void;
}) {
  const options = Array.isArray(def.options) ? (def.options as unknown[]).map(String) : [];

  if (def.field_type === "boolean") {
    return (
      <div className="flex items-center justify-between border rounded-md px-3 py-2">
        <Label className="text-sm">{def.label}</Label>
        <Switch checked={value === true} disabled={readOnly} onCheckedChange={(v) => onChange(v)} />
      </div>
    );
  }

  if (def.field_type === "select") {
    return (
      <div className="space-y-1.5">
        <Label className="text-sm">{def.label}</Label>
        <Select value={typeof value === "string" ? value : ""} disabled={readOnly} onValueChange={(v) => onChange(v)}>
          <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
          <SelectContent>
            {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (def.field_type === "multiselect") {
    const selected = Array.isArray(value) ? (value as unknown[]).map(String) : [];
    return (
      <div className="space-y-1.5">
        <Label className="text-sm">{def.label}</Label>
        <div className="flex flex-wrap gap-3 border rounded-md px-3 py-2">
          {options.map((o) => (
            <label key={o} className="flex items-center gap-1.5 text-sm">
              <Checkbox
                checked={selected.includes(o)}
                disabled={readOnly}
                onCheckedChange={(v) =>
                  onChange(v ? [...selected, o] : selected.filter((s) => s !== o))
                }
              />
              {o}
            </label>
          ))}
          {options.length === 0 && <span className="text-xs text-muted-foreground">אין אפשרויות מוגדרות</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{def.label}</Label>
      <Input
        type={def.field_type === "number" ? "number" : def.field_type === "date" ? "date" : "text"}
        value={value === null || value === undefined ? "" : String(value)}
        readOnly={readOnly}
        className={readOnly ? "bg-muted" : undefined}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") return onChange(null);
          onChange(def.field_type === "number" ? Number(raw) : raw);
        }}
      />
    </div>
  );
}
