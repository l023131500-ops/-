import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Pencil, X, Landmark, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatILS, formatDateHe } from "@/lib/format";
import {
  LOAN_TYPES,
  type LoanRow,
  loansQuery,
  summarizeLoans,
  monthsToPayoff,
  useInvalidateFinance,
  HOME_PURCHASE_MODES,
  type HomePurchaseModeKey,
  planHomePurchase,
  PAYMENT_BURDEN_WARN,
  PAYMENT_BURDEN_MAX,
} from "@/features/clients/finance";

type Props = {
  clientId: string;
  tenantId: string;
  /** staff = inside the CRM client file; client = the self-portal */
  mode: "staff" | "client";
  profileId?: string | null;
  /** the selected month's ledger income — used as the default net income for the burden ratio */
  monthIncome: number;
};

export function LoansPlanningSection({ clientId, tenantId, mode, profileId, monthIncome }: Props) {
  const { data: loans, isLoading } = useQuery(loansQuery(clientId));
  const invalidate = useInvalidateFinance(clientId);
  const summary = useMemo(() => summarizeLoans(loans ?? []), [loans]);

  return (
    <>
      <LoansCard
        clientId={clientId}
        tenantId={tenantId}
        mode={mode}
        profileId={profileId}
        loans={loans ?? []}
        isLoading={isLoading}
        monthIncome={monthIncome}
        totalMonthly={summary.totalMonthly}
        totalBalance={summary.totalBalance}
        onSaved={invalidate}
      />
      <HomePurchaseCard monthIncome={monthIncome} existingMonthlyLoans={summary.totalMonthly} />
    </>
  );
}

type LoanForm = {
  lender: string;
  loan_type: string;
  balance: string;
  monthly_payment: string;
  principal: string;
  annual_rate_pct: string;
  end_date: string;
  notes: string;
};

const EMPTY_LOAN: LoanForm = {
  lender: "",
  loan_type: "bank",
  balance: "",
  monthly_payment: "",
  principal: "",
  annual_rate_pct: "",
  end_date: "",
  notes: "",
};

