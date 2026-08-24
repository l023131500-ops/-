import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
export type TransactionRow = Tables["client_transactions"]["Row"];
export type BudgetLimitRow = Tables["client_budget_limits"]["Row"];
export type LoanRow = Tables["client_loans"]["Row"];

export const INCOME_CATEGORIES = {
  salary: "משכורת",
  spouse_salary: "משכורת בן/בת זוג",
  business: "עסק / עצמאי",
  allowance: "קצבה (ביטוח לאומי וכו׳)",
  rental: "שכירות מנכס",
  support: "תמיכה / מלגה",
  gift: "מתנה",
  other_income: "הכנסה אחרת",
} as const;

export const EXPENSE_CATEGORIES = {
  housing: "דיור (שכ״ד / משכנתא)",
  groceries: "מזון וסופר",
  utilities: "חשבונות (חשמל/מים/גז/ארנונה)",
  communication: "תקשורת",
  education: "חינוך",
  health: "בריאות",
  transport: "תחבורה ורכב",
  insurance: "ביטוחים",
  loans: "החזרי הלוואות",
  clothing: "ביגוד והנעלה",
  celebrations: "שמחות ואירועים",
  donations: "תרומות ומעשרות",
  other_expense: "הוצאה אחרת",
} as const;

export const CATEGORY_LABELS: Record<string, string> = { ...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES };

export const TX_SOURCE_LABELS: Record<string, string> = {
  staff: "צוות",
  client: "לקוח",
  voice: "קו טלפוני",
  import: "ייבוא",
};

/** First day of the given month and of the next month, as YYYY-MM-DD (for occurred_on range filters). */
export function monthRange(year: number, month: number): { from: string; to: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const nextY = month === 12 ? year + 1 : year;
  const nextM = month === 12 ? 1 : month + 1;
  return { from: `${year}-${pad(month)}-01`, to: `${nextY}-${pad(nextM)}-01` };
}

export function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}

