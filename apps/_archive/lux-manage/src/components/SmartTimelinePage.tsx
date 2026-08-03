import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays, CheckCircle2, Clock, Bell, Plus, X,
  Receipt, Cake, GraduationCap, PartyPopper, Users, CircleDot, History, FileText, Ban
} from "lucide-react";
import { useFinancial, SmartTask, TaskStatus } from "@/contexts/FinancialContext";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const categoryConfig: Record<string, { icon: typeof Receipt; label: string; color: string }> = {
  bill: { icon: Receipt, label: "חשבון", color: "bg-destructive/10 text-destructive" },
  birthday: { icon: Cake, label: "יום הולדת", color: "bg-pink-500/10 text-pink-500" },
  school: { icon: GraduationCap, label: "בית ספר", color: "bg-blue-500/10 text-blue-500" },
  event: { icon: PartyPopper, label: "אירוע", color: "bg-accent/10 gold-text" },
  vendor: { icon: Users, label: "ספק", color: "bg-purple-500/10 text-purple-500" },
  general: { icon: CircleDot, label: "כללי", color: "bg-muted text-muted-foreground" },
};

const statusConfig: Record<TaskStatus, { label: string; icon: typeof CheckCircle2; color: string }> = {
  pending: { label: "ממתין", icon: Clock, color: "bg-amber-500/10 text-amber-600" },
  done: { label: "טופל ✓", icon: CheckCircle2, color: "bg-emerald-500/10 text-emerald-600" },
  snoozed: { label: "נדחה", icon: Clock, color: "bg-muted text-muted-foreground" },
  reminded: { label: "תזכורת", icon: Bell, color: "bg-blue-500/10 text-blue-500" },
};

