import { motion } from "framer-motion";
import {
  DollarSign, ListTodo, TrendingUp, TrendingDown, Wallet, PiggyBank,
  CalendarDays, Shield, CheckCircle2, Bell, Zap, Plus, FileText, GraduationCap,
  BarChart3, MessageCircle, CreditCard
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { useFinancial } from "@/contexts/FinancialContext";
import { useBudgetItems } from "@/hooks/useBudgetItems";
import ExportButtons from "@/components/ExportButtons";
import SpecialTipsWidget from "@/components/SpecialTipsWidget";
import ProfileCompletePrompt from "@/components/ProfileCompletePrompt";
import { useMemo } from "react";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

function HealthGauge({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "hsl(142 71% 45%)" : score >= 60 ? "hsl(var(--gold))" : "hsl(0 72% 51%)";

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="5" />
        <motion.circle
          cx="60" cy="60" r={radius} fill="none" stroke={color} strokeWidth="5"
          strokeLinecap="round" strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-3xl font-black text-foreground"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >{score}</motion.span>
        <span className="text-[9px] text-muted-foreground tracking-widest uppercase">מתוך 100</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { profile } = useApp();
  const navigate = useNavigate();
  const {
    transactions, tasks, getUpcomingPayments,
    getTotalInstallmentDebt, benefits, loading,
  } = useFinancial();
  const {
    totalMonthlyIncome: budgetIncome,
    totalMonthlyExpenses: budgetExpenses,
    monthlyBalance: budgetBalance,
    activeItems: budgetItems,
    loading: budgetLoading,
  } = useBudgetItems();

  const now = new Date();

  // Transaction-based income/expenses (actual this month)
  const txMonthIncome = transactions
    .filter(tx => { const d = new Date(tx.date); return tx.type === "income" && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); })
    .reduce((s, tx) => s + tx.amount, 0);
  const txMonthExpenses = transactions
    .filter(tx => { const d = new Date(tx.date); return tx.type === "expense" && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); })
    .reduce((s, tx) => s + tx.amount, 0);

  // Total = budget_items baseline + actual variable transactions
  const monthIncome = budgetIncome + txMonthIncome;
  const monthExpenses = budgetExpenses + txMonthExpenses;
  const balance = monthIncome - monthExpenses;

  const installmentDebt = getTotalInstallmentDebt();
  const upcomingPayments = getUpcomingPayments();
  const pendingTasks = tasks.filter(t => t.status === "pending" || t.status === "reminded");
  const thisWeekTasks = pendingTasks.filter(t => {
    const d = new Date(t.dueDate);
    const diff = Math.ceil((d.getTime() - now.getTime()) / 86400000);
    return diff >= -1 && diff <= 7;
  });

  const savingsRate = monthIncome > 0 ? (balance / monthIncome) * 100 : 0;
  const debtRatio = monthIncome > 0 ? Math.min(100, (installmentDebt / (monthIncome * 12)) * 100) : 0;
  const healthScore = Math.round(Math.max(0, Math.min(100, 50 + savingsRate * 0.8 - debtRatio * 0.3)));

  const greeting = () => { const h = now.getHours(); return h < 12 ? "בוקר טוב" : h < 17 ? "צהריים טובים" : "ערב טוב"; };

  // Mini calendar: next 7 days with budget events
  const next7Days = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const dayOfMonth = d.getDate();
      const monthIdx = d.getMonth();

      const events = budgetItems.filter(item => {
        if (item.category === "one_time" && item.due_date === dateStr) return true;
        if (item.category === "yearly" && item.due_month === monthIdx + 1 && dayOfMonth === 1) return true;
        if (item.category === "fixed_monthly") {
          const itemDay = item.start_date ? new Date(item.start_date).getDate() : 1;
          if (dayOfMonth === itemDay) {
            if (item.end_date && dateStr > item.end_date) return false;
            if (item.start_date && dateStr < item.start_date) return false;
            return true;
          }
        }
        return false;
      });

      const dayTasks = pendingTasks.filter(t => t.dueDate === dateStr);

      if (events.length > 0 || dayTasks.length > 0) {
        days.push({ date: d, dateStr, events, tasks: dayTasks });
      }
    }
    return days;
  }, [budgetItems, pendingTasks, now]);

  if (loading || budgetLoading) {
    return (
      <div className="p-12 max-w-7xl mx-auto space-y-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-32 rounded-3xl bg-secondary/40 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="relative p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <div className="ambient-gold w-[600px] h-[600px] top-0 end-0 -z-10" />

      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-start justify-between flex-wrap gap-4">
        <div className="space-y-1.5">
          <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
            {greeting()}, <span className="gold-text">{profile.name || "שלום"}</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            ניהול ביתי · <span className="text-accent cursor-pointer" onClick={() => {}}>⌘K</span> לחיפוש מהיר
          </p>
        </div>
        <ExportButtons />
      </motion.div>

      {/* ═══════ TOP ROW ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Health Gauge */}
        <motion.div variants={itemVariants} className="lg:col-span-3 bento-card flex flex-col items-center justify-center">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">בריאות פיננסית</span>
          <HealthGauge score={healthScore} />
          <p className="text-[10px] text-muted-foreground mt-3">
            {healthScore >= 80 ? "מצוין! המשך כך 🎉" : healthScore >= 60 ? "טוב, יש מקום לשיפור" : "כדאי לבדוק את ההוצאות"}
          </p>
        </motion.div>

        {/* Monthly Budget Summary */}
        <motion.div variants={itemVariants} className="lg:col-span-4 bento-card">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-4 h-4 text-accent" />
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">תקציב חודשי</span>
          </div>
          <div className="space-y-2.5">
            {[
              { label: "הכנסות קבועות", value: `₪${budgetIncome.toLocaleString()}`, positive: true },
              { label: "הוצאות קבועות", value: `₪${budgetExpenses.toLocaleString()}`, positive: false },
              { label: "יתרה חודשית", value: `₪${Math.round(budgetBalance).toLocaleString()}`, positive: budgetBalance >= 0 },
              { label: "הוצאות משתנות החודש", value: `₪${txMonthExpenses.toLocaleString()}`, positive: false },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2 px-3 rounded-xl bg-secondary/40">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className={`text-sm font-bold ${item.positive ? "text-emerald-400" : "text-destructive"}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Contact Us + Quick Entry */}
        <motion.div variants={itemVariants} className="lg:col-span-5 flex flex-col gap-4">
          {/* Quick Entry */}
          <div className="bento-card cursor-pointer hover:border-accent/20 transition-all duration-500 flex-1"
            onClick={() => navigate("/quick-entry")}>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-accent" />
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">הזנה מהירה</span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">הוסף הוצאה, הכנסה, תזכורת ועוד</p>
            <div className="flex gap-2 flex-wrap">
              {["הוצאה קבועה", "הכנסה קבועה", "תזכורת ליומן"].map(ex => (
                <span key={ex} className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-accent/10 text-accent border border-accent/20">{ex}</span>
              ))}
            </div>
          </div>
          {/* Contact */}
          <div className="bento-card cursor-pointer hover:border-accent/20 transition-all duration-500"
            onClick={() => navigate("/expert-chat")}>
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle className="w-4 h-4 text-accent" />
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">דברו איתנו</span>
            </div>
            <p className="text-xs text-foreground font-bold">את/ה מוזמן/ת לדבר איתי</p>
            <p className="text-[10px] text-muted-foreground">ייעוץ פיננסי, שאלות ובקשות</p>
          </div>
        </motion.div>
      </div>

      {/* ═══════ CALENDAR + TASKS ROW ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Mini Financial Calendar - next 7 days */}
        <motion.div variants={itemVariants} className="bento-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-accent" />
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">לוח שנה פיננסי — 7 ימים הקרובים</span>
            </div>
            <button onClick={() => navigate("/calendar")} className="text-[10px] text-accent hover:underline">לוח מלא →</button>
          </div>
          {next7Days.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">אין אירועים פיננסיים ב-7 הימים הקרובים</p>
          ) : (
            <div className="space-y-2">
              {next7Days.map(day => (
                <div key={day.dateStr} className="p-3 rounded-xl bg-secondary/40 border border-border/30 space-y-1.5">
                  <p className="text-[11px] font-bold text-foreground">
                    {day.date.toLocaleDateString("he-IL", { weekday: "short", day: "numeric", month: "short" })}
                  </p>
                  {day.events.map(evt => (
                    <div key={evt.id} className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">{evt.subcategory || evt.description}</span>
                      <span className={`text-[11px] font-bold ${evt.type === "income" ? "text-emerald-400" : "text-destructive"}`}>
                        {evt.type === "income" ? "+" : "-"}₪{evt.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  {day.tasks.map(t => (
                    <div key={t.id} className="flex items-center gap-1.5">
                      <ListTodo className="w-3 h-3 text-accent" />
                      <span className="text-[10px] text-foreground">{t.title}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Tasks */}
        <motion.div variants={itemVariants} className="bento-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-accent" />
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">משימות וזכויות</span>
              {thisWeekTasks.length > 0 && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-accent/20 text-accent animate-pulse">
                  {thisWeekTasks.length} השבוע
                </span>
              )}
            </div>
            <button onClick={() => navigate("/timeline")} className="text-[10px] text-accent hover:underline">הכל →</button>
          </div>
          {pendingTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">אין משימות ממתינות ✓</p>
          ) : (
            <div className="space-y-2">
              {pendingTasks.slice(0, 5).map(task => {
                const dueDate = new Date(task.dueDate);
                const diff = Math.ceil((dueDate.getTime() - now.getTime()) / 86400000);
                const isUrgent = diff <= 1;
                const isThisWeek = diff >= -1 && diff <= 7;
                return (
                  <div key={task.id} className={`flex items-center justify-between p-3 rounded-xl border-2 ${
                    isUrgent ? "bg-destructive/5 border-destructive/30" :
                    isThisWeek ? "bg-accent/5 border-accent/20" :
                    "bg-secondary/40 border-border/30"
                  }`}>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold truncate ${isUrgent ? "text-destructive" : "text-foreground"}`}>{task.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {dueDate.toLocaleDateString("he-IL", { day: "numeric", month: "short" })}
                        {isUrgent && " · דחוף!"}
                      </p>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      task.category === "rights" ? "bg-accent/10 text-accent" :
                      isUrgent ? "bg-destructive/10 text-destructive" :
                      "bg-amber-500/10 text-amber-400"
                    }`}>
                      {task.category === "rights" ? "זכות" : isUrgent ? "דחוף" : "ממתין"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* ═══════ BOTTOM ROW ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Upcoming Payments */}
        <motion.div variants={itemVariants} className="bento-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-accent" />
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">תשלומים קרובים</span>
            </div>
            <button onClick={() => navigate("/suppliers")} className="text-[10px] text-accent hover:underline">הכל →</button>
          </div>
          {upcomingPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">אין תשלומים קרובים</p>
          ) : (
            <div className="space-y-2">
              {upcomingPayments.slice(0, 4).map(({ supplier, daysUntil }) => (
                <div key={supplier.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 border border-border/30">
                  <div>
                    <p className="text-xs font-bold text-foreground">{supplier.name}</p>
                    <p className="text-[10px] text-muted-foreground">{daysUntil === 0 ? "היום" : `בעוד ${daysUntil} ימים`}</p>
                  </div>
                  <span className="text-sm font-black text-accent">₪{supplier.nextPaymentAmount?.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Academy & Rights */}
        <motion.div variants={itemVariants} className="bento-card space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap className="w-4 h-4 text-accent" />
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">אקדמיה</span>
            </div>
            <div className="p-3 rounded-xl bg-secondary/40 border border-border/30 cursor-pointer hover:border-accent/20 transition-all" onClick={() => navigate("/academy")}>
              <p className="text-xs font-bold text-foreground">טיפים לניהול פיננסי חכם</p>
              <p className="text-[10px] text-muted-foreground mt-1">גלה איך לשפר את המצב הכלכלי שלך</p>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-accent" />
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">מנוע זכויות</span>
            </div>
            <button onClick={() => navigate("/benefits")} className="text-[10px] text-accent hover:underline">גלה זכויות רלוונטיות →</button>
          </div>
        </motion.div>

        {/* Life Event */}
        <motion.div variants={itemVariants}
          className="bento-card border-2 border-dashed border-accent/30 hover:border-accent/60 cursor-pointer transition-all duration-300"
          onClick={() => navigate("/projects")}>
          <div className="flex items-center gap-4 py-3">
            <div className="p-3 rounded-2xl bg-accent/10">
              <Plus className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">יש לך פרויקט לתכנן?</p>
              <p className="text-sm text-muted-foreground">חתונה, בר מצווה, דירה חדשה, שיפוצים — תכנון תקציבי נפרד</p>
            </div>
          </div>
        </motion.div>
      </div>

      <SpecialTipsWidget />

      {profile.residentialStatus === "renter" && (
        <motion.div variants={itemVariants} className="bento-card border-s-4 border-accent cursor-pointer" onClick={() => navigate("/benefits")}>
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-2xl bg-accent/10">
              <TrendingUp className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">זכויות והטבות</p>
              <p className="text-xs text-muted-foreground">ייתכן שאתה זכאי לסיוע בשכר דירה — לחץ לפרטים</p>
            </div>
          </div>
        </motion.div>
      )}
      <ProfileCompletePrompt />
    </motion.div>
  );
}
