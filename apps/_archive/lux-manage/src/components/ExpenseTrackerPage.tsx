import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Minus, TrendingUp, Utensils, Home, HeartPulse,
  Car, Briefcase, GraduationCap, Gamepad2, MoreHorizontal, X, CreditCard, Pencil
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useFinancial, TransactionCategory, Transaction } from "@/contexts/FinancialContext";
import { useBudgetItems } from "@/hooks/useBudgetItems";
import BudgetItemsManager from "@/components/BudgetItemsManager";

const categoryIcons: Record<TransactionCategory, typeof Utensils> = {
  food: Utensils, housing: Home, health: HeartPulse, car: Car,
  business: Briefcase, education: GraduationCap, entertainment: Gamepad2, other: MoreHorizontal,
};

const categoryLabels: Record<TransactionCategory, string> = {
  food: "מזון", housing: "דיור", health: "בריאות", car: "רכב",
  business: "עסקים", education: "חינוך", entertainment: "בידור", other: "אחר",
};

type ViewMode = "daily" | "monthly" | "yearly";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

export default function ExpenseTrackerPage() {
  const { language } = useApp();
  const {
    transactions, addTransaction, updateTransaction, removeTransaction,
    getMonthlyExpenses, getMonthlyIncome, getCategorySpending,
    budgetLimits, getTotalInstallmentDebt,
  } = useFinancial();
  const { totalMonthlyIncome: budgetIncome, totalMonthlyExpenses: budgetExp } = useBudgetItems();

  const [activeTab, setActiveTab] = useState<"transactions" | "budget">("transactions");

  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [addType, setAddType] = useState<"expense" | "income">("expense");

  // Form state
  const [formAmount, setFormAmount] = useState("");
  const [formCategory, setFormCategory] = useState<TransactionCategory>("food");
  const [formDesc, setFormDesc] = useState("");
  const [formIsInstallment, setFormIsInstallment] = useState(false);
  const [formTotalMonths, setFormTotalMonths] = useState("3");

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();

  const monthlyExpenses = getMonthlyExpenses(year, month);
  const monthlyIncome = getMonthlyIncome(year, month);
  const totalExpenses = monthlyExpenses.reduce((s, t) => s + t.amount, 0);
  const totalIncome = monthlyIncome.reduce((s, t) => s + t.amount, 0);
  const categorySpending = getCategorySpending(year, month);
  const installmentDebt = getTotalInstallmentDebt();

  // Note: This page shows ONLY actual transactions, not profile fixed expenses.
  // Profile fixed expenses are shown separately in dashboard baseline.

  const viewModes: { key: ViewMode; label: string }[] = [
    { key: "daily", label: "יומי" },
    { key: "monthly", label: "חודשי" },
    { key: "yearly", label: "שנתי" },
  ];

  const getFilteredTransactions = (): Transaction[] => {
    if (viewMode === "daily") {
      const dateStr = selectedDate.toISOString().split("T")[0];
      return transactions.filter((t) => t.date === dateStr);
    } else if (viewMode === "monthly") {
      return transactions.filter((t) => {
        const d = new Date(t.date);
        return d.getFullYear() === year && d.getMonth() === month;
      });
    } else {
      return transactions.filter((t) => new Date(t.date).getFullYear() === year);
    }
  };

  const filteredTransactions = getFilteredTransactions().sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const openAddModal = (type: "expense" | "income") => {
    setAddType(type);
    setEditingTx(null);
    setFormAmount("");
    setFormCategory("food");
    setFormDesc("");
    setFormIsInstallment(false);
    setFormTotalMonths("3");
    setShowAddModal(true);
  };

  const openEditModal = (tx: Transaction) => {
    setEditingTx(tx);
    setAddType(tx.type);
    setFormAmount(String(tx.amount));
    setFormCategory(tx.category);
    setFormDesc(tx.description);
    setFormIsInstallment(tx.isInstallment);
    setFormTotalMonths(tx.installmentDetails ? String(tx.installmentDetails.totalMonths) : "3");
    setShowAddModal(true);
  };

  const handleSubmit = () => {
    if (!formAmount || parseFloat(formAmount) <= 0) return;
    const amount = parseFloat(formAmount);
    const monthlyAmount = formIsInstallment ? amount / parseInt(formTotalMonths) : amount;

    const txData = {
      type: addType,
      amount: formIsInstallment ? monthlyAmount : amount,
      category: formCategory,
      description: formDesc || categoryLabels[formCategory],
      date: selectedDate.toISOString().split("T")[0],
      isRecurring: false,
      isInstallment: formIsInstallment,
      ...(formIsInstallment
        ? {
            installmentDetails: {
              totalAmount: amount,
              totalMonths: parseInt(formTotalMonths),
              currentMonth: 1,
              monthlyAmount,
              startDate: selectedDate.toISOString().split("T")[0],
            },
          }
        : {}),
    };

    if (editingTx) {
      updateTransaction(editingTx.id, txData);
    } else {
      addTransaction(txData);
    }
    setFormAmount("");
    setFormDesc("");
    setFormIsInstallment(false);
    setEditingTx(null);
    setShowAddModal(false);
  };

  const navigateMonth = (dir: number) => {
    const d = new Date(selectedDate);
    if (viewMode === "daily") d.setDate(d.getDate() + dir);
    else if (viewMode === "monthly") d.setMonth(d.getMonth() + dir);
    else d.setFullYear(d.getFullYear() + dir);
    setSelectedDate(d);
  };

  const dateLabel = () => {
    if (viewMode === "daily") return selectedDate.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" });
    if (viewMode === "monthly") return selectedDate.toLocaleDateString("he-IL", { month: "long", year: "numeric" });
    return selectedDate.getFullYear().toString();
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">הוצאות והכנסות</h1>
          <p className="text-sm text-muted-foreground">מעקב פיננסי חכם — תקציב בסיס מ-DB + תנועות שוטפות</p>
        </div>
      </motion.div>

      {/* Main Tabs: Budget vs Transactions */}
      <motion.div variants={itemVariants}>
        <div className="flex rounded-xl bg-secondary p-1 gap-1 mb-6">
          <button onClick={() => setActiveTab("budget")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "budget" ? "gold-gradient text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"}`}>
            💰 תקציב קבוע (הכנסות והוצאות)
          </button>
          <button onClick={() => setActiveTab("transactions")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "transactions" ? "gold-gradient text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"}`}>
            📝 תנועות שוטפות
          </button>
        </div>
      </motion.div>

      {activeTab === "budget" ? (
        <BudgetItemsManager />
      ) : (
      <>
      {/* Transaction actions */}
      <motion.div variants={itemVariants} className="flex gap-2">
        <button onClick={() => openAddModal("expense")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-destructive/10 text-destructive border border-border/50 transition-all hover:scale-[1.02] active:scale-[0.98]">
          <Minus className="w-4 h-4" /> הוסף הוצאה
        </button>
        <button onClick={() => openAddModal("income")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-accent/10 gold-text border border-border/50 transition-all hover:scale-[1.02] active:scale-[0.98]">
          <Plus className="w-4 h-4" /> הוסף הכנסה
        </button>
      </motion.div>

      {/* View Mode Tabs */}
      <motion.div variants={itemVariants} className="flex items-center gap-4">
        <div className="flex rounded-xl bg-secondary p-1 gap-1">
          {viewModes.map((v) => (
            <button key={v.key} onClick={() => setViewMode(v.key)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === v.key ? "gold-gradient text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
              }`}>
              {v.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigateMonth(-1)} className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground">‹</button>
          <span className="text-sm font-bold text-foreground min-w-[140px] text-center">{dateLabel()}</span>
          <button onClick={() => navigateMonth(1)} className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground">›</button>
        </div>
      </motion.div>

      {/* Summary Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bento-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 gold-text" />
            <span className="text-xs text-muted-foreground">הכנסות</span>
          </div>
          <p className="text-2xl font-extrabold text-foreground">₪{totalIncome.toLocaleString()}</p>
        </div>
        <div className="bento-card">
          <div className="flex items-center gap-2 mb-2">
            <Minus className="w-4 h-4 text-destructive" />
            <span className="text-xs text-muted-foreground">הוצאות</span>
          </div>
          <p className="text-2xl font-extrabold text-foreground">₪{totalExpenses.toLocaleString()}</p>
        </div>
        <div className="bento-card">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4 gold-text" />
            <span className="text-xs text-muted-foreground">חוב תשלומים</span>
          </div>
          <p className="text-2xl font-extrabold text-foreground">₪{installmentDebt.toLocaleString()}</p>
        </div>
      </motion.div>

      {/* Category Breakdown */}
      <motion.div variants={itemVariants}>
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">הוצאות לפי קטגוריה</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(Object.keys(categorySpending) as TransactionCategory[]).map((cat) => {
            const Icon = categoryIcons[cat];
            const spent = categorySpending[cat];
            const limit = budgetLimits.find((b) => b.category === cat)?.limit || 0;
            const pct = limit > 0 ? (spent / limit) * 100 : 0;
            const isOverBudget = pct >= 80;

            return (
              <div key={cat} className={`bento-card transition-all ${isOverBudget ? "animate-pulse-subtle ring-1 ring-destructive/30" : ""}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 gold-text" />
                  <span className="text-xs font-medium text-foreground">{categoryLabels[cat]}</span>
                </div>
                <p className="text-lg font-extrabold text-foreground">₪{spent.toLocaleString()}</p>
                {limit > 0 && (
                  <div className="mt-2">
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>{Math.round(pct)}%</span>
                      <span>₪{limit.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(pct, 100)}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" as const }}
                        className={`h-full rounded-full ${pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-amber-500" : "gold-gradient"}`}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Transaction List */}
      <motion.div variants={itemVariants}>
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">תנועות</h2>
        <div className="space-y-2">
          {filteredTransactions.length === 0 && (
            <div className="bento-card text-center py-8">
              <p className="text-sm text-muted-foreground">אין תנועות</p>
            </div>
          )}
          <AnimatePresence>
            {filteredTransactions.map((tx) => {
              const Icon = categoryIcons[tx.category];
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="bento-card flex items-center justify-between group !py-3 !px-4"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${tx.type === "income" ? "bg-accent/10" : "bg-destructive/10"}`}>
                      <Icon className={`w-4 h-4 ${tx.type === "income" ? "gold-text" : "text-destructive"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{tx.description}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(tx.date).toLocaleDateString("he-IL")}
                        {tx.isInstallment && tx.installmentDetails && (
                          <span className="mx-1">· {tx.installmentDetails.currentMonth}/{tx.installmentDetails.totalMonths} תשלומים</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-extrabold ${tx.type === "income" ? "gold-text" : "text-destructive"}`}>
                      {tx.type === "income" ? "+" : "-"}₪{tx.amount.toLocaleString()}
                    </span>
                    <button onClick={() => openEditModal(tx)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-secondary transition-all">
                      <Pencil className="w-3 h-3 text-muted-foreground" />
                    </button>
                    <button onClick={() => removeTransaction(tx.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 transition-all">
                      <X className="w-3 h-3 text-destructive" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Add/Edit Transaction Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => { setShowAddModal(false); setEditingTx(null); }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()} className="bento-card w-full max-w-md space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">
                  {editingTx ? "עריכת תנועה" : addType === "expense" ? "הוסף הוצאה" : "הוסף הכנסה"}
                </h3>
                <button onClick={() => { setShowAddModal(false); setEditingTx(null); }} className="p-1 rounded-md hover:bg-secondary">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">סכום (₪)</label>
                  <input type="number" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="0"
                    className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">קטגוריה</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(Object.keys(categoryIcons) as TransactionCategory[]).map((cat) => {
                      const Icon = categoryIcons[cat];
                      return (
                        <button key={cat} onClick={() => setFormCategory(cat)}
                          className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-medium transition-all ${
                            formCategory === cat ? "gold-gradient text-primary-foreground shadow-md" : "bg-secondary text-muted-foreground hover:text-foreground"
                          }`}>
                          <Icon className="w-4 h-4" />
                          {categoryLabels[cat]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">תיאור</label>
                  <input type="text" value={formDesc} onChange={(e) => setFormDesc(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>

                {addType === "expense" && (
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formIsInstallment} onChange={(e) => setFormIsInstallment(e.target.checked)}
                        className="w-4 h-4 rounded border-border accent-accent" />
                      <span className="text-xs font-medium text-foreground">תשלומים</span>
                    </label>
                    {formIsInstallment && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}>
                        <label className="text-xs font-bold text-muted-foreground mb-1 block">מספר תשלומים</label>
                        <input type="number" value={formTotalMonths} onChange={(e) => setFormTotalMonths(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                        {formAmount && (
                          <p className="text-xs text-muted-foreground mt-1">
                            תשלום חודשי: ₪{(parseFloat(formAmount) / parseInt(formTotalMonths || "1")).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              <button onClick={handleSubmit}
                className="w-full py-3 rounded-xl gold-gradient text-primary-foreground font-semibold text-sm transition-all hover:shadow-lg active:scale-[0.98]">
                {editingTx ? "עדכן" : "שמור"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </>
      )}
    </motion.div>
  );
}
