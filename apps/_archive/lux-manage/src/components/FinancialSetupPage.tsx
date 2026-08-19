import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Pencil, Trash2, DollarSign, TrendingUp, TrendingDown, Calendar, CreditCard } from "lucide-react";
import { useBudgetItems, BudgetItem, SUBCATEGORIES_FIXED, SUBCATEGORIES_ONE_TIME, PAYMENT_METHODS } from "@/hooks/useBudgetItems";
import { useApp } from "@/contexts/AppContext";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CATEGORIES = [
  { value: "fixed_monthly", label: "חודשי קבוע" },
  { value: "yearly", label: "שנתי" },
  { value: "weekly", label: "שבועי" },
  { value: "daily", label: "יומי" },
  { value: "one_time", label: "חד פעמי" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function FinancialSetupPage() {
  const { mode } = useApp();
  const {
    activeItems, items, addItem, updateItem, removeItem,
    totalMonthlyIncome, totalMonthlyExpenses, monthlyBalance,
    loading,
  } = useBudgetItems();
  const isBusiness = mode === "business";

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [formType, setFormType] = useState<"income" | "expense">("expense");
  const [formCategory, setFormCategory] = useState("fixed_monthly");
  const [formSubcategory, setFormSubcategory] = useState("");
  const [formCustomSubcategory, setFormCustomSubcategory] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDueMonth, setFormDueMonth] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formDurationMonths, setFormDurationMonths] = useState("");
  const [formPaymentMethod, setFormPaymentMethod] = useState("credit_card");
  const [formInstallments, setFormInstallments] = useState("1");

  const openAdd = (type: "income" | "expense", cat?: string) => {
    setEditingItem(null);
    setFormType(type);
    setFormCategory(cat || "fixed_monthly");
    setFormSubcategory("");
    setFormCustomSubcategory("");
    setFormDescription("");
    setFormAmount("");
    setFormDueMonth("");
    setFormDueDate("");
    setFormStartDate("");
    setFormDurationMonths("");
    setFormPaymentMethod("credit_card");
    setFormInstallments("1");
    setShowModal(true);
  };

  const openEdit = (item: BudgetItem) => {
    setEditingItem(item);
    setFormType(item.type);
    setFormCategory(item.category);
    setFormSubcategory(item.subcategory);
    setFormCustomSubcategory("");
    setFormDescription(item.description);
    setFormAmount(String(item.amount));
    setFormDueMonth(item.due_month ? String(item.due_month) : "");
    setFormDueDate(item.due_date || "");
    setFormStartDate(item.start_date || "");
    setFormDurationMonths(item.duration_months ? String(item.duration_months) : "");
    setFormPaymentMethod(item.payment_method || "credit_card");
    setFormInstallments(String(item.installments || 1));
    setShowModal(true);
  };

  const handleSubmit = async () => {
    const amount = parseFloat(formAmount);
    if (!amount || amount <= 0) return;

    const subcategory = formSubcategory === "__custom" ? formCustomSubcategory : formSubcategory;
    const installments = parseInt(formInstallments) || 1;

    // For one-time with installments, calculate end date
    let endDate: string | null = null;
    if (formCategory === "one_time" && installments > 1 && formDueDate) {
      const d = new Date(formDueDate);
      d.setMonth(d.getMonth() + installments - 1);
      endDate = d.toISOString().split("T")[0];
    } else if (formStartDate && formDurationMonths) {
      const d = new Date(formStartDate);
      d.setMonth(d.getMonth() + parseInt(formDurationMonths));
      endDate = d.toISOString().split("T")[0];
    }

    const data: any = {
      type: formType,
      category: formCategory,
      subcategory,
      description: formDescription || subcategory,
      amount,
      is_business: isBusiness,
      due_month: formDueMonth ? parseInt(formDueMonth) : null,
      due_date: formDueDate || null,
      is_active: true,
      start_date: formStartDate || null,
      duration_months: formDurationMonths ? parseInt(formDurationMonths) : null,
      end_date: endDate,
      payment_method: formPaymentMethod,
      installments,
    };

    if (editingItem) {
      await updateItem(editingItem.id, data);
    } else {
      await addItem(data);
    }
    setShowModal(false);
  };

  const getSubcategoriesForCategory = () => {
    if (formCategory === "one_time") return SUBCATEGORIES_ONE_TIME[formType];
    return SUBCATEGORIES_FIXED[formType];
  };

  const incomeItems = activeItems.filter(i => i.type === "income");
  const expenseItems = activeItems.filter(i => i.type === "expense");
  const getCategoryLabel = (cat: string) => CATEGORIES.find(c => c.value === cat)?.label || cat;
  const getPaymentLabel = (method: string) => PAYMENT_METHODS.find(m => m.value === method)?.label || method;

  // Budget overspend alert
  const hasOverspend = monthlyBalance < 0;

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-secondary/40 animate-pulse" />)}
      </div>
    );
  }

  const renderItemList = (filteredItems: BudgetItem[], type: "income" | "expense") => {
    if (filteredItems.length === 0) {
      return (
        <div className="bento-card text-center py-8">
          <p className="text-sm text-muted-foreground">
            {type === "income" ? "אין הכנסות — הוסף הכנסה ראשונה" : "אין הוצאות — הוסף הוצאה ראשונה"}
          </p>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {filteredItems.map(item => (
          <div key={item.id} className="bento-card flex items-center justify-between !py-3 !px-4 group">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${type === "income" ? "bg-accent/10" : "bg-destructive/10"}`}>
                {type === "income" ? <TrendingUp className="w-4 h-4 gold-text" /> : <TrendingDown className="w-4 h-4 text-destructive" />}
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{item.subcategory || item.description}</p>
                <p className="text-[10px] text-muted-foreground">
                  {getCategoryLabel(item.category)}
                  {item.due_month ? ` · חודש ${item.due_month}` : ""}
                  {item.due_date ? ` · ${new Date(item.due_date).toLocaleDateString("he-IL")}` : ""}
                  {item.duration_months ? ` · ${item.duration_months} חודשים` : ""}
                  {item.installments > 1 ? ` · ${item.installments} תשלומים` : ""}
                  {item.payment_method && item.payment_method !== "credit_card" ? ` · ${getPaymentLabel(item.payment_method)}` : ""}
                  {item.end_date ? ` · עד ${new Date(item.end_date).toLocaleDateString("he-IL")}` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-extrabold ${type === "income" ? "gold-text" : "text-destructive"}`}>
                {type === "income" ? "+" : "-"}₪{item.amount.toLocaleString()}
              </span>
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
    );
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight font-sans">
          <DollarSign className="w-7 h-7 inline-block me-2 gold-text" />
          עדכון מצב פיננסי
        </h1>
        <p className="text-sm text-muted-foreground">הגדר הכנסות והוצאות קבועות, חד-פעמיות ותקופתיות</p>
      </motion.div>

      {/* Summary - Monthly budget */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bento-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 gold-text" />
            <span className="text-xs text-muted-foreground">הכנסה חודשית קבועה</span>
          </div>
          <p className="text-2xl font-extrabold text-foreground">₪{Math.round(totalMonthlyIncome).toLocaleString()}</p>
        </div>
        <div className="bento-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-destructive" />
            <span className="text-xs text-muted-foreground">הוצאה חודשית קבועה</span>
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
      </motion.div>

      {/* Overspend Alert */}
      {hasOverspend && (
        <motion.div variants={itemVariants} className="bento-card border-2 border-destructive/40 bg-destructive/5">
          <p className="text-sm font-bold text-destructive">⚠️ התראה: ההוצאות החודשיות עולות על ההכנסות ב-₪{Math.abs(Math.round(monthlyBalance)).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">מומלץ לבדוק את ההוצאות ולהפחית חלק מהם</p>
        </motion.div>
      )}

      {/* Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="expenses" dir="rtl">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="expenses">הוצאות קבועות</TabsTrigger>
            <TabsTrigger value="income">הכנסות קבועות</TabsTrigger>
            <TabsTrigger value="one_time">חד פעמי</TabsTrigger>
          </TabsList>
          <TabsContent value="expenses" className="space-y-4 mt-4">
            <button onClick={() => openAdd("expense")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-all">
              <Plus className="w-4 h-4" /> הוסף הוצאה קבועה
            </button>
            {renderItemList(expenseItems.filter(i => i.category !== "one_time"), "expense")}
          </TabsContent>
          <TabsContent value="income" className="space-y-4 mt-4">
            <button onClick={() => openAdd("income")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-accent/10 gold-text border border-accent/20 hover:bg-accent/20 transition-all">
              <Plus className="w-4 h-4" /> הוסף הכנסה קבועה
            </button>
            {renderItemList(incomeItems.filter(i => i.category !== "one_time"), "income")}
          </TabsContent>
          <TabsContent value="one_time" className="space-y-4 mt-4">
            <div className="flex gap-3">
              <button onClick={() => openAdd("expense", "one_time")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-all">
                <Plus className="w-4 h-4" /> הוצאה חד פעמית
              </button>
              <button onClick={() => openAdd("income", "one_time")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-accent/10 gold-text border border-accent/20 hover:bg-accent/20 transition-all">
                <Plus className="w-4 h-4" /> הכנסה חד פעמית
              </button>
            </div>
            <div className="space-y-2">
              {activeItems.filter(i => i.category === "one_time").map(item => (
                <div key={item.id} className="bento-card flex items-center justify-between !py-3 !px-4 group">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${item.type === "income" ? "bg-accent/10" : "bg-destructive/10"}`}>
                      {item.type === "income" ? <TrendingUp className="w-4 h-4 gold-text" /> : <TrendingDown className="w-4 h-4 text-destructive" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{item.subcategory || item.description}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {item.due_date ? new Date(item.due_date).toLocaleDateString("he-IL") : "חד פעמי"}
                        {item.installments > 1 ? ` · ${item.installments} תשלומים` : ""}
                        {item.payment_method ? ` · ${getPaymentLabel(item.payment_method)}` : ""}
                        {item.end_date ? ` · עד ${new Date(item.end_date).toLocaleDateString("he-IL")}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-extrabold ${item.type === "income" ? "gold-text" : "text-destructive"}`}>
                      {item.type === "income" ? "+" : "-"}₪{item.amount.toLocaleString()}
                    </span>
                    <button onClick={() => openEdit(item)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-secondary transition-all">
                      <Pencil className="w-3 h-3 text-muted-foreground" />
                    </button>
                    <button onClick={() => removeItem(item.id)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 transition-all">
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </button>
                  </div>
                </div>
              ))}
              {activeItems.filter(i => i.category === "one_time").length === 0 && (
                <div className="bento-card text-center py-8">
                  <p className="text-sm text-muted-foreground">אין פריטים חד פעמיים</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()} className="bento-card w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">
                  {editingItem ? "עריכת פריט" : formType === "income" ? "הוסף הכנסה" : "הוסף הוצאה"}
                </h3>
                <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>

              <div className="space-y-3">
                {/* Type */}
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

                {/* Subcategory - context-aware */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">קטגוריה</label>
                  <select value={formSubcategory} onChange={e => setFormSubcategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-foreground text-sm">
                    <option value="">בחר...</option>
                    {getSubcategoriesForCategory().map(s => <option key={s} value={s}>{s}</option>)}
                    <option value="__custom">➕ אחר (הקלד ידנית)</option>
                  </select>
                </div>
                {formSubcategory === "__custom" && (
                  <Input value={formCustomSubcategory} onChange={e => setFormCustomSubcategory(e.target.value)}
                    placeholder="הקלד קטגוריה חדשה..." className="bg-secondary border-border" />
                )}

                {/* Amount */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">סכום (₪)</label>
                  <Input type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)}
                    placeholder="0" className="bg-secondary border-border" />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">
                    <CreditCard className="w-3 h-3 inline me-1" />
                    אמצעי תשלום
                  </label>
                  <select value={formPaymentMethod} onChange={e => setFormPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-foreground text-sm">
                    {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>

                {/* Installments for one-time */}
                {formCategory === "one_time" && (
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">מספר תשלומים</label>
                    <Input type="number" min={1} value={formInstallments} onChange={e => setFormInstallments(e.target.value)}
                      placeholder="1" className="bg-secondary border-border" />
                  </div>
                )}

                {/* Description */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">תיאור (אופציונלי)</label>
                  <Input value={formDescription} onChange={e => setFormDescription(e.target.value)}
                    placeholder="פירוט נוסף..." className="bg-secondary border-border" />
                </div>

                {/* Due date for one-time */}
                {formCategory === "one_time" && (
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">תאריך חיוב ראשון</label>
                    <Input type="date" value={formDueDate} onChange={e => setFormDueDate(e.target.value)}
                      className="bg-secondary border-border" />
                  </div>
                )}

                {/* Due month for yearly */}
                {formCategory === "yearly" && (
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">חודש חיוב (1-12)</label>
                    <Input type="number" min={1} max={12} value={formDueMonth} onChange={e => setFormDueMonth(e.target.value)}
                      placeholder="לדוגמה: 3 עבור מרץ" className="bg-secondary border-border" />
                  </div>
                )}

                {/* Duration fields for recurring */}
                {formCategory !== "one_time" && (
                  <>
                    <div>
                      <label className="text-xs font-bold text-muted-foreground mb-1 block">תאריך התחלה</label>
                      <Input type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)}
                        className="bg-secondary border-border" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-muted-foreground mb-1 block">עד תאריך (אופציונלי)</label>
                      <Input type="date" value={formDueDate} onChange={e => setFormDueDate(e.target.value)}
                        className="bg-secondary border-border" />
                      <p className="text-[10px] text-muted-foreground mt-1">או מספר חודשים:</p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-muted-foreground mb-1 block">מספר חודשים (השאר ריק = ללא הגבלה)</label>
                      <Input type="number" min={1} value={formDurationMonths} onChange={e => setFormDurationMonths(e.target.value)}
                        placeholder="ללא הגבלה" className="bg-secondary border-border" />
                    </div>
                  </>
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
    </motion.div>
  );
}
