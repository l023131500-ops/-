import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";

export interface BudgetItem {
  id: string;
  type: "income" | "expense";
  category: "fixed_monthly" | "one_time" | "yearly" | "weekly" | "daily";
  subcategory: string;
  description: string;
  amount: number;
  is_business: boolean;
  due_month: number | null;
  due_date: string | null;
  is_active: boolean;
  created_at: string;
  start_date: string | null;
  duration_months: number | null;
  end_date: string | null;
  payment_method: string;
  installments: number;
}

function mapRow(row: any): BudgetItem {
  return {
    id: row.id,
    type: row.type as "income" | "expense",
    category: row.category || "fixed_monthly",
    subcategory: row.subcategory || "",
    description: row.description || "",
    amount: Number(row.amount) || 0,
    is_business: row.is_business ?? false,
    due_month: row.due_month ?? null,
    due_date: row.due_date ?? null,
    is_active: row.is_active ?? true,
    created_at: row.created_at,
    start_date: row.start_date ?? null,
    duration_months: row.duration_months ?? null,
    end_date: row.end_date ?? null,
    payment_method: row.payment_method || "credit_card",
    installments: row.installments ?? 1,
  };
}

export const SUBCATEGORIES_FIXED = {
  expense: [
    "שכר דירה", "משכנתא", "ארנונה", "מים", "חשמל", "גז", "ועד בית",
    "קופת חולים", "ביטוח בריאות", "ביטוח רכב", "ביטוח חיים", "ביטוח דירה",
    "חינוך", "גן ילדים", "חוגים", "תחבורה", "דלק",
    "טלפון ואינטרנט", "נטפליקס/סטרימינג",
    "הלוואה", "כרטיס אשראי", "מזונות", "תשלומים", "אחר",
  ],
  income: [
    "משכורת", "משכורת בן/בת זוג", "קצבת ילדים", "קצבת נכות",
    "דמי אבטלה", "מזונות", "דיבידנדים", "הכנסה מנכס",
    "הכנסה פסיבית", "מענק עבודה", "בונוס", "אחר",
  ],
};

export const SUBCATEGORIES_ONE_TIME = {
  expense: [
    "מסעדה", "קניות", "מתנה", "טיול", "ריהוט", "מכשיר חשמלי",
    "תיקון / אחזקה", "רפואה / שיניים", "ביגוד", "אירוע", "אחר",
  ],
  income: [
    "מענק חד פעמי", "מתנה", "החזר מס", "מכירת נכס", "בונוס",
    "ירושה", "אחר",
  ],
};

// Keep backward compat alias
export const SUBCATEGORIES = SUBCATEGORIES_FIXED;

export const PAYMENT_METHODS = [
  { value: "credit_card", label: "כרטיס אשראי" },
  { value: "cash", label: "מזומן" },
  { value: "bank_transfer", label: "העברה בנקאית" },
  { value: "check", label: "שיק" },
  { value: "standing_order", label: "הוראת קבע" },
];

