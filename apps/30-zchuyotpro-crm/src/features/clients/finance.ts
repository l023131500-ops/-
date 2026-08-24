import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
export type TransactionRow = Tables["client_transactions"]["Row"];
export type BudgetLimitRow = Tables["client_budget_limits"]["Row"];

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

export function useInvalidateFinance(clientId: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["client-transactions", clientId] });
    void qc.invalidateQueries({ queryKey: ["client-budget-limits", clientId] });
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