export const monthTransactionsQuery = (clientId: string | undefined, year: number, month: number) =>
  queryOptions({
    queryKey: ["client-transactions", clientId, year, month],
    queryFn: async () => {
      if (!clientId) return [];
      const { from, to } = monthRange(year, month);
      const { data, error } = await supabase
        .from("client_transactions")
        .select("*")
        .eq("client_id", clientId)
        .gte("occurred_on", from)
        .lt("occurred_on", to)
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clientId,
  });

export const budgetLimitsQuery = (clientId: string | undefined) =>
  queryOptions({
    queryKey: ["client-budget-limits", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("client_budget_limits")
        .select("*")
        .eq("client_id", clientId)
        .order("category");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clientId,
  });

export const loansQuery = (clientId: string | undefined) =>
  queryOptions({
    queryKey: ["client-loans", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("client_loans")
        .select("*")
        .eq("client_id", clientId)
        .order("monthly_payment", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clientId,
  });

export function useInvalidateFinance(clientId: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["client-transactions", clientId] });
    void qc.invalidateQueries({ queryKey: ["client-budget-limits", clientId] });
    void qc.invalidateQueries({ queryKey: ["client-loans", clientId] });
  };
}

export type MonthSummary = {
  income: number;
  expense: number;
  net: number;
  expenseByCategory: Record<string, number>;
};

export function summarizeMonth(rows: TransactionRow[]): MonthSummary {
  const s: MonthSummary = { income: 0, expense: 0, net: 0, expenseByCategory: {} };
  for (const r of rows) {
    const amount = Number(r.amount) || 0;
    if (r.kind === "income") {
      s.income += amount;
    } else {
      s.expense += amount;
      s.expenseByCategory[r.category] = (s.expenseByCategory[r.category] ?? 0) + amount;
    }
  }
  s.net = s.income - s.expense;
  return s;
}

// ---------- savings calculators (spec item 7: savings / wedding / pension) ----------

/**
 * Future value of an initial sum plus a fixed monthly deposit, compounded
 * monthly: FV = P(1+r)^n + PMT((1+r)^n - 1)/r  (r = monthly rate, n = months).
 */
export function futureValue(initial: number, monthlyDeposit: number, annualRatePct: number, years: number): number {
  const n = Math.max(0, Math.round(years * 12));
  const r = annualRatePct / 100 / 12;
  if (r === 0) return initial + monthlyDeposit * n;
  const growth = Math.pow(1 + r, n);
  return initial * growth + monthlyDeposit * ((growth - 1) / r);
}

export type SavingsPreset = {
  key: string;
  label: string;
  description: string;
  initial: number;
  monthlyDeposit: number;
  annualRatePct: number;
  years: number;
};

// Defaults are editable starting points, not promises: the 57 ₪ figure is the
// state child-savings deposit (חיסכון לכל ילד) with an equal parent top-up.
export const SAVINGS_PRESETS: SavingsPreset[] = [
  {
    key: "child",
    label: "חיסכון לכל ילד",
    description: "הפקדה ממשלתית 57 ₪ + הכפלה בהפקדת הורים 57 ₪, מלידה עד גיל 18",
    initial: 0,
    monthlyDeposit: 114,
    annualRatePct: 4,
    years: 18,
  },
  {
    key: "wedding",
    label: "קרן חתונה",
    description: "יעד חיסכון לחתונת ילד — הפקדה חודשית קבועה למשך 10 שנים",
    initial: 0,
    monthlyDeposit: 500,
    annualRatePct: 4,
    years: 10,
  },
  {
    key: "pension",
    label: "פנסיה (עד גיל 67)",
    description: "צבירה פנסיונית — צבירה קיימת + הפקדה חודשית עד גיל הפרישה",
    initial: 100000,
    monthlyDeposit: 1500,
    annualRatePct: 4,
    years: 25,
  },
  {
    key: "hishtalmut",
    label: "קרן השתלמות",
    description: "אפיק פטור ממס — הפקדה חודשית לתקופת ותק של 6 שנים",
    initial: 0,
    monthlyDeposit: 800,
    annualRatePct: 5,
    years: 6,
  },
];

// ---------- loans & home purchase (spec item 7: ניהול הלוואות / רכישת דירה / דירה להשקעה) ----------

export const LOAN_TYPES = {
  mortgage: "משכנתא",
  bank: "הלוואה בנקאית",
  credit_card: "אשראי / מסגרת",
  gmach: "גמ״ח",
  family: "משפחה וחברים",
  other: "אחר",
} as const;

export type LoansSummary = { count: number; totalBalance: number; totalMonthly: number };

export function summarizeLoans(rows: LoanRow[]): LoansSummary {
  const s: LoansSummary = { count: rows.length, totalBalance: 0, totalMonthly: 0 };
  for (const r of rows) {
    s.totalBalance += Number(r.balance) || 0;
    s.totalMonthly += Number(r.monthly_payment) || 0;
  }
  return s;
}

/**
 * Fixed monthly payment on an amortized loan (Spitzer schedule):
 * PMT = L·r / (1 - (1+r)^-n)  (r = monthly rate, n = months).
 */
export function loanMonthlyPayment(principal: number, annualRatePct: number, years: number): number {
  const n = Math.max(1, Math.round(years * 12));
  const r = annualRatePct / 100 / 12;
  if (principal <= 0) return 0;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

/**
 * Months until a balance is repaid at a fixed monthly payment:
 * n = -ln(1 - r·B/PMT) / ln(1+r). Returns null when the payment does not
 * even cover the interest (the loan never amortizes) or is not positive.
 */
export function monthsToPayoff(balance: number, annualRatePct: number, monthlyPayment: number): number | null {
  if (balance <= 0) return 0;
  if (monthlyPayment <= 0) return null;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return Math.ceil(balance / monthlyPayment);
  if (monthlyPayment <= balance * r) return null;
  return Math.ceil(-Math.log(1 - (r * balance) / monthlyPayment) / Math.log(1 + r));
}

// Bank-of-Israel LTV (loan-to-value) caps per buyer type. The payment-burden
// warning threshold mirrors the common bank practice of capping the total
// monthly repayments at ~40% of net income (the regulatory hard stop is 50%).
export const HOME_PURCHASE_MODES = {
  first: { label: "דירה ראשונה", maxLtv: 0.75 },
  replace: { label: "משפרי דיור", maxLtv: 0.7 },
  investment: { label: "דירה להשקעה", maxLtv: 0.5 },
} as const;

export type HomePurchaseModeKey = keyof typeof HOME_PURCHASE_MODES;

export const PAYMENT_BURDEN_WARN = 0.4;
export const PAYMENT_BURDEN_MAX = 0.5;

export type HomePurchasePlan = {
  loanNeeded: number;
  ltv: number; // 0..1 of the price the loan covers
  maxLtv: number;
  ltvOk: boolean;
  /** minimum equity the LTV cap requires; > equity when ltvOk is false */
  minEquity: number;
  monthlyPayment: number;
  /** (new payment + existing loan payments) / net income; null when income unknown */
  burden: number | null;
};

export function planHomePurchase(input: {
  mode: HomePurchaseModeKey;
  price: number;
  equity: number;
  annualRatePct: number;
  years: number;
  netIncome: number;
  existingMonthlyLoans: number;
}): HomePurchasePlan {
  const price = Math.max(0, input.price);
  const equity = Math.max(0, Math.min(input.equity, price));
  const maxLtv = HOME_PURCHASE_MODES[input.mode].maxLtv;
  const loanNeeded = price - equity;
  const ltv = price > 0 ? loanNeeded / price : 0;
  const monthlyPayment = loanNeeded > 0 ? loanMonthlyPayment(loanNeeded, input.annualRatePct, input.years) : 0;
  const totalMonthly = monthlyPayment + Math.max(0, input.existingMonthlyLoans);
  return {
    loanNeeded,
    ltv,
    maxLtv,
    ltvOk: ltv <= maxLtv + 1e-9,
    minEquity: price * (1 - maxLtv),
    monthlyPayment,
    burden: input.netIncome > 0 ? totalMonthly / input.netIncome : null,
  };
}
