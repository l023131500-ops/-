import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Home, Building2, CreditCard, Plus, X, Bell, Mail, Phone, MessageCircle, DollarSign, TrendingDown } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useFinancial, SmartTask } from "@/contexts/FinancialContext";
import { useBudgetItems } from "@/hooks/useBudgetItems";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const DAYS_HE = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

interface CalendarDay {
  date: Date;
  dateStr: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isThisWeek: boolean;
  tasks: { id: string; title: string; context: "home" | "business"; category: string }[];
  installments: { description: string; amount: number }[];
  budgetEvents: { id: string; title: string; amount: number; type: "income" | "expense" }[];
}

export default function MasterCalendarPage() {
  const { mode } = useApp();
  const { tasks, transactions, addTask } = useFinancial();
  const { items: budgetItems } = useBudgetItems();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filter, setFilter] = useState<"all" | "home" | "business">("all");
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [addTaskDate, setAddTaskDate] = useState("");
  const [addTitle, setAddTitle] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [addCategory, setAddCategory] = useState<SmartTask["category"]>("general");
  const [addTime, setAddTime] = useState("");
  const [addReminder, setAddReminder] = useState(false);
  const [reminderChannel, setReminderChannel] = useState<"email" | "phone" | "whatsapp">("email");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarDays = useMemo((): CalendarDay[] => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const days: CalendarDay[] = [];
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    for (let i = startDay - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      const dateStr = d.toISOString().split("T")[0];
      days.push({ date: d, dateStr, isCurrentMonth: false, isToday: false, isThisWeek: false, tasks: [], installments: [], budgetEvents: [] });
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isToday = date.toDateString() === today.toDateString();
      const isThisWeek = date >= weekStart && date <= weekEnd;

      const dayTasks = tasks
        .filter((t) => t.dueDate === dateStr)
        .map((t) => ({
          id: t.id,
          title: t.title,
          context: (["bill", "birthday", "school", "general"].includes(t.category) ? "home" : "business") as "home" | "business",
          category: t.category,
        }));

      const installments = transactions
        .filter((tx) => tx.isInstallment && tx.installmentDetails && tx.isRecurring)
        .filter((tx) => new Date(tx.date).getDate() === d)
        .map((tx) => ({ description: tx.description, amount: tx.installmentDetails!.monthlyAmount }));

      // Budget items for this day
      const dayBudgetEvents = budgetItems
        .filter((item) => {
          if (!item.is_active) return false;
          // One-time items match on due_date
          if (item.category === "one_time" && item.due_date === dateStr) return true;
          // Yearly items match on due_month and day 1
          if (item.category === "yearly" && item.due_month === month + 1 && d === 1) return true;
          // Fixed monthly items show on their start_date day-of-month
          if (item.category === "fixed_monthly") {
            const itemDay = item.start_date ? new Date(item.start_date).getDate() : 1;
            if (d === itemDay) {
              // Check if still active (within duration)
              if (item.end_date && dateStr > item.end_date) return false;
              if (item.start_date && dateStr < item.start_date) return false;
              return true;
            }
          }
          return false;
        })
        .map((item) => ({
          id: item.id,
          title: item.subcategory || item.description || (item.type === "income" ? "הכנסה" : "הוצאה"),
          amount: item.amount,
          type: item.type,
        }));

      days.push({ date, dateStr, isCurrentMonth: true, isToday, isThisWeek, tasks: dayTasks, installments, budgetEvents: dayBudgetEvents });
    }

    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const dateStr = d.toISOString().split("T")[0];
      days.push({ date: d, dateStr, isCurrentMonth: false, isToday: false, isThisWeek: false, tasks: [], installments: [], budgetEvents: [] });
    }

    return days;
  }, [year, month, tasks, transactions, budgetItems]);

  const navigate = (dir: number) => {
    setCurrentDate(new Date(year, month + dir, 1));
    setSelectedDay(null);
  };

  const monthLabel = currentDate.toLocaleDateString("he-IL", { month: "long", year: "numeric" });

  const handleDayClick = (day: CalendarDay) => {
    if (!day.isCurrentMonth) return;
    setSelectedDay(day);
  };

  const openAddTask = (dateStr: string) => {
    setAddTaskDate(dateStr);
    setAddTitle("");
    setAddDesc("");
    setAddCategory("general");
    setAddTime("");
    setAddReminder(false);
    setReminderChannel("email");
    setShowAddTask(true);
  };

  const handleAddTask = () => {
    if (!addTitle.trim() || !addTaskDate) return;
    const desc = [
      addDesc.trim(),
      addTime ? `⏰ ${addTime}` : "",
      addReminder ? `🔔 תזכורת: ${reminderChannel === "email" ? "מייל" : reminderChannel === "phone" ? "טלפון" : "וואטסאפ"}` : "",
    ].filter(Boolean).join(" | ");

    addTask({
      title: addTitle.trim(),
      description: desc,
      dueDate: addTaskDate,
      status: "pending",
      category: addCategory,
    });
    setShowAddTask(false);
  };

  // Count this week's tasks
  const thisWeekTasks = calendarDays.filter(d => d.isThisWeek && d.isCurrentMonth).flatMap(d => d.tasks);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">לוח שנה מאוחד</h1>
          <p className="text-sm text-muted-foreground">לחץ על תאריך כדי להוסיף משימה או תזכורת</p>
        </div>
        <div className="flex rounded-xl bg-secondary p-1 gap-1">
          {([
            { key: "all", label: "הכל", icon: null },
            { key: "home", label: "בית", icon: Home },
            { key: "business", label: "עסקי", icon: Building2 },
          ] as const).map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f.key
                  ? f.key === "business" ? "business-gradient text-white" : "gold-gradient text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}>
              {f.icon && <f.icon className="w-3 h-3" />}
              {f.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* This Week Summary */}
      {thisWeekTasks.length > 0 && (
        <motion.div variants={itemVariants} className="bento-card border-2 border-accent/30 bg-accent/5">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-accent" />
            <span className="text-sm font-bold text-foreground">משימות השבוע — {thisWeekTasks.length} פריטים</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {thisWeekTasks.map(t => (
              <span key={t.id} className={`text-[11px] font-bold px-3 py-1.5 rounded-full ${
                t.context === "business" ? "bg-indigo-500/15 text-indigo-400" : "bg-accent/15 text-accent"
              }`}>
                {t.title}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Month Navigation */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-secondary transition-colors">
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
        <h2 className="text-lg font-bold text-foreground">{monthLabel}</h2>
        <button onClick={() => navigate(1)} className="p-2 rounded-xl hover:bg-secondary transition-colors">
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>
      </motion.div>

      {/* Calendar Grid */}
      <motion.div variants={itemVariants} className="bento-card p-4 overflow-hidden">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS_HE.map((day) => (
            <div key={day} className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider py-1">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, idx) => {
            const filteredTasks = day.tasks.filter((t) => filter === "all" || t.context === filter);
            const hasContent = filteredTasks.length > 0 || day.installments.length > 0 || day.budgetEvents.length > 0;
            const isSelected = selectedDay?.date.toDateString() === day.date.toDateString();

            return (
              <button
                key={idx}
                onClick={() => handleDayClick(day)}
                className={`relative p-1.5 min-h-[80px] rounded-xl text-xs transition-all border-2 ${
                  !day.isCurrentMonth ? "opacity-30 border-transparent" :
                  isSelected ? "border-accent bg-accent/10 shadow-lg shadow-accent/10" :
                  day.isToday ? "border-accent/50 bg-accent/5" :
                  day.isThisWeek && hasContent ? "border-amber-400/40 bg-amber-400/5" :
                  day.isThisWeek ? "border-border/40 bg-secondary/20" :
                  "border-transparent hover:bg-secondary/50 hover:border-border/30"
                }`}
              >
                <span className={`block text-right text-[11px] font-medium ${
                  day.isToday ? "gold-text font-extrabold text-sm" : day.isThisWeek ? "text-foreground font-bold" : "text-foreground"
                }`}>
                  {day.date.getDate()}
                </span>
                {day.isCurrentMonth && (
                  <div className="mt-1 space-y-0.5">
                    {filteredTasks.slice(0, 2).map((t) => (
                      <div key={t.id}
                        className={`text-[9px] font-bold truncate px-1.5 py-0.5 rounded-md ${
                          t.context === "business"
                            ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/20"
                            : "bg-accent/20 gold-text border border-accent/20"
                        }`}>
                        {t.title}
                      </div>
                    ))}
                    {day.installments.slice(0, 1).map((inst, i) => (
                      <div key={i} className="text-[9px] font-bold truncate px-1.5 py-0.5 rounded-md bg-destructive/15 text-destructive border border-destructive/15">
                        <CreditCard className="w-2 h-2 inline me-0.5" />₪{inst.amount}
                      </div>
                    ))}
                    {day.budgetEvents.slice(0, 2 - filteredTasks.length).map((evt) => (
                      <div key={evt.id} className={`text-[9px] font-bold truncate px-1.5 py-0.5 rounded-md border ${
                        evt.type === "income"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/15"
                          : "bg-destructive/15 text-destructive border-destructive/15"
                      }`}>
                        {evt.type === "income" ? "+" : "-"}₪{evt.amount}
                      </div>
                    ))}
                    {(filteredTasks.length + day.installments.length + day.budgetEvents.length) > 2 && (
                      <div className="text-[8px] font-bold text-accent text-center">
                        +{filteredTasks.length + day.installments.length + day.budgetEvents.length - 2}
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Selected Day Detail */}
      <AnimatePresence>
        {selectedDay && selectedDay.isCurrentMonth && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bento-card"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-foreground">
                {selectedDay.date.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}
                {selectedDay.isThisWeek && <span className="text-[10px] text-accent font-bold ms-2">(השבוע)</span>}
              </h3>
              <button onClick={() => openAddTask(selectedDay.dateStr)}
                className="btn-clay-gold text-[10px] px-3 py-1.5">
                <Plus className="w-3 h-3" /> הוסף משימה
              </button>
            </div>

            {selectedDay.tasks.filter((t) => filter === "all" || t.context === filter).length === 0 && selectedDay.installments.length === 0 && selectedDay.budgetEvents.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs text-muted-foreground mb-3">אין פריטים ליום זה</p>
                <button onClick={() => openAddTask(selectedDay.dateStr)}
                  className="text-xs gold-text hover:underline">
                  + הוסף תזכורת או משימה
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDay.tasks
                  .filter((t) => filter === "all" || t.context === filter)
                  .map((t) => (
                    <div key={t.id} className={`flex items-center gap-3 p-3 rounded-xl border ${
                      t.context === "business"
                        ? "bg-indigo-500/5 border-indigo-500/20"
                        : "bg-accent/5 border-accent/20"
                    }`}>
                      <div className={`w-3 h-3 rounded-full shrink-0 ${
                        t.context === "business" ? "bg-indigo-500" : "bg-accent"
                      }`} />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-foreground">{t.title}</p>
                        <p className="text-[10px] text-muted-foreground">{t.context === "business" ? "עסקי" : "ביתי"}</p>
                      </div>
                    </div>
                  ))}
                {selectedDay.installments.map((inst, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/10">
                    <CreditCard className="w-4 h-4 text-destructive shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-foreground">{inst.description}</p>
                      <p className="text-[10px] text-muted-foreground">חיוב תשלומים</p>
                    </div>
                    <span className="text-xs font-bold text-destructive">₪{inst.amount.toLocaleString()}</span>
                  </div>
                ))}
                {selectedDay.budgetEvents.map((evt) => (
                  <div key={evt.id} className={`flex items-center gap-3 p-3 rounded-xl border ${
                    evt.type === "income" ? "bg-emerald-500/5 border-emerald-500/20" : "bg-destructive/5 border-destructive/10"
                  }`}>
                    <DollarSign className={`w-4 h-4 shrink-0 ${evt.type === "income" ? "text-emerald-400" : "text-destructive"}`} />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-foreground">{evt.title}</p>
                      <p className="text-[10px] text-muted-foreground">{evt.type === "income" ? "הכנסה קבועה" : "הוצאה קבועה"}</p>
                    </div>
                    <span className={`text-xs font-bold ${evt.type === "income" ? "text-emerald-400" : "text-destructive"}`}>
                      {evt.type === "income" ? "+" : "-"}₪{evt.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Task Modal — with time + reminder */}
      <AnimatePresence>
        {showAddTask && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddTask(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()} className="bento-card w-full max-w-md space-y-4" dir="rtl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">
                  הוסף משימה ל-{addTaskDate && new Date(addTaskDate).toLocaleDateString("he-IL", { day: "numeric", month: "long" })}
                </h3>
                <button onClick={() => setShowAddTask(false)} className="p-1 rounded-md hover:bg-secondary">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <input type="text" value={addTitle} onChange={(e) => setAddTitle(e.target.value)} placeholder="כותרת המשימה"
                className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <input type="text" value={addDesc} onChange={(e) => setAddDesc(e.target.value)} placeholder="תיאור (אופציונלי)"
                className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              
              {/* Time */}
              <div>
                <label className="text-[10px] font-bold text-muted-foreground block mb-1.5">שעה (אופציונלי)</label>
                <input type="time" value={addTime} onChange={(e) => setAddTime(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" dir="ltr" />
              </div>

              {/* Reminder */}
              <div className="p-3 rounded-xl bg-secondary/50 border border-border/30 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={addReminder} onChange={(e) => setAddReminder(e.target.checked)}
                    className="rounded border-border" />
                  <Bell className="w-3.5 h-3.5 text-accent" />
                  <span className="text-xs font-bold text-foreground">הפעל תזכורת</span>
                </label>
                {addReminder && (
                  <div className="flex gap-2">
                    {([
                      { key: "email", label: "מייל", icon: Mail },
                      { key: "phone", label: "טלפון", icon: Phone },
                      { key: "whatsapp", label: "וואטסאפ", icon: MessageCircle },
                    ] as const).map(ch => (
                      <button key={ch.key} type="button" onClick={() => setReminderChannel(ch.key)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold transition-all ${
                          reminderChannel === ch.key ? "gold-gradient text-primary-foreground" : "bg-secondary text-muted-foreground"
                        }`}>
                        <ch.icon className="w-3 h-3" />
                        {ch.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Category */}
              <div className="grid grid-cols-3 gap-2">
                {(["general", "bill", "birthday", "school", "event", "vendor"] as const).map((cat) => (
                  <button key={cat} type="button" onClick={() => setAddCategory(cat)}
                    className={`px-3 py-2 rounded-xl text-[10px] font-medium transition-all ${
                      addCategory === cat ? "gold-gradient text-primary-foreground" : "bg-secondary text-muted-foreground"
                    }`}>
                    {cat === "general" ? "כללי" : cat === "bill" ? "חשבון" : cat === "birthday" ? "יום הולדת" : cat === "school" ? "בי״ס" : cat === "event" ? "אירוע" : "ספק"}
                  </button>
                ))}
              </div>
              <button type="button" onClick={handleAddTask} disabled={!addTitle.trim()}
                className="w-full py-3 rounded-xl gold-gradient text-primary-foreground font-semibold text-sm transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-40">
                הוסף משימה
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <motion.div variants={itemVariants} className="flex items-center gap-4 justify-center">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <div className="w-2.5 h-2.5 rounded-full bg-accent" /> ביתי
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> עסקי
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <div className="w-2.5 h-2.5 rounded-full bg-destructive" /> תשלומים
        </div>
      </motion.div>
    </motion.div>
  );
}