function LoansCard({ clientId, tenantId, mode, profileId, loans, isLoading, monthIncome, totalMonthly, totalBalance, onSaved }: {
  clientId: string;
  tenantId: string;
  mode: "staff" | "client";
  profileId?: string | null;
  loans: LoanRow[];
  isLoading: boolean;
  monthIncome: number;
  totalMonthly: number;
  totalBalance: number;
  onSaved: () => void;
}) {
  const [f, setF] = useState<LoanForm>(EMPTY_LOAN);
  const [editingId, setEditingId] = useState<string | null>(null);

  const burden = monthIncome > 0 ? totalMonthly / monthIncome : null;

  const save = useMutation({
    mutationFn: async () => {
      const balance = Number(f.balance);
      const monthly_payment = Number(f.monthly_payment);
      if (!f.lender.trim()) throw new Error("הזינו למי חייבים (בנק / גוף מלווה)");
      if (!Number.isFinite(balance) || balance < 0) throw new Error("הזינו יתרה תקינה");
      if (!Number.isFinite(monthly_payment) || monthly_payment < 0) throw new Error("הזינו החזר חודשי תקין");
      const principal = f.principal === "" ? null : Number(f.principal);
      if (principal !== null && (!Number.isFinite(principal) || principal < 0)) throw new Error("סכום הלוואה מקורי לא תקין");
      const annual_rate_pct = f.annual_rate_pct === "" ? null : Number(f.annual_rate_pct);
      if (annual_rate_pct !== null && (!Number.isFinite(annual_rate_pct) || annual_rate_pct < 0)) throw new Error("ריבית לא תקינה");
      const row = {
        lender: f.lender.trim(),
        loan_type: f.loan_type,
        balance,
        monthly_payment,
        principal,
        annual_rate_pct,
        end_date: f.end_date || null,
        notes: f.notes.trim() || null,
      };
      if (editingId) {
        const { error } = await supabase.from("client_loans").update(row).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("client_loans").insert({
          ...row,
          tenant_id: tenantId,
          client_id: clientId,
          created_by: mode === "staff" ? (profileId ?? null) : null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "ההלוואה עודכנה" : "ההלוואה נוספה");
      setF(EMPTY_LOAN);
      setEditingId(null);
      onSaved();
    },
    onError: (e: Error) => toast.error("שגיאה", { description: e.message }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_loans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, id) => {
      toast.success("ההלוואה הוסרה");
      if (editingId === id) { setF(EMPTY_LOAN); setEditingId(null); }
      onSaved();
    },
    onError: (e: Error) => toast.error("שגיאה", { description: e.message }),
  });

  function startEdit(l: LoanRow) {
    setEditingId(l.id);
    setF({
      lender: l.lender,
      loan_type: l.loan_type,
      balance: String(l.balance ?? ""),
      monthly_payment: String(l.monthly_payment ?? ""),
      principal: l.principal === null ? "" : String(l.principal),
      annual_rate_pct: l.annual_rate_pct === null ? "" : String(l.annual_rate_pct),
      end_date: l.end_date ?? "",
      notes: l.notes ?? "",
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Landmark className="h-4 w-4" /> ניהול הלוואות</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : loans.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            עדיין לא נרשמו הלוואות — רשמו כל הלוואה (משכנתא, בנק, גמ״ח…) כדי לראות את נטל ההחזרים החודשי מול ההכנסה.
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-muted p-3 text-center">
                <div className="text-xs text-muted-foreground">סה״כ החזר חודשי</div>
                <div className="font-bold">{formatILS(totalMonthly)}</div>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <div className="text-xs text-muted-foreground">סה״כ יתרת חוב</div>
                <div className="font-bold">{formatILS(totalBalance)}</div>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <div className="text-xs text-muted-foreground">נטל החזרים מההכנסה החודשית</div>
                {burden === null ? (
                  <div className="text-sm text-muted-foreground pt-1">אין הכנסות בחודש הנבחר</div>
                ) : (
                  <div className={`font-bold ${burden > PAYMENT_BURDEN_MAX ? "text-red-600" : burden > PAYMENT_BURDEN_WARN ? "text-amber-600" : "text-emerald-600"}`}>
                    {Math.round(burden * 100)}%
                    {burden > PAYMENT_BURDEN_MAX ? " · מעל התקרה" : burden > PAYMENT_BURDEN_WARN ? " · גבוה" : ""}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1">
              {loans.map((l) => <LoanRowView key={l.id} loan={l} onEdit={() => startEdit(l)} onDelete={() => del.mutate(l.id)} deleting={del.isPending} />)}
            </div>
          </>
        )}

        <div className="border-t pt-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">{editingId ? "עריכת הלוואה" : "הוספת הלוואה"}</div>
            {editingId && (
              <Button variant="ghost" size="sm" onClick={() => { setEditingId(null); setF(EMPTY_LOAN); }}>
                <X className="h-4 w-4 ms-1" /> ביטול עריכה
              </Button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-sm">גוף מלווה</Label>
              <Input value={f.lender} onChange={(e) => setF({ ...f, lender: e.target.value })} placeholder="בנק / גמ״ח / חברת אשראי" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">סוג</Label>
              <Select value={f.loan_type} onValueChange={(v) => setF({ ...f, loan_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LOAN_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">יתרת חוב (₪)</Label>
              <Input type="number" min="0" value={f.balance} onChange={(e) => setF({ ...f, balance: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">החזר חודשי (₪)</Label>
              <Input type="number" min="0" value={f.monthly_payment} onChange={(e) => setF({ ...f, monthly_payment: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">סכום מקורי (₪, אופציונלי)</Label>
              <Input type="number" min="0" value={f.principal} onChange={(e) => setF({ ...f, principal: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">ריבית שנתית (%, אופציונלי)</Label>
              <Input type="number" min="0" step="0.1" value={f.annual_rate_pct} onChange={(e) => setF({ ...f, annual_rate_pct: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">תאריך סיום (אופציונלי)</Label>
              <Input type="date" value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">הערות</Label>
              <Input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="אופציונלי" />
            </div>
          </div>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin ms-1" /> : editingId ? <Pencil className="h-4 w-4 ms-1" /> : <Plus className="h-4 w-4 ms-1" />}
            {editingId ? "שמור שינויים" : "הוסף הלוואה"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LoanRowView({ loan, onEdit, onDelete, deleting }: { loan: LoanRow; onEdit: () => void; onDelete: () => void; deleting: boolean }) {
  const principal = loan.principal === null ? null : Number(loan.principal);
  const balance = Number(loan.balance) || 0;
  const paidPct = principal && principal > 0 ? Math.max(0, Math.min(100, Math.round(((principal - balance) / principal) * 100))) : null;
  const payoff = monthsToPayoff(balance, Number(loan.annual_rate_pct) || 0, Number(loan.monthly_payment) || 0);

  return (
    <div className="flex items-center gap-3 border-b last:border-0 py-2">
      <Badge variant="outline">{LOAN_TYPES[loan.loan_type as keyof typeof LOAN_TYPES] ?? loan.loan_type}</Badge>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{loan.lender}</div>
        <div className="text-xs text-muted-foreground truncate">
          יתרה {formatILS(balance)} · החזר {formatILS(Number(loan.monthly_payment))}/חודש
          {loan.annual_rate_pct !== null && ` · ריבית ${Number(loan.annual_rate_pct)}%`}
          {loan.end_date
            ? ` · עד ${formatDateHe(loan.end_date)}`
            : payoff !== null && payoff > 0
              ? ` · ~${payoff} חודשים לסילוק`
              : payoff === null && balance > 0
                ? " · ההחזר אינו מכסה את הריבית"
                : ""}
          {loan.notes && ` · ${loan.notes}`}
        </div>
        {paidPct !== null && (
          <div className="flex items-center gap-2 mt-1">
            <Progress value={paidPct} className="h-1.5 w-40" />
            <span className="text-[11px] text-muted-foreground">שולם {paidPct}%</span>
          </div>
        )}
      </div>
      <Button variant="ghost" size="icon" onClick={onEdit} aria-label="עריכת הלוואה">
        <Pencil className="h-4 w-4 text-muted-foreground" />
      </Button>
      <Button variant="ghost" size="icon" onClick={onDelete} disabled={deleting} aria-label="מחיקת הלוואה">
        <Trash2 className="h-4 w-4 text-muted-foreground" />
      </Button>
    </div>
  );
}

function HomePurchaseCard({ monthIncome, existingMonthlyLoans }: { monthIncome: number; existingMonthlyLoans: number }) {
  const [mode, setMode] = useState<HomePurchaseModeKey>("first");
  const [f, setF] = useState({ price: "1500000", equity: "500000", rate: "5", years: "25", income: "", rent: "4000" });

  const netIncome = f.income === "" ? monthIncome : Number(f.income) || 0;
  const plan = planHomePurchase({
    mode,
    price: Number(f.price) || 0,
    equity: Number(f.equity) || 0,
    annualRatePct: Number(f.rate) || 0,
    years: Math.max(1, Number(f.years) || 0),
    netIncome,
    existingMonthlyLoans,
  });
  const price = Number(f.price) || 0;
  const rent = Number(f.rent) || 0;
  const grossYield = mode === "investment" && price > 0 ? (rent * 12) / price : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Home className="h-4 w-4" /> חישוב רכישת דירה ודירה להשקעה</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(Object.entries(HOME_PURCHASE_MODES) as [HomePurchaseModeKey, { label: string; maxLtv: number }][]).map(([k, m]) => (
            <Button key={k} size="sm" variant={mode === k ? "default" : "outline"} onClick={() => setMode(k)}>
              {m.label} · עד {Math.round(m.maxLtv * 100)}% מימון
            </Button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label className="text-sm">מחיר הדירה (₪)</Label>
            <Input type="number" min="0" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">הון עצמי (₪)</Label>
            <Input type="number" min="0" value={f.equity} onChange={(e) => setF({ ...f, equity: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">ריבית שנתית (%)</Label>
            <Input type="number" min="0" step="0.1" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">שנות משכנתא</Label>
            <Input type="number" min="1" max="30" value={f.years} onChange={(e) => setF({ ...f, years: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">הכנסה חודשית נטו (₪)</Label>
            <Input
              type="number"
              min="0"
              value={f.income}
              onChange={(e) => setF({ ...f, income: e.target.value })}
              placeholder={monthIncome > 0 ? `${Math.round(monthIncome)} (מהתזרים)` : "לא ידוע"}
            />
          </div>
          {mode === "investment" && (
            <div className="space-y-1.5">
              <Label className="text-sm">שכר דירה צפוי (₪/חודש)</Label>
              <Input type="number" min="0" value={f.rent} onChange={(e) => setF({ ...f, rent: e.target.value })} />
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-center">
          <div className="rounded-lg bg-muted p-3">
            <div className="text-xs text-muted-foreground">משכנתא נדרשת</div>
            <div className="font-bold">{formatILS(plan.loanNeeded)}</div>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <div className="text-xs text-muted-foreground">אחוז מימון (מתוך עד {Math.round(plan.maxLtv * 100)}%)</div>
            <div className={`font-bold ${plan.ltvOk ? "text-emerald-600" : "text-red-600"}`}>
              {Math.round(plan.ltv * 100)}%{!plan.ltvOk && " · מעל התקרה"}
            </div>
            {!plan.ltvOk && (
              <div className="text-[11px] text-red-600 mt-0.5">נדרש הון עצמי של לפחות {formatILS(plan.minEquity)}</div>
            )}
          </div>
          <div className="rounded-lg bg-primary/10 p-3">
            <div className="text-xs text-muted-foreground">החזר חודשי משוער</div>
            <div className="font-bold text-primary">{formatILS(plan.monthlyPayment)}</div>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <div className="text-xs text-muted-foreground">נטל החזרים כולל הלוואות קיימות</div>
            {plan.burden === null ? (
              <div className="text-sm text-muted-foreground pt-1">הזינו הכנסה לחישוב</div>
            ) : (
              <div className={`font-bold ${plan.burden > PAYMENT_BURDEN_MAX ? "text-red-600" : plan.burden > PAYMENT_BURDEN_WARN ? "text-amber-600" : "text-emerald-600"}`}>
                {Math.round(plan.burden * 100)}%
                {plan.burden > PAYMENT_BURDEN_MAX ? " · מעל תקרת הבנקים" : plan.burden > PAYMENT_BURDEN_WARN ? " · גבוה" : ""}
              </div>
            )}
          </div>
          {mode === "investment" && (
            <>
              <div className="rounded-lg bg-muted p-3">
                <div className="text-xs text-muted-foreground">תשואה שנתית ברוטו משכירות</div>
                <div className="font-bold">{grossYield === null ? "—" : `${(grossYield * 100).toFixed(1)}%`}</div>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <div className="text-xs text-muted-foreground">תזרים חודשי (שכירות פחות החזר)</div>
                <div className={`font-bold ${rent - plan.monthlyPayment >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {formatILS(rent - plan.monthlyPayment)}
                </div>
              </div>
            </>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          הערכה בלבד לפי לוח שפיצר וריבית קבועה — אינה ייעוץ משכנתאות ואינה כוללת מס רכישה, עלויות נלוות, ביטוחים או מסלולים משתנים. תקרות המימון לפי הנחיות בנק ישראל לסוג הרוכש.
        </p>
      </CardContent>
    </Card>
  );
}
