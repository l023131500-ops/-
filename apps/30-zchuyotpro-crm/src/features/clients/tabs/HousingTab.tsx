import { useState, useEffect } from "react";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Save, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { housingQuery, useInvalidateClient, clientQuery } from "@/features/clients/queries";
import { HOUSING_TYPE } from "@/features/clients/constants";
import { formatDateTimeHe } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Property = { address: string; type: string; value: number };

export function HousingTab({ clientId }: { clientId: string }) {
  const { data: client } = useSuspenseQuery(clientQuery(clientId));
  const { data: existing } = useSuspenseQuery(housingQuery(clientId));
  const invalidate = useInvalidateClient();

  const init = () => ({
    id: existing?.id,
    housing_type: existing?.housing_type ?? "",
    has_mortgage: existing?.has_mortgage ?? false,
    mortgage_details: (existing?.mortgage_details as { lender?: string; balance?: number; monthly?: number; end_date?: string } | null) ?? {},
    property_address: existing?.property_address ?? "",
    arnona_account_number: existing?.arnona_account_number ?? "",
    electricity_meter_number: existing?.electricity_meter_number ?? "",
    water_account_number: existing?.water_account_number ?? "",
    has_additional_property: existing?.has_additional_property ?? false,
    additional_properties: (existing?.additional_properties as Property[] | null) ?? [],
    monthly_rent: existing?.monthly_rent ?? "",
  });
  const [f, setF] = useState(init);
  useEffect(() => { setF(init); /* eslint-disable-next-line */ }, [existing]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...(f.id ? { id: f.id } : {}),
        client_id: clientId,
        tenant_id: client.tenant_id,
        housing_type: f.housing_type || null,
        has_mortgage: f.has_mortgage,
        mortgage_details: f.mortgage_details,
        property_address: f.property_address || null,
        arnona_account_number: f.arnona_account_number || null,
        electricity_meter_number: f.electricity_meter_number || null,
        water_account_number: f.water_account_number || null,
        has_additional_property: f.has_additional_property,
        additional_properties: f.additional_properties,
        monthly_rent: f.monthly_rent === "" ? null : Number(f.monthly_rent),
      };
      if (f.id) {
        const { error } = await supabase.from("client_housing_profile").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("client_housing_profile").insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("נשמר"); invalidate(clientId); },
    onError: (e: Error) => toast.error("שגיאה", { description: e.message }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>דיור וחשבונות</CardTitle>
          {existing?.updated_at && (
            <div className="text-xs text-muted-foreground mt-1">
              עודכן לאחרונה: {formatDateTimeHe(existing.updated_at)}
            </div>
          )}
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin ms-2" /> : <Save className="h-4 w-4 ms-2" />}
          שמור
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Fld label="סוג מגורים">
            <Select value={f.housing_type} onValueChange={(v) => setF({ ...f, housing_type: v })}>
              <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
              <SelectContent>{Object.entries(HOUSING_TYPE).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </Fld>
          <Fld label="כתובת הנכס"><Input value={f.property_address} onChange={(e) => setF({ ...f, property_address: e.target.value })} /></Fld>
          {f.housing_type === "rented" && (
            <Fld label="שכר דירה חודשי (₪)"><Input type="number" value={String(f.monthly_rent)} onChange={(e) => setF({ ...f, monthly_rent: e.target.value })} /></Fld>
          )}
          <Fld label="מס׳ חשבון ארנונה"><Input dir="ltr" value={f.arnona_account_number} onChange={(e) => setF({ ...f, arnona_account_number: e.target.value })} /></Fld>
          <Fld label="מס׳ מונה חשמל"><Input dir="ltr" value={f.electricity_meter_number} onChange={(e) => setF({ ...f, electricity_meter_number: e.target.value })} /></Fld>
          <Fld label="מס׳ חשבון מים"><Input dir="ltr" value={f.water_account_number} onChange={(e) => setF({ ...f, water_account_number: e.target.value })} /></Fld>
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center gap-3 mb-3">
            <Switch id="housing-has-mortgage" checked={f.has_mortgage} onCheckedChange={(v) => setF({ ...f, has_mortgage: v })} />
            <Label htmlFor="housing-has-mortgage">קיימת משכנתא</Label>
          </div>
          {f.has_mortgage && (
            <div className="grid gap-3 md:grid-cols-2 ps-12">
              <Fld label="בנק / מלווה"><Input value={f.mortgage_details.lender ?? ""} onChange={(e) => setF({ ...f, mortgage_details: { ...f.mortgage_details, lender: e.target.value } })} /></Fld>
              <Fld label="יתרה (₪)"><Input type="number" value={String(f.mortgage_details.balance ?? "")} onChange={(e) => setF({ ...f, mortgage_details: { ...f.mortgage_details, balance: Number(e.target.value) } })} /></Fld>
              <Fld label="החזר חודשי (₪)"><Input type="number" value={String(f.mortgage_details.monthly ?? "")} onChange={(e) => setF({ ...f, mortgage_details: { ...f.mortgage_details, monthly: Number(e.target.value) } })} /></Fld>
              <Fld label="תאריך סיום"><Input type="date" value={f.mortgage_details.end_date ?? ""} onChange={(e) => setF({ ...f, mortgage_details: { ...f.mortgage_details, end_date: e.target.value } })} /></Fld>
            </div>
          )}
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Switch id="housing-has-additional-property" checked={f.has_additional_property} onCheckedChange={(v) => setF({ ...f, has_additional_property: v })} />
              <Label htmlFor="housing-has-additional-property">נכסים נוספים</Label>
            </div>
            {f.has_additional_property && (
              <Button size="sm" variant="outline" onClick={() => setF({ ...f, additional_properties: [...f.additional_properties, { address: "", type: "", value: 0 }] })}><Plus className="h-3 w-3 ms-1" /> הוסף</Button>
            )}
          </div>
          {f.has_additional_property && f.additional_properties.map((p, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_140px_auto] gap-2 items-center mb-2">
              <Input placeholder="כתובת" value={p.address} onChange={(e) => { const x = [...f.additional_properties]; x[i] = { ...p, address: e.target.value }; setF({ ...f, additional_properties: x }); }} />
              <Input placeholder="סוג" value={p.type} onChange={(e) => { const x = [...f.additional_properties]; x[i] = { ...p, type: e.target.value }; setF({ ...f, additional_properties: x }); }} />
              <Input type="number" placeholder="שווי" value={p.value} onChange={(e) => { const x = [...f.additional_properties]; x[i] = { ...p, value: Number(e.target.value) }; setF({ ...f, additional_properties: x }); }} />
              <Button variant="ghost" size="icon" aria-label="הסר נכס" onClick={() => setF({ ...f, additional_properties: f.additional_properties.filter((_, j) => j !== i) })}><X className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-sm">{label}</Label>{children}</div>;
}