export default function SmartTimelinePage() {
  const { tasks, addTask, updateTaskStatus, completeTask, taskHistory } = useFinancial();
  const { userId } = useApp();
  const [filter, setFilter] = useState<"all" | "pending" | "history">("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState<SmartTask | null>(null);
  const [completionNote, setCompletionNote] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formCategory, setFormCategory] = useState<SmartTask["category"]>("general");

  const filteredTasks = tasks
    .filter((t) => {
      if (filter === "pending") return t.status === "pending" || t.status === "reminded";
      return true;
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const getDaysUntil = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const handleAdd = () => {
    if (!formTitle || !formDate) return;
    addTask({ title: formTitle, description: formDesc, dueDate: formDate, status: "pending", category: formCategory });
    setFormTitle(""); setFormDesc(""); setFormDate(""); setShowAddModal(false);
  };

  const handleComplete = () => {
    if (!showCompleteModal || !completionNote.trim()) return;
    completeTask(showCompleteModal.id, completionNote.trim());
    setShowCompleteModal(null);
    setCompletionNote("");
  };

  const [snoozeTask, setSnoozeTask] = useState<SmartTask | null>(null);
  const [snoozeDate, setSnoozeDate] = useState("");
  const [remindTask, setRemindTask] = useState<SmartTask | null>(null);
  const [remindDate, setRemindDate] = useState("");
  const [remindChannel, setRemindChannel] = useState<"email" | "phone" | "whatsapp">("email");
  const [dismissTask, setDismissTask] = useState<SmartTask | null>(null);
  const [dismissReason, setDismissReason] = useState("");

  const handleStatusAction = (task: SmartTask, action: "complete" | "snooze" | "remind" | "dismiss") => {
    if (action === "complete") {
      setShowCompleteModal(task);
      setCompletionNote("");
    } else if (action === "snooze") {
      setSnoozeTask(task);
      const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);
      setSnoozeDate(nextWeek.toISOString().split("T")[0]);
    } else if (action === "dismiss") {
      setDismissTask(task);
      setDismissReason("");
    } else {
      setRemindTask(task);
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
      setRemindDate(tomorrow.toISOString().split("T")[0]);
    }
  };

  const handleSnoozeConfirm = async () => {
    if (!snoozeTask || !snoozeDate) return;
    await supabase.from("tasks").update({
      status: "snoozed",
      snooze_until: snoozeDate,
      due_date: snoozeDate,
    }).eq("id", snoozeTask.id);
    toast.success(`משימה נדחתה ל-${new Date(snoozeDate).toLocaleDateString("he-IL")}`);
    setSnoozeTask(null);
  };

  const handleDismissConfirm = async () => {
    if (!dismissTask || !dismissReason.trim()) return;
    await supabase.from("tasks").update({
      status: "done",
      dismissal_reason: dismissReason.trim(),
      completed_at: new Date().toISOString(),
      completion_note: `בוטל: ${dismissReason.trim()}`,
    }).eq("id", dismissTask.id);
    if (userId) {
      await supabase.from("task_history").insert({
        user_id: userId,
        task_title: dismissTask.title,
        task_description: dismissTask.description,
        task_category: dismissTask.category,
        completion_note: `❌ בוטל — סיבה: ${dismissReason.trim()}`,
        auto_generated: dismissTask.autoGenerated || false,
        auto_id: dismissTask.autoId || null,
      });
    }
    toast.success("המשימה בוטלה ונשמרה בהיסטוריה");
    setDismissTask(null);
    setDismissReason("");
  };

  const handleRemindConfirm = async () => {
    if (!remindTask || !remindDate) return;
    await supabase.from("tasks").update({
      status: "reminded",
      remind_date: remindDate,
      remind_channel: remindChannel,
    }).eq("id", remindTask.id);
    toast.success(`תזכורת הוגדרה ל-${new Date(remindDate).toLocaleDateString("he-IL")} באמצעות ${remindChannel}`);
    setRemindTask(null);
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
            <CalendarDays className="w-7 h-7 inline-block me-2 gold-text" />
            ציר זמן חכם
          </h1>
          <p className="text-sm text-muted-foreground">משימות, תשלומים, אירועים ותזכורות</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="btn-clay-gold text-xs">
          <Plus className="w-4 h-4" /> משימה חדשה
        </button>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex gap-2">
        {[
          { key: "all" as const, label: "הכל", icon: CalendarDays },
          { key: "pending" as const, label: "ממתינות", icon: Clock },
          { key: "history" as const, label: "היסטוריה", icon: History },
        ].map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === f.key ? "gold-gradient text-primary-foreground shadow-md" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}>
            <f.icon className="w-3.5 h-3.5" />
            {f.label}
          </button>
        ))}
      </motion.div>

      {/* History View */}
      {filter === "history" ? (
        <div className="space-y-3">
          {taskHistory.length === 0 ? (
            <motion.div variants={itemVariants} className="bento-card text-center py-12">
              <History className="w-12 h-12 gold-text mx-auto mb-4 opacity-50" />
              <p className="text-sm text-muted-foreground">אין משימות שהושלמו עדיין</p>
            </motion.div>
          ) : (
            taskHistory.slice().reverse().map((entry) => {
              const cat = categoryConfig[entry.task.category] || categoryConfig.general;
              const CatIcon = cat.icon;
              return (
                <motion.div key={entry.id} variants={itemVariants}
                  className="bento-card opacity-80">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl ${cat.color}`}>
                      <CatIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-foreground line-through">{entry.task.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{entry.task.description}</p>
                      <div className="mt-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                        <div className="flex items-center gap-1.5 mb-1">
                          <FileText className="w-3 h-3 text-emerald-400" />
                          <span className="text-[10px] font-bold text-emerald-400">איך טופל:</span>
                        </div>
                        <p className="text-xs text-foreground">{entry.completionNote}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        הושלם: {new Date(entry.completedAt).toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      ) : (
        /* Active Tasks Timeline */
        <div className="relative">
          <div className="absolute top-0 bottom-0 start-6 w-px bg-border" />
          <div className="space-y-3">
            <AnimatePresence>
              {filteredTasks.map((task) => {
                const cat = categoryConfig[task.category] || categoryConfig.general;
                const st = statusConfig[task.status] || statusConfig.pending;
                const daysUntil = getDaysUntil(task.dueDate);
                const isUrgent = daysUntil <= 3 && task.status === "pending";
                const isPast = daysUntil < 0 && task.status !== "done";
                const CatIcon = cat.icon;

                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className={`relative ps-14 ${task.status === "done" ? "opacity-60" : ""}`}
                  >
                    <div className={`absolute start-4 top-4 w-5 h-5 rounded-full border-2 border-background flex items-center justify-center z-10 ${
                      task.status === "done" ? "bg-emerald-500" :
                      isUrgent ? "bg-destructive animate-pulse" :
                      isPast ? "bg-amber-500" : "gold-gradient"
                    }`}>
                      <div className="w-2 h-2 rounded-full bg-card" />
                    </div>

                    <div className={`bento-card group transition-all ${
                      isUrgent ? "ring-1 ring-destructive/40 animate-pulse-subtle" : ""
                    } ${isPast ? "ring-1 ring-amber-500/40" : ""}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`p-1 rounded-md ${cat.color}`}>
                              <CatIcon className="w-3.5 h-3.5" />
                            </span>
                            <h3 className="text-sm font-bold text-foreground">{task.title}</h3>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{task.description}</p>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                            <span>{new Date(task.dueDate).toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" })}</span>
                            <span>·</span>
                            <span className={daysUntil < 0 ? "text-amber-500 font-semibold" : daysUntil <= 3 ? "text-destructive font-semibold" : ""}>
                              {daysUntil === 0 ? "היום!" : daysUntil > 0 ? `בעוד ${daysUntil} ימים` : `לפני ${Math.abs(daysUntil)} ימים`}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {task.status !== "done" && (
                            <>
                              <button onClick={() => handleStatusAction(task, "complete")}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all">
                                <CheckCircle2 className="w-3 h-3" /> טופל
                              </button>
                              <button onClick={() => handleStatusAction(task, "snooze")}
                                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold bg-muted text-muted-foreground hover:bg-secondary transition-all">
                                <Clock className="w-3 h-3" /> לא עכשיו
                              </button>
                              <button onClick={() => handleStatusAction(task, "dismiss")}
                                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all">
                                <Ban className="w-3 h-3" /> ביטול
                              </button>
                              <button onClick={() => handleStatusAction(task, "remind")}
                                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-all">
                                <Bell className="w-3 h-3" /> תזכורת
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {filter !== "history" && filteredTasks.length === 0 && (
        <motion.div variants={itemVariants} className="bento-card text-center py-12">
          <CalendarDays className="w-12 h-12 gold-text mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">אין משימות להצגה</p>
        </motion.div>
      )}

      {/* Complete Task Modal - Requires Description */}
      <AnimatePresence>
        {showCompleteModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCompleteModal(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()} className="bento-card w-full max-w-md space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">✅ סימון משימה כטופלה</h3>
                <button onClick={() => setShowCompleteModal(null)} className="p-1 rounded-md hover:bg-secondary"><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <div className="p-3 rounded-xl bg-secondary/50 border border-border/30">
                <p className="text-sm font-bold text-foreground">{showCompleteModal.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{showCompleteModal.description}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-foreground mb-2 block">
                  כיצד טופלה המשימה? <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={completionNote}
                  onChange={(e) => setCompletionNote(e.target.value)}
                  placeholder="תאר בקצרה כיצד טיפלת במשימה..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
                {!completionNote.trim() && (
                  <p className="text-[10px] text-destructive mt-1">חובה למלא תיאור טיפול</p>
                )}
              </div>
              <button onClick={handleComplete} disabled={!completionNote.trim()}
                className="w-full py-3 rounded-xl gold-gradient text-primary-foreground font-semibold text-sm transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed">
                אישור והעברה להיסטוריה
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Task Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()} className="bento-card w-full max-w-md space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">משימה חדשה</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 rounded-md hover:bg-secondary"><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <div className="space-y-3">
                <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="כותרת"
                  className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <input type="text" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="תיאור"
                  className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(categoryConfig).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <button key={key} onClick={() => setFormCategory(key as SmartTask["category"])}
                        className={`flex items-center gap-1.5 p-2 rounded-xl text-[10px] font-medium transition-all ${
                          formCategory === key ? "gold-gradient text-primary-foreground shadow-md" : "bg-secondary text-muted-foreground"
                        }`}>
                        <Icon className="w-3.5 h-3.5" /> {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button onClick={handleAdd}
                className="w-full py-3 rounded-xl gold-gradient text-primary-foreground font-semibold text-sm transition-all hover:shadow-lg active:scale-[0.98]">
                צור משימה
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Snooze Modal */}
      <AnimatePresence>
        {snoozeTask && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSnoozeTask(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()} className="bento-card w-full max-w-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">⏰ דחיית משימה</h3>
                <button onClick={() => setSnoozeTask(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <p className="text-sm text-muted-foreground">בחר תאריך חדש עבור: <strong>{snoozeTask.title}</strong></p>
              <input type="date" value={snoozeDate} onChange={(e) => setSnoozeDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <button onClick={handleSnoozeConfirm} disabled={!snoozeDate}
                className="w-full py-3 rounded-xl gold-gradient text-primary-foreground font-semibold text-sm disabled:opacity-40">
                דחה לתאריך זה
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Remind Modal */}
      <AnimatePresence>
        {remindTask && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setRemindTask(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()} className="bento-card w-full max-w-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">🔔 הגדרת תזכורת</h3>
                <button onClick={() => setRemindTask(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <p className="text-sm text-muted-foreground">תזכורת עבור: <strong>{remindTask.title}</strong></p>
              <input type="date" value={remindDate} onChange={(e) => setRemindDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <div>
                <label className="text-xs font-bold text-foreground mb-2 block">שלח תזכורת באמצעות:</label>
                <div className="flex gap-2">
                  {([["email", "📧 מייל"], ["phone", "📱 טלפון"], ["whatsapp", "💬 וואטסאפ"]] as const).map(([key, label]) => (
                    <button key={key} onClick={() => setRemindChannel(key)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                        remindChannel === key ? "gold-gradient text-primary-foreground" : "bg-secondary text-muted-foreground"
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleRemindConfirm} disabled={!remindDate}
                className="w-full py-3 rounded-xl gold-gradient text-primary-foreground font-semibold text-sm disabled:opacity-40">
                הגדר תזכורת
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dismiss Modal — requires reason */}
      <AnimatePresence>
        {dismissTask && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setDismissTask(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()} className="bento-card w-full max-w-md space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">❌ ביטול משימה</h3>
                <button onClick={() => setDismissTask(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <div className="p-3 rounded-xl bg-secondary/50 border border-border/30">
                <p className="text-sm font-bold text-foreground">{dismissTask.title}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-foreground mb-2 block">
                  מדוע מבטל? <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={dismissReason}
                  onChange={(e) => setDismissReason(e.target.value)}
                  placeholder="כתוב את הסיבה לביטול המשימה..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
                {!dismissReason.trim() && (
                  <p className="text-[10px] text-destructive mt-1">חובה לציין סיבת ביטול</p>
                )}
              </div>
              <button onClick={handleDismissConfirm} disabled={!dismissReason.trim()}
                className="w-full py-3 rounded-xl bg-destructive text-white font-semibold text-sm disabled:opacity-40">
                אשר ביטול
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
