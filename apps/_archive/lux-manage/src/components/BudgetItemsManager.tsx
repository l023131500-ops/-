import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Pencil, Trash2, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { useBudgetItems, BudgetItem, SUBCATEGORIES } from "@/hooks/useBudgetItems";
import { useApp } from "@/contexts/AppContext";
import { Input } from "@/components/ui/input";

const CATEGORIES = [
  { value: "fixed_monthly", label: "חודשי קבוע" },
  { value: "yearly", label: "שנתי" },
  { value: "weekly", label: "שבועי" },
  { value: "daily", label: "יומי" },
  { value: "one_time", label: "חד פעמי" },
];

export default function BudgetItemsManager() {
  const { mode } = useApp();
  const {
    activeItems, addItem, updateItem, removeItem,
    totalMonthlyIncome, totalMonthlyExpenses, monthlyBalance,
    loading,
  } = useBudgetItems();

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [formType, setFormType] = useState<"income" | "expense">("expense");
  const [formCategory, setFormCategory] = useState("fixed_monthly");
  const [formSubcategory, setFormSubcategory] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDueMonth, setFormDueMonth] = useState("");

  const isBusiness = mode === "business";

  const openAdd = (type: "income" | "expense") => {
    setEditingItem(null);
    setFormType(type);
    setFormCategory("fixed_monthly");
    setFormSubcategory("");
    setFormDescription("");
    setFormAmount("");
    setFormDueMonth("");
    setShowModal(true);
  };

  const openEdit = (item: BudgetItem) => {
    setEditingItem(item);
    setFormType(item.type);
    setFormCategory(item.category);
    setFormSubcategory(item.subcategory);
    setFormDescription(item.description);
    setFormAmount(String(item.amount));
    setFormDueMonth(item.due_month ? String(item.due_month) : "");
    setShowModal(true);
  };

  const handleSubmit = async () => {
    const amount = parseFloat(formAmount);
    if (!amount || amount <= 0) return;

    const data = {
      type: formType as "income" | "expense",
      category: formCategory as BudgetItem["category"],
      subcategory: formSubcategory,
      description: formDescription || formSubcategory,
      amount,
      is_business: isBusiness,
      due_month: formDueMonth ? parseInt(formDueMonth) : null,
      due_date: null as string | null,
      is_active: true,
      start_date: null as string | null,
      duration_months: null as number | null,
      end_date: null as string | null,
      payment_method: "credit_card",
      installments: 1,
    };

    if (editingItem) {
      await updateItem(editingItem.id, data);
    } else {
      await addItem(data);
    }
    setShowModal(false);
    setEditingItem(null);
  };

  const incomeItems = activeItems.filter(i => i.type === "income");
  const expenseItems = activeItems.filter(i => i.type === "expense");

  const getCategoryLabel = (cat: string) => CATEGORIES.find(c => c.value === cat)?.label || cat;

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-secondary/40 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bento-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 gold-text" />
            <span className="text-xs text-muted-foreground">סה״כ הכנסה חודשית</span>
          </div>
          <p className="text-2xl font-extrabold text-foreground">₪{Math.round(totalMonthlyIncome).toLocaleString()}</p>
        </div>
        <div className="bento-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-destructive" />
            <span className="text-xs text-muted-foreground">סה״כ הוצאה חודשית</span>
          </div>
          <p className="text-2xl font-extrabold text-foreground">₪{Math.round(totalMonthlyExpenses).toLocaleString()}</p>
        </div>
        <div className="bento-card">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 gold-text" />
            <span className="text-xs text-muted-foreground">יתרה חודשית</span>
          </div>
          <p className={`text-2xl font-extrabold ${monthlyBalance >= 0 ? "text-emerald-400" : "text-destructive"}`}>
            ₪{Math.round(monthlyBalance).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button onClick={() => openAdd("income")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-accent/10 gold-text border border-accent/20 hover:bg-accent/20 transition-all">
          <Plus className="w-4 h-4" /> הוסף הכנסה קבועה
        </button>
        <button onClick={() => openAdd("expense")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-all">
          <Plus className="w-4 h-4" /> הוסף הוצאה קבועה
        </button>
      </div>

      {/* Income Items */}
      {incomeItems.length > 0 && (
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">הכנסות קבועות</h3>
          <div className="space-y-2">
            {incomeItems.map(item => (
              <div key={item.id} className="bento-card flex items-center justify-between !py-3 !px-4 group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-accent/10">
                    <TrendingUp className="w-4 h-4 gold-text" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{item.subcategory || item.description}</p>
                    <p className="text-[10px] text-muted-foreground">{getCategoryLabel(item.category)}{item.description && item.description !== item.subcategory ? ` · ${item.description}` : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold gold-text">+₪{item.amount.toLocaleString()}</span>
                  <button onClick={() => openEdit(item)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-secondary transition-all">
                    <Pencil className="w-3 h-3 text-muted-foreground" />
                  </button>
                  <button onClick={() => removeItem(item.id)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 transition-all">
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expense Items */}
      {expenseItems.length > 0 && (
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">הוצאות קבועות</h3>
          <div className="space-y-2">
            {expenseItems.map(item => (
              <div key={item.id} className="bento-card flex items-center justify-between !py-3 !px-4 group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-destructive/10">
                    <TrendingDown className="w-4 h-4 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{item.subcategory || item.description}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {getCategoryLabel(item.category)}
                      {item.due_month ? ` · חודש ${item.due_month}` : ""}
                      {item.description && item.description !== item.subcategory ? ` · ${item.description}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-destructive">-₪{item.amount.toLocaleString()}</span>
                  <button onClick={() => openEdit(item)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-secondary transition-all">
                    <Pencil className="w-3 h-3 text-muted-foreground" />
                  </button>
                  <button onClick={() => removeItem(item.id)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 transition-all">
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeItems.length === 0 && (
        <div className="bento-card text-center py-12">
          <DollarSign className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm font-bold text-foreground mb-1">אין פריטי תקציב עדיין</p>
          <p className="text-xs text-muted-foreground">הוסף הכנסות והוצאות קבועות כדי לבנות את התקציב שלך</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()} className="bento-card w-full max-w-md space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">
                  {editingItem ? "עריכת פריט" : formType === "income" ? "הוסף הכנסה" : "הוסף הוצאה"}
                </h3>
                <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>

              <div className="space-y-4">
                {/* Type toggle */}
                <div className="flex rounded-xl bg-secondary p-1 gap-1">
                  <button onClick={() => setFormType("income")}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${formType === "income" ? "gold-gradient text-primary-foreground" : "text-muted-foreground"}`}>
                    הכנסה
                  </button>
                  <button onClick={() => setFormType("expense")}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${formType === "expense" ? "bg-destructive text-white" : "text-muted-foreground"}`}>
                    הוצאה
                  </button>
                </div>

                {/* Category */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">סוג תקציב</label>
                  <select value={formCategory} onChange={e => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-foreground text-sm">
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>

                {/* Subcategory */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">תת-קטגוריה</label>
                  <select value={formSubcategory} onChange={e => setFormSubcategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-foreground text-sm">
                    <option value="">בחר...</option>
                    {SUBCATEGORIES[formType].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">סכום (₪)</label>
                  <Input type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)}
                    placeholder="0" className="bg-secondary border-border" />
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">תיאור (אופציונלי)</label>
                  <Input value={formDescription} onChange={e => setFormDescription(e.target.value)}
                    placeholder="פירוט נוסף..." className="bg-secondary border-border" />
                </div>

                {/* Due month for yearly */}
                {formCategory === "yearly" && (
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">חודש חיוב (1-12)</label>
                    <Input type="number" min={1} max={12} value={formDueMonth} onChange={e => setFormDueMonth(e.target.value)}
                      placeholder="לדוגמה: 3 עבור מרץ" className="bg-secondary border-border" />
                  </div>
                )}

                <button onClick={handleSubmit}
                  className="w-full py-3 rounded-xl gold-gradient text-primary-foreground font-semibold text-sm">
                  {editingItem ? "עדכן" : "הוסף לתקציב"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
