import { useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { TrendingUp, AlertTriangle, CheckCircle, Activity } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useFinancial, TransactionCategory } from "@/contexts/FinancialContext";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

const categoryLabels: Record<TransactionCategory, Record<string, string>> = {
  food: { en: "Food", he: "מזון" },
  housing: { en: "Housing", he: "דיור" },
  health: { en: "Health", he: "בריאות" },
  car: { en: "Car", he: "רכב" },
  business: { en: "Business", he: "עסקים" },
  education: { en: "Education", he: "חינוך" },
  entertainment: { en: "Entertainment", he: "בידור" },
  other: { en: "Other", he: "אחר" },
};

export default function FinancialHealthPage() {
  const { language, profile } = useApp();
  const { getProjectedMonthlyCharges, getCategorySpending, budgetLimits, transactions } = useFinancial();

  const projectedCharges = useMemo(() => getProjectedMonthlyCharges(12), [getProjectedMonthlyCharges]);

  const now = new Date();
  const categorySpending = getCategorySpending(now.getFullYear(), now.getMonth());

  // Budget alerts
  const alerts = useMemo(() => {
    return budgetLimits
      .map((bl) => {
        const spent = categorySpending[bl.category];
        const pct = bl.limit > 0 ? (spent / bl.limit) * 100 : 0;
        return { ...bl, spent, pct };
      })
      .filter((a) => a.pct >= 80)
      .sort((a, b) => b.pct - a.pct);
  }, [budgetLimits, categorySpending]);

  // Monthly income vs expenses for bar chart
  const monthlyComparison = useMemo(() => {
    const data: { month: string; income: number; expenses: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const y = d.getFullYear();
      const m = d.getMonth();
      const monthLabel = d.toLocaleDateString(language === "he" ? "he-IL" : "en-US", { month: "short" });

      const monthIncome = transactions
        .filter((t) => { const td = new Date(t.date); return t.type === "income" && td.getFullYear() === y && td.getMonth() === m; })
        .reduce((s, t) => s + t.amount, 0);
      const monthExpenses = transactions
        .filter((t) => { const td = new Date(t.date); return t.type === "expense" && td.getFullYear() === y && td.getMonth() === m; })
        .reduce((s, t) => s + t.amount, 0);

      data.push({ month: monthLabel, income: monthIncome, expenses: monthExpenses });
    }
    return data;
  }, [transactions, language]);

  // Health score
  const totalIncome = transactions
    .filter((t) => { const d = new Date(t.date); return t.type === "income" && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); })
    .reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions
    .filter((t) => { const d = new Date(t.date); return t.type === "expense" && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); })
    .reduce((s, t) => s + t.amount, 0);
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  const healthScore = Math.min(100, Math.max(0, Math.round(
    (savingsRate > 20 ? 40 : savingsRate * 2) +
    (alerts.length === 0 ? 30 : Math.max(0, 30 - alerts.length * 10)) +
    30
  )));

  const healthColor = healthScore >= 70 ? "gold-text" : healthScore >= 40 ? "text-amber-500" : "text-destructive";

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
          {language === "he" ? "בריאות פיננסית" : "Financial Health"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {language === "he" ? "ניתוח ותחזיות פיננסיות" : "Analysis & Financial Projections"}
        </p>
      </motion.div>

      {/* Health Score + Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Health Score */}
        <motion.div variants={itemVariants} className="glass-card-gold rounded-xl p-6 flex flex-col items-center justify-center text-center">
          <Activity className={`w-8 h-8 mb-3 ${healthColor}`} />
          <p className={`text-5xl font-bold ${healthColor}`}>{healthScore}</p>
          <p className="text-xs text-muted-foreground mt-1">{language === "he" ? "ציון בריאות" : "Health Score"}</p>
          <p className="text-[10px] text-muted-foreground mt-2">
            {language === "he" ? `שיעור חיסכון: ${savingsRate.toFixed(1)}%` : `Savings rate: ${savingsRate.toFixed(1)}%`}
          </p>
        </motion.div>

        {/* Budget Alerts */}
        <motion.div variants={itemVariants} className="glass-card-gold rounded-xl p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {language === "he" ? "התראות תקציב" : "Budget Alerts"}
            </span>
          </div>
          {alerts.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <CheckCircle className="w-4 h-4 gold-text" />
              {language === "he" ? "כל הקטגוריות בתקציב" : "All categories within budget"}
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.category}
                  className={`flex items-center justify-between p-3 rounded-lg transition-all duration-300 ${alert.pct >= 100 ? "bg-destructive/10 animate-pulse" : "bg-amber-500/5"}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${alert.pct >= 100 ? "bg-destructive" : "bg-amber-500"}`} />
                    <span className="text-sm font-medium text-foreground">{categoryLabels[alert.category][language]}</span>
                  </div>
                  <div className="text-end">
                    <span className={`text-sm font-bold ${alert.pct >= 100 ? "text-destructive" : "text-amber-500"}`}>
                      {Math.round(alert.pct)}%
                    </span>
                    <p className="text-[10px] text-muted-foreground">
                      ₪{alert.spent.toLocaleString()} / ₪{alert.limit.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Future Cash Flow Chart */}
      <motion.div variants={itemVariants} className="glass-card-gold rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 gold-text" />
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {language === "he" ? "תחזית תזרים מזומנים - 12 חודשים" : "Cash Flow Projection - 12 Months"}
          </span>
        </div>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projectedCharges}>
              <defs>
                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(40, 55%, 58%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(40, 55%, 58%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(215, 12%, 50%)" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(215, 12%, 50%)" }} tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(0, 0%, 100%)",
                  border: "1px solid hsl(40, 55%, 58%, 0.2)",
                  borderRadius: "12px",
                  boxShadow: "0 8px 32px hsl(40, 55%, 58%, 0.08)",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [`₪${value.toLocaleString()}`, language === "he" ? "הוצאות צפויות" : "Projected Expenses"]}
              />
              <Area type="monotone" dataKey="amount" stroke="hsl(40, 55%, 58%)" fill="url(#goldGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Income vs Expenses Bar Chart */}
      <motion.div variants={itemVariants} className="glass-card-gold rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 gold-text" />
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {language === "he" ? "הכנסות מול הוצאות" : "Income vs Expenses"}
          </span>
        </div>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(215, 12%, 50%)" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(215, 12%, 50%)" }} tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(0, 0%, 100%)",
                  border: "1px solid hsl(40, 55%, 58%, 0.2)",
                  borderRadius: "12px",
                  boxShadow: "0 8px 32px hsl(40, 55%, 58%, 0.08)",
                  fontSize: "12px",
                }}
                formatter={(value: number, name: string) => [
                  `₪${value.toLocaleString()}`,
                  name === "income" ? (language === "he" ? "הכנסות" : "Income") : (language === "he" ? "הוצאות" : "Expenses"),
                ]}
              />
              <Bar dataKey="income" fill="hsl(40, 55%, 58%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </motion.div>
  );
}
