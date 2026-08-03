import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, TrendingDown, CreditCard, Calendar, Shield } from "lucide-react";
import { useFinancial, TransactionCategory } from "@/contexts/FinancialContext";
import { useApp } from "@/contexts/AppContext";

interface BudgetAlert {
  id: string;
  type: "budget_warning" | "cashflow_warning" | "rights_prompt";
  category?: TransactionCategory;
  title: string;
  message: string;
  severity: "warning" | "danger" | "info";
  icon: typeof AlertTriangle;
}

const categoryLabels: Record<TransactionCategory, string> = {
  food: "מזון",
  housing: "דיור",
  health: "בריאות",
  car: "רכב",
  business: "עסקי",
  education: "חינוך",
  entertainment: "בילויים",
  other: "אחר",
};

export default function BudgetGuard() {
  const { budgetLimits, getCategorySpending, transactions, getProjectedMonthlyCharges } = useFinancial();
  const { profile } = useApp();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [hasShownRightsPrompt, setHasShownRightsPrompt] = useState(false);

  const now = new Date();
  const alerts = useMemo(() => {
    const result: BudgetAlert[] = [];
    const spending = getCategorySpending(now.getFullYear(), now.getMonth());

    // Check each category against budget
    budgetLimits.forEach((bl) => {
      const spent = spending[bl.category] || 0;
      const ratio = bl.limit > 0 ? spent / bl.limit : 0;
      const remaining = bl.limit - spent;

      if (ratio >= 0.9) {
        result.push({
          id: `budget-${bl.category}`,
          type: "budget_warning",
          category: bl.category,
          title: ratio >= 1 ? `חריגה בקטגוריית ${categoryLabels[bl.category]}!` : `שים לב: חריגה צפויה בקטגוריית ${categoryLabels[bl.category]}`,
          message: ratio >= 1
            ? `חרגת ב-₪${Math.abs(remaining).toLocaleString()} מהתקציב החודשי. הגבול: ₪${bl.limit.toLocaleString()}`
            : `נותרו ₪${remaining.toLocaleString()} עד סוף החודש. ניצלת ${Math.round(ratio * 100)}% מהתקציב.`,
          severity: ratio >= 1 ? "danger" : "warning",
          icon: TrendingDown,
        });
      }
    });

    // Cashflow warning - check next 2 weeks for high-expense dates
    const projected = getProjectedMonthlyCharges(2);
    if (projected.length >= 2) {
      const nextMonth = projected[1];
      const currentMonth = projected[0];
      if (nextMonth.amount > currentMonth.amount * 1.3) {
        result.push({
          id: "cashflow-warning",
          type: "cashflow_warning",
          title: "אזהרת תזרים מזומנים",
          message: `החודש הבא צפוי להיות יקר יותר ב-₪${(nextMonth.amount - currentMonth.amount).toLocaleString()}. ודא שיש מספיק כיסוי.`,
          severity: "warning",
          icon: CreditCard,
        });
      }
    }

    // Installment debt warning
    const installmentExpenses = transactions.filter(
      (t) => t.isInstallment && t.installmentDetails
    );
    const totalMonthlyInstallments = installmentExpenses.reduce(
      (sum, t) => sum + (t.installmentDetails?.monthlyAmount || 0), 0
    );
    const monthlyIncome = transactions
      .filter((t) => { const d = new Date(t.date); return t.type === "income" && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); })
      .reduce((s, t) => s + t.amount, 0);

    if (monthlyIncome > 0 && totalMonthlyInstallments / monthlyIncome > 0.3) {
      result.push({
        id: "installment-warning",
        type: "cashflow_warning",
        title: "עומס תשלומים בתשלומים",
        message: `התשלומים החודשיים שלך (₪${totalMonthlyInstallments.toLocaleString()}) מהווים ${Math.round((totalMonthlyInstallments / monthlyIncome) * 100)}% מההכנסה. מומלץ לבדוק.`,
        severity: "warning",
        icon: Calendar,
      });
    }

    return result;
  }, [budgetLimits, getCategorySpending, transactions, getProjectedMonthlyCharges, now]);

  // Rights prompt - show after 3 seconds if applicable
  const [rightsPrompt, setRightsPrompt] = useState<BudgetAlert | null>(null);
  useEffect(() => {
    if (hasShownRightsPrompt) return;
    const timer = setTimeout(() => {
      // Check if arnona not tracked this month
      const arnonaExpenses = transactions.filter((t) => {
        const d = new Date(t.date);
        return t.description.includes("ארנונה") && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      if (arnonaExpenses.length === 0 && profile.childrenCount >= 3) {
        setRightsPrompt({
          id: "rights-arnona",
          type: "rights_prompt",
          title: `שלום ${profile.name}`,
          message: `שמתי לב שלא עדכנת הוצאות ארנונה החודש. עם ${profile.childrenCount} ילדים, ייתכן שאתה זכאי להנחה של עד 40%. האם תרצה שאבדוק עבורך?`,
          severity: "info",
          icon: Shield,
        });
        setHasShownRightsPrompt(true);
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [hasShownRightsPrompt, transactions, profile, now]);

  const visibleAlerts = [...alerts, ...(rightsPrompt ? [rightsPrompt] : [])].filter(
    (a) => !dismissed.has(a.id)
  );

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="fixed top-16 start-4 z-40 w-[380px] max-w-[calc(100vw-5rem)] space-y-2">
      <AnimatePresence>
        {visibleAlerts.slice(0, 3).map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: -30, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -30, scale: 0.95 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className={`rounded-xl p-4 shadow-xl backdrop-blur-xl border ${
              alert.severity === "danger"
                ? "bg-destructive/10 border-destructive/30"
                : alert.severity === "warning"
                ? "bg-amber-500/10 border-amber-500/30"
                : "bg-accent/10 border-accent/30"
            }`}
            style={{ background: "hsl(var(--card) / 0.95)", backdropFilter: "blur(20px)" }}
          >
            <div className="flex items-start gap-3">
              <div className={`p-1.5 rounded-lg shrink-0 ${
                alert.severity === "danger" ? "bg-destructive/15" :
                alert.severity === "warning" ? "bg-amber-500/15" : "bg-accent/15"
              }`}>
                <alert.icon className={`w-4 h-4 ${
                  alert.severity === "danger" ? "text-destructive" :
                  alert.severity === "warning" ? "text-amber-600" : "gold-text"
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">{alert.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{alert.message}</p>
                {alert.type === "rights_prompt" && (
                  <div className="flex gap-2 mt-2">
                    <button className="px-3 py-1 rounded-lg text-[10px] font-medium gold-gradient text-white hover:opacity-90 transition-opacity">
                      כן, בדוק עבורי
                    </button>
                    <button
                      onClick={() => setDismissed((prev) => new Set(prev).add(alert.id))}
                      className="px-3 py-1 rounded-lg text-[10px] font-medium bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    >
                      לא עכשיו
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => setDismissed((prev) => new Set(prev).add(alert.id))}
                className="p-1 rounded-md hover:bg-secondary transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