export function useBudgetItems() {
  const { userId, mode } = useApp();
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setItems([]); setLoading(false); return; }
    setLoading(true);

    const load = async () => {
      const { data } = await supabase
        .from("budget_items")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      setItems((data || []).map(mapRow));
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`budget-items-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "budget_items", filter: `user_id=eq.${userId}` }, (payload) => {
        if (payload.eventType === "INSERT") setItems(prev => [mapRow(payload.new), ...prev]);
        else if (payload.eventType === "UPDATE") setItems(prev => prev.map(i => i.id === payload.new.id ? mapRow(payload.new) : i));
        else if (payload.eventType === "DELETE") setItems(prev => prev.filter(i => i.id !== payload.old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const isBusiness = mode === "business";

  const addItem = useCallback(async (item: Omit<BudgetItem, "id" | "created_at">) => {
    if (!userId) return;
    const insertData: any = {
      user_id: userId,
      type: item.type,
      category: item.category,
      subcategory: item.subcategory,
      description: item.description,
      amount: item.amount,
      is_business: item.is_business,
      due_month: item.due_month,
      due_date: item.due_date,
      is_active: item.is_active,
      payment_method: item.payment_method || "credit_card",
      installments: item.installments || 1,
    };
    if (item.start_date) insertData.start_date = item.start_date;
    if (item.duration_months) insertData.duration_months = item.duration_months;
    if (item.end_date) insertData.end_date = item.end_date;
    await supabase.from("budget_items").insert(insertData);
  }, [userId]);

  const updateItem = useCallback(async (id: string, updates: Partial<BudgetItem>) => {
    const dbUpdates: any = {};
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.subcategory !== undefined) dbUpdates.subcategory = updates.subcategory;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.is_business !== undefined) dbUpdates.is_business = updates.is_business;
    if (updates.due_month !== undefined) dbUpdates.due_month = updates.due_month;
    if (updates.due_date !== undefined) dbUpdates.due_date = updates.due_date;
    if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;
    if (updates.start_date !== undefined) dbUpdates.start_date = updates.start_date;
    if (updates.duration_months !== undefined) dbUpdates.duration_months = updates.duration_months;
    if (updates.end_date !== undefined) dbUpdates.end_date = updates.end_date;
    if (updates.payment_method !== undefined) dbUpdates.payment_method = updates.payment_method;
    if (updates.installments !== undefined) dbUpdates.installments = updates.installments;
    dbUpdates.updated_at = new Date().toISOString();
    await supabase.from("budget_items").update(dbUpdates).eq("id", id);
  }, []);

  const removeItem = useCallback(async (id: string) => {
    await supabase.from("budget_items").delete().eq("id", id);
  }, []);

  // Filter by business/personal + check if still active (end_date)
  const now = new Date();
  const activeItems = items.filter(i => {
    if (!i.is_active) return false;
    if (i.is_business !== isBusiness) return false;
    if (i.end_date && new Date(i.end_date) < now) return false;
    return true;
  });

  // Calculations
  const fixedMonthlyIncome = activeItems
    .filter(i => i.type === "income" && i.category === "fixed_monthly")
    .reduce((s, i) => s + i.amount, 0);

  const fixedMonthlyExpenses = activeItems
    .filter(i => i.type === "expense" && i.category === "fixed_monthly")
    .reduce((s, i) => s + i.amount, 0);

  const yearlyExpensesMonthly = activeItems
    .filter(i => i.type === "expense" && i.category === "yearly")
    .reduce((s, i) => s + i.amount / 12, 0);

  const yearlyIncomeMonthly = activeItems
    .filter(i => i.type === "income" && i.category === "yearly")
    .reduce((s, i) => s + i.amount / 12, 0);

  const weeklyExpensesMonthly = activeItems
    .filter(i => i.type === "expense" && i.category === "weekly")
    .reduce((s, i) => s + i.amount * 4.33, 0);

  const dailyExpensesMonthly = activeItems
    .filter(i => i.type === "expense" && i.category === "daily")
    .reduce((s, i) => s + i.amount * 30, 0);

  const oneTimeExpenses = activeItems
    .filter(i => i.type === "expense" && i.category === "one_time")
    .reduce((s, i) => s + i.amount, 0);

  const oneTimeIncome = activeItems
    .filter(i => i.type === "income" && i.category === "one_time")
    .reduce((s, i) => s + i.amount, 0);

  const totalMonthlyIncome = fixedMonthlyIncome + yearlyIncomeMonthly;
  const totalMonthlyExpenses = fixedMonthlyExpenses + yearlyExpensesMonthly + weeklyExpensesMonthly + dailyExpensesMonthly;
  const monthlyBalance = totalMonthlyIncome - totalMonthlyExpenses;

  return {
    items, activeItems, loading,
    addItem, updateItem, removeItem,
    fixedMonthlyIncome, fixedMonthlyExpenses,
    yearlyExpensesMonthly, yearlyIncomeMonthly,
    weeklyExpensesMonthly, dailyExpensesMonthly,
    oneTimeExpenses, oneTimeIncome,
    totalMonthlyIncome, totalMonthlyExpenses, monthlyBalance,
  };
}
