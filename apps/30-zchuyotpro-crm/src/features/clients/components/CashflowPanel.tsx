import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  Scale,
  PiggyBank,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatILS, formatDateHe } from "@/lib/format";
import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  CATEGORY_LABELS,
  TX_SOURCE_LABELS,
  monthLabel,
  monthTransactionsQuery,
  budgetLimitsQuery,
  summarizeMonth,
  useInvalidateFinance,
  futureValue,
  SAVINGS_PRESETS,
} from "@/features/clients/finance";

function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

type Props = {
  clientId: string;
  tenantId: string;
  /** staff = inside the CRM client file; client = the self-portal (rows marked source='client') */
  mode: "staff" | "client";
  profileId?: string | null;
};

export function CashflowPanel({ clientId, tenantId, mode, profileId }: Props) {
  const now = new Date();
  const [ym, setYm] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });

  const { data: txs, isLoading } = useQuery(monthTransactionsQuery(clientId, ym.year, ym.month));
  const { data: limits } = useQuery(budgetLimitsQuery(clientId));
  const invalidate = useInvalidateFinance(clientId);

  const summary = useMemo(() => summarizeMonth(txs ?? []), [txs]);

  function shiftMonth(delta: number) {
    setYm((p) => {
      const m = p.month + delta;
      if (m < 1) return { year: p.year - 1, month: 12 };
      if (m > 12) return { year: p.year + 1, month: 1 };
      return { year: p.year, month: m };
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => shiftMonth(-1)} aria-label="חודש קודם">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="font-semibold">{monthLabel(ym.year, ym.month)}</div>
        <Button variant="outline" size="sm" onClick={() => shiftMonth(1)} aria-label="חודש הבא">
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard icon={TrendingUp} label="הכנסות" value={summary.income} tone="text-emerald-600" />
        <SummaryCard icon={TrendingDown} label="הוצאות" value={summary.expense} tone="text-red-600" />
        <SummaryCard icon={Scale} label="יתרה חודשית" value={summary.net} tone={summary.net >= 0 ? "text-emerald-600" : "text-red-600"} />
      </div>

      <AddTransactionCard clientId={clientId} tenantId={tenantId} mode={mode} profileId={profileId} onSaved={invalidate} />

      <Card>
        <CardHeader><CardTitle className="text-base">תנועות החודש</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (txs ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">אין תנועות בחודש זה</p>
          ) : (
            (txs ?? []).map((t) => (
              <TransactionRowView key={t.id} tx={t} mode={mode} onDeleted={invalidate} />
            ))
          )}
        </CardContent>
      </Card>

      <BudgetCard clientId={clientId} tenantId={tenantId} limits={limits ?? []} spentByCategory={summary.expenseByCategory} onSaved={invalidate} />

      <SavingsCalculatorCard />
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, tone }: { icon: typeof TrendingUp; label: string; value: number; tone: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-muted ${tone}`}><Icon className="h-5 w-5" /></div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className={`text-lg font-bold ${tone}`}>{formatILS(value)}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function AddTransactionCard({ clientId, tenantId, mode, profileId, onSaved }: Props & { onSaved: () => void }) {
  const [f, setF] = useState({ kind: "expense", category: "", amount: "", occurred_on: todayISO(), description: "" });
  const categories = f.kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const add = useMutation({
    mutationFn: async () => {
      const amount = Number(f.amount);
      if (!f.category) throw new Error("בחרו קטגוריה");
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("הזינו סכום חיובי");
      if (!f.occurred_on) throw new Error("בחרו תאריך");
      const { error } = await supabase.from("client_transactions").insert({
        tenant_id: tenantId,
        client_id: clientId,
        kind: f.kind,
        category: f.category,
        amount,
        occurred_on: f.occurred_on,
        description: f.description.trim() || null,
        source: mode === "staff" ? "staff" : "client",
        created_by: mode === "staff" ? (profileId ?? null) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("התנועה נשמרה");
      setF((p) => ({ ...p, amount: "", description: "" }));
      onSaved();
    },
    onError: (e: Error) => toast.error("שגיאה", { description: e.message }),
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">הוספת תנועה</CardTitle></CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-[110px_1fr_120px_150px_1fr_auto] items-end">
          <div className="space-y-1.5">
            <Label className="text-sm">סוג</Label>
            <Select value={f.kind} onValueChange={(v) => setF({ ...f, kind: v, category: "" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">הוצאה</SelectItem>
                <SelectItem value="income">הכנסה</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">קטגוריה</Label>
            <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
              <SelectTrigger><SelectValue placeholder="בחרו קטגוריה" /></SelectTrigger>
              <SelectContent>
                {Object.entries(categories).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">סכום (₪)</Label>
            <Input type="number" min="0" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">תאריך</Label>
            <Input type="date" value={f.occurred_on} onChange={(e) => setF({ ...f, occurred_on: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">תיאור</Label>
            <Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="אופציונלי" />
          </div>
          <Button onClick={() => add.mutate()} disabled={add.isPending}>
            {add.isPending ? <Loader2 className="h-4 w-4 animate-spin ms-1" /> : <Plus className="h-4 w-4 ms-1" />}
            הוסף
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TransactionRowView({ tx, mode, onDeleted }: {
  tx: { id: string; kind: string; category: string; description: string | null; amount: number; occurred_on: string; source: string };
  mode: "staff" | "client";
  onDeleted: () => void;
}) {
  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("client_transactions").delete().eq("id", tx.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("נמחק"); onDeleted(); },
    onError: (e: Error) => toast.error("שגיאה", { description: e.message }),
  });

  const income = tx.kind === "income";
  // RLS only lets a portal client delete rows they keyed in themselves
  const canDelete = mode === "staff" || tx.source === "client";

  return (
    <div className="flex items-center gap-3 border-b last:border-0 py-2">
      <Badge variant="outline" className={income ? "text-emerald-600 border-emerald-300" : "text-red-600 border-red-300"}>
        {income ? "הכנסה" : "הוצאה"}
      </Badge>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{CATEGORY_LABELS[tx.category] ?? tx.category}</div>
        <div className="text-xs text-muted-foreground truncate">
          {formatDateHe(tx.occurred_on)}
          {tx.description ? ` · ${tx.description}` : ""}
          {` · ${TX_SOURCE_LABELS[tx.source] ?? tx.source}`}
        </div>
      </div>
      <div className={`text-sm font-bold whitespace-nowrap ${income ? "text-emerald-600" : "text-red-600"}`}>
        {income ? "+" : "-"}{formatILS(Number(tx.amount))}
      </div>
      {canDelete && (
        <Button variant="ghost" size="icon" onClick={() => del.mutate()} disabled={del.isPending} aria-label="מחיקת תנועה">
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
}

function BudgetCard({ clientId, tenantId, limits, spentByCategory, onSaved }: {
  clientId: string;
  tenantId: string;
  limits: { id: string; category: string; monthly_limit: number }[];
  spentByCategory: Record<string, number>;
  onSaved: () => void;
}) {
  const [f, setF] = useState({ category: "", limit: "" });
  const freeCategories = Object.entries(EXPENSE_CATEGORIES).filter(([k]) => !limits.some((l) => l.category === k));

  const save = useMutation({
    mutationFn: async () => {
      const monthly_limit = Number(f.limit);
      if (!f.category) throw new Error("בחרו קטגוריה");
      if (!Number.isFinite(monthly_limit) || monthly_limit < 0) throw new Error("הזינו תקרה תקינה");
      const { error } = await supabase
        .from("client_budget_limits")
        .upsert({ tenant_id: tenantId, client_id: clientId, category: f.category, monthly_limit }, { onConflict: "client_id,category" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("התקציב נשמר"); setF({ category: "", limit: "" }); onSaved(); },
    onError: (e: Error) => toast.error("שגיאה", { description: e.message }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_budget_limits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("הוסר"); onSaved(); },
    onError: (e: Error) => toast.error("שגיאה", { description: e.message }),
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">תקציב חודשי לפי קטגוריה</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {limits.length === 0 ? (
          <p className="text-sm text-muted-foreground">עדיין לא הוגדרו תקרות תקציב — הגדירו תקרה לקטגוריה כדי לעקוב מול ההוצאות בפועל.</p>
        ) : (
          <div className="space-y-3">
            {limits.map((l) => {
              const spent = spentByCategory[l.category] ?? 0;
              const limit = Number(l.monthly_limit);
              const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 100;
              const over = spent > limit;
              return (
                <div key={l.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium">{CATEGORY_LABELS[l.category] ?? l.category}</span>
                    <span className={over ? "text-red-600 font-semibold" : "text-muted-foreground"}>
                      {formatILS(spent)} מתוך {formatILS(limit)}
                      {over && " · חריגה"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={pct} className={`h-2 flex-1 ${over ? "[&>*]:bg-red-500" : ""}`} />
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => del.mutate(l.id)} aria-label="הסרת תקרה">
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap gap-2 items-end border-t pt-3">
          <div className="space-y-1.5 min-w-48">
            <Label className="text-sm">קטגוריה</Label>
            <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
              <SelectTrigger><SelectValue placeholder="בחרו קטגוריה" /></SelectTrigger>
              <SelectContent>
                {freeCategories.map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 w-36">
            <Label className="text-sm">תקרה חודשית (₪)</Label>
            <Input type="number" min="0" value={f.limit} onChange={(e) => setF({ ...f, limit: e.target.value })} />
          </div>
          <Button variant="outline" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin ms-1" /> : <Plus className="h-4 w-4 ms-1" />}
            הגדר תקרה
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SavingsCalculatorCard() {
  const [f, setF] = useState({ initial: "0", monthly: "114", rate: "4", years: "18", preset: "child" });

  const initial = Number(f.initial) || 0;
  const monthly = Number(f.monthly) || 0;
  const rate = Number(f.rate) || 0;
  const years = Math.max(0, Number(f.years) || 0);
  const fv = futureValue(initial, monthly, rate, years);
  const deposited = initial + monthly * Math.round(years * 12);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><PiggyBank className="h-4 w-4" /> מחשבוני חיסכון</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible defaultValue="calc">
          <AccordionItem value="calc" className="border-0">
            <AccordionTrigger className="py-2 text-sm">חיסכון לילד · קרן חתונה · פנסיה · קרן השתלמות</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {SAVINGS_PRESETS.map((p) => (
                  <Button
                    key={p.key}
                    size="sm"
                    variant={f.preset === p.key ? "default" : "outline"}
                    title={p.description}
                    onClick={() => setF({
                      initial: String(p.initial),
                      monthly: String(p.monthlyDeposit),
                      rate: String(p.annualRatePct),
                      years: String(p.years),
                      preset: p.key,
                    })}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">סכום התחלתי (₪)</Label>
                  <Input type="number" min="0" value={f.initial} onChange={(e) => setF({ ...f, initial: e.target.value, preset: "" })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">הפקדה חודשית (₪)</Label>
                  <Input type="number" min="0" value={f.monthly} onChange={(e) => setF({ ...f, monthly: e.target.value, preset: "" })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">תשואה שנתית (%)</Label>
                  <Input type="number" min="0" step="0.5" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value, preset: "" })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">שנים</Label>
                  <Input type="number" min="0" value={f.years} onChange={(e) => setF({ ...f, years: e.target.value, preset: "" })} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 text-center">
                <div className="rounded-lg bg-muted p-3">
                  <div className="text-xs text-muted-foreground">סה״כ הפקדות</div>
                  <div className="font-bold">{formatILS(deposited)}</div>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <div className="text-xs text-muted-foreground">רווח מצטבר</div>
                  <div className="font-bold text-emerald-600">{formatILS(fv - deposited)}</div>
                </div>
                <div className="rounded-lg bg-primary/10 p-3">
                  <div className="text-xs text-muted-foreground">צבירה צפויה</div>
                  <div className="font-bold text-primary">{formatILS(fv)}</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                הערכה בלבד לפי ריבית דריבית חודשית — אינה ייעוץ פיננסי ואינה מתחשבת במס, דמי ניהול או שינויי תשואה.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
