import { useState, useEffect } from "react";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Save, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { financialQuery, useInvalidateClient, clientQuery } from "@/features/clients/queries";
import { EMPLOYMENT_STATUS } from "@/features/clients/constants";
import { formatDateTimeHe } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type IncomeSource = { name: string; amount: number };
type Insurance = { provider: string; type: string; premium: number };

export function FinancialTab({ clientId }: { clientId: string }) {
  const { data: client } = useSuspenseQuery(clientQuery(clientId));
  const { data: existing } = useSuspenseQuery(financialQuery(clientId));
  const invalidate = useInvalidateClient();

  const [f, setF] = useState({
    employment_status: existing?.employment_status ?? "",
    employer_name: existing?.employer_name ?? "",
    occupation: existing?.occupation ?? "",
    gross_monthly_income: existing?.gross_monthly_income ?? "",
    net_monthly_income: existing?.net_monthly_income ?? "",
    spouse_income: existing?.spouse_income ?? "",
    other_income: existing?.other_income ?? "",
    income_sources: (existing?.income_sources as IncomeSource[] | null) ?? [],
    has_pension: existing?.has_pension ?? false,
    pension_details: (existing?.pension_details as { provider?: string; monthly?: number; notes?: string } | null) ?? {},
    has_life_insurance: existing?.has_life_insurance ?? false,
    insurance_details: (existing?.insurance_details as Insurance[] | null) ?? [],
  });

  useEffect(() => {
    if (existing) {
      setF({
        employment_status: existing.employment_status ?? "",
        employer_name: existing.employer_name ?? "",
        occupation: existing.occupation ?? "",
        gross_monthly_income: existing.gross_monthly_income ?? "",
        net_monthly_income: existing.net_monthly_income ?? "",
        spouse_income: existing.spouse_income ?? "",
        other_income: existing.other_income ?? "",
        income_sources: (existing.income_sources as IncomeSource[] | null) ?? [],
        has_pension: existing.has_pension ?? false,
        pension_details: (existing.pension_details as never) ?? {},
        has_life_insurance: existing.has_life_insurance ?? false,
        insurance_details: (existing.insurance_details as Insurance[] | null) ?? [],
      });
    }
  }, [existing]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        client_id: clientId,
        tenant_id: client.tenant_id,
        employment_status: f.employment_status || null,
        employer_name: f.employer_name || null,
        occupation: f.occupation || null,
        gross_monthly_income: f.gross_monthly_income === "" ? null : Number(f.gross_monthly_income),
        net_monthly_income: f.net_monthly_income === "" ? null : Number(f.net_monthly_income),
        spouse_income: f.spouse_income === "" ? null : Number(f.spouse_income),
        other_income: f.other_income === "" ? null : Number(f.other_income),
        income_sources: f.income_sources,
        has_pension: f.has_pension,
        pension_details: f.pension_details,
        has_life_insurance: f.has_life_insurance,
        insurance_details: f.insurance_details,
      };
      const { error } = await supabase.from("client_financial_profile").upsert(payload as never, { onConflict: "client_id" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("נשמר"); invalidate(clientId); },
    onError: (e: Error) => toast.error("שגיאה", { description: e.message }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>פרופיל פיננסי</CardTitle>
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
          <Fld label="סטטוס תעסוקתי">
            <Select value={f.employment_status} onValueChange={(v) => setF({ ...f, employment_status: v })}>
              <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
              <SelectContent>{Object.entries(EMPLOYMENT_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </Fld>
          <Fld label="מקצוע"><Input value={f.occupation} onChange={(e) => setF({ ...f, occupation: e.target.value })} /></Fld>
          <Fld label="שם המעסיק"><Input value={f.employer_name} onChange={(e) => setF({ ...f, employer_name: e.target.value })} /></Fld>
          <Fld label="הכנסה חודשית ברוטו (₪)"><Input type="number" value={String(f.gross_monthly_income)} onChange={(e) => setF({ ...f, gross_monthly_income: e.target.value })} /></Fld>
          <Fld label="הכנסה חודשית נטו (₪)"><Input type="number" value={String(f.net_monthly_income)} onChange={(e) => setF({ ...f, net_monthly_income: e.target.value })} /></Fld>
          <Fld label="הכנסת בן/בת זוג (₪)"><Input type="number" value={String(f.spouse_income)} onChange={(e) => setF({ ...f, spouse_income: e.target.value })} /></Fld>
          <Fld label="הכנסות נוספות (₪)"><Input type="number" value={String(f.other_income)} onChange={(e) => setF({ ...f, other_income: e.target.value })} /></Fld>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>מקורות הכנסה נוספים</Label>
            <Button size="sm" variant="outline" onClick={() => setF({ ...f, income_sources: [...f.income_sources, { name: "", amount: 0 }] })}>
              <Plus className="h-3 w-3 ms-1" /> הוסף
            </Button>
          </div>
          <div className="space-y-2">
            {f.income_sources.map((s, i) => (
              <div key={i} className="flex gap-2">
                <Input placeholder="שם" value={s.name} onChange={(e) => { const x = [...f.income_sources]; x[i] = { ...s, name: e.target.value }; setF({ ...f, income_sources: x }); }} />
                <Input type="number" placeholder="סכום" value={s.amount} onChange={(e) => { const x = [...f.income_sources]; x[i] = { ...s, amount: Number(e.target.value) }; setF({ ...f, income_sources: x }); }} className="w-32" />
                <Button variant="ghost" size="icon" aria-label="הסר מקור הכנסה" onClick={() => setF({ ...f, income_sources: f.income_sources.filter((_, j) => j !== i) })}><X className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center gap-3 mb-3">
            <Switch checked={f.has_pension} onCheckedChange={(v) => setF({ ...f, has_pension: v })} />
            <Label>קיים הסדר פנסיוני</Label>
          </div>
          {f.has_pension && (
            <div className="grid gap-3 md:grid-cols-2 ps-12">
              <Fld label="חברה"><Input value={f.pension_details.provider ?? ""} onChange={(e) => setF({ ...f, pension_details: { ...f.pension_details, provider: e.target.value } })} /></Fld>
              <Fld label="צבירה / קצבה חודשית"><Input type="number" value={String(f.pension_details.monthly ?? "")} onChange={(e) => setF({ ...f, pension_details: { ...f.pension_details, monthly: Number(e.target.value) } })} /></Fld>
            </div>
          )}
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center gap-3 mb-3">
            <Switch checked={f.has_life_insurance} onCheckedChange={(v) => setF({ ...f, has_life_insurance: v })} />
            <Label>קיים ביטוח חיים / בריאות</Label>
          </div>
          {f.has_life_insurance && (
            <div className="space-y-2">
              <Button size="sm" variant="outline" onClick={() => setF({ ...f, insurance_details: [...f.insurance_details, { provider: "", type: "", premium: 0 }] })}>
                <Plus className="h-3 w-3 ms-1" /> הוסף פוליסה
              </Button>
              {f.insurance_details.map((p, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_120px_auto] gap-2 items-center">
                  <Input placeholder="חברה" value={p.provider} onChange={(e) => { const x = [...f.insurance_details]; x[i] = { ...p, provider: e.target.value }; setF({ ...f, insurance_details: x }); }} />
                  <Input placeholder="סוג" value={p.type} onChange={(e) => { const x = [...f.insurance_details]; x[i] = { ...p, type: e.target.value }; setF({ ...f, insurance_details: x }); }} />
                  <Input type="number" placeholder="פרמיה" value={p.premium} onChange={(e) => { const x = [...f.insurance_details]; x[i] = { ...p, premium: Number(e.target.value) }; setF({ ...f, insurance_details: x }); }} />
                  <Button variant="ghost" size="icon" aria-label="הסר פוליסה" onClick={() => setF({ ...f, insurance_details: f.insurance_details.filter((_, j) => j !== i) })}><X className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-sm">{label}</Label>{children}</div>;
}
