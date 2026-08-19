import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PartyPopper, Heart, Calendar, PiggyBank, TrendingUp, Plus, X, Target } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useFinancial, FamilyEvent } from "@/contexts/FinancialContext";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

const eventTypeConfig = {
  bar_mitzvah: { icon: PartyPopper, label: { en: "Bar Mitzvah", he: "בר מצווה" }, color: "bg-blue-500/10 text-blue-600" },
  bat_mitzvah: { icon: PartyPopper, label: { en: "Bat Mitzvah", he: "בת מצווה" }, color: "bg-pink-500/10 text-pink-600" },
  wedding: { icon: Heart, label: { en: "Wedding", he: "חתונה" }, color: "bg-rose-500/10 text-rose-600" },
};

export default function FamilyFuturePage() {
  const { language, profile } = useApp();
  const { familyEvents, addFamilyEvent, updateEventSavings, removeFamilyEvent, getMonthlySavingsNeeded } = useFinancial();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState<string | null>(null);
  const [saveAmount, setSaveAmount] = useState("");

  // Add event form
  const [formChildName, setFormChildName] = useState("");
  const [formEventType, setFormEventType] = useState<"bar_mitzvah" | "bat_mitzvah" | "wedding">("bar_mitzvah");
  const [formTargetBudget, setFormTargetBudget] = useState("");
  const [formEventDate, setFormEventDate] = useState("");

  const handleAddEvent = () => {
    if (!formChildName || !formTargetBudget || !formEventDate) return;
    addFamilyEvent({
      childName: formChildName,
      childAge: 0,
      eventType: formEventType,
      eventDate: formEventDate,
      targetBudget: parseFloat(formTargetBudget),
      savedAmount: 0,
    });
    setShowAddModal(false);
    setFormChildName("");
    setFormTargetBudget("");
    setFormEventDate("");
  };

  const handleSave = (id: string) => {
    if (!saveAmount || parseFloat(saveAmount) <= 0) return;
    updateEventSavings(id, parseFloat(saveAmount));
    setSaveAmount("");
    setShowSaveModal(null);
  };

  const getTimeUntilEvent = (dateStr: string) => {
    const event = new Date(dateStr);
    const now = new Date();
    const years = Math.floor((event.getTime() - now.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    const months = Math.floor(((event.getTime() - now.getTime()) % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
    if (language === "he") return `${years} שנים ו-${months} חודשים`;
    return `${years} years, ${months} months`;
  };

  // Timeline sorted by event date
  const sortedEvents = [...familyEvents].sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            {language === "he" ? "עתיד המשפחה" : "Family Future"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {language === "he" ? "תכנון אירועים ומעקב חיסכון" : "Event Planning & Savings Tracking"}
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-accent/10 gold-text border border-border/50 transition-all hover:scale-[1.02] active:scale-[0.98]">
          <Plus className="w-4 h-4" />
          {language === "he" ? "אירוע חדש" : "New Event"}
        </button>
      </motion.div>

      {/* Children Summary */}
      <motion.div variants={itemVariants} className="glass-card-gold rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 gold-text" />
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {language === "he" ? "ציר הזמן" : "Timeline"}
          </span>
        </div>
        <div className="flex items-center gap-6 overflow-x-auto pb-2">
          {profile.childrenAges.map((age, i) => (
            <div key={i} className="flex flex-col items-center gap-1 shrink-0">
              <div className="w-12 h-12 rounded-full gold-gradient flex items-center justify-center shadow-md">
                <span className="text-sm font-bold text-card">{age}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {language === "he" ? `ילד ${i + 1}` : `Child ${i + 1}`}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedEvents.map((event) => {
          const config = eventTypeConfig[event.eventType];
          const Icon = config.icon;
          const pct = (event.savedAmount / event.targetBudget) * 100;
          const monthlySavings = getMonthlySavingsNeeded(event);

          return (
            <motion.div key={event.id} variants={itemVariants} className="glass-card-gold rounded-xl p-5 space-y-4 group relative">
              {/* Remove button */}
              <button onClick={() => removeFamilyEvent(event.id)}
                className="absolute top-3 end-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-secondary">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>

              {/* Event Header */}
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${config.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">{config.label[language]}</h3>
                  <p className="text-[10px] text-muted-foreground">{event.childName}</p>
                </div>
              </div>

              {/* Timeline */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>{new Date(event.eventDate).toLocaleDateString(language === "he" ? "he-IL" : "en-US", { month: "long", year: "numeric" })}</span>
                <span>·</span>
                <span>{getTimeUntilEvent(event.eventDate)}</span>
              </div>

              {/* Budget Progress */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs text-muted-foreground">{language === "he" ? "חיסכון" : "Saved"}</span>
                  <span className="text-xs font-semibold text-foreground">
                    ₪{event.savedAmount.toLocaleString()} / ₪{event.targetBudget.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(pct, 100)}%` }}
                    transition={{ duration: 1, ease: "easeOut" as const }}
                    className="h-full rounded-full gold-gradient"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{Math.round(pct)}%</p>
              </div>

              {/* Monthly Target */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 gold-text" />
                  <span className="text-xs text-muted-foreground">
                    {language === "he" ? "חיסכון חודשי נדרש" : "Monthly savings needed"}
                  </span>
                </div>
                <span className="text-sm font-bold gold-text">₪{monthlySavings.toLocaleString()}</span>
              </div>

              {/* Add Savings Button */}
              <button onClick={() => { setShowSaveModal(event.id); setSaveAmount(""); }}
                className="w-full py-2.5 rounded-lg border border-accent/30 text-xs font-medium gold-text hover:bg-accent/5 transition-all">
                <PiggyBank className="w-3.5 h-3.5 inline-block me-1" />
                {language === "he" ? "הוסף חיסכון" : "Add Savings"}
              </button>
            </motion.div>
          );
        })}
      </div>

      {sortedEvents.length === 0 && (
        <motion.div variants={itemVariants} className="glass-card-gold rounded-xl p-12 text-center">
          <PartyPopper className="w-12 h-12 gold-text mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            {language === "he" ? "אין אירועים עדיין. הוסיפו אירוע חדש!" : "No events yet. Add a new event!"}
          </p>
        </motion.div>
      )}

      {/* Add Savings Modal */}
      <AnimatePresence>
        {showSaveModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSaveModal(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()} className="glass-card-gold rounded-2xl p-6 w-full max-w-sm space-y-4">
              <h3 className="text-lg font-bold text-foreground">{language === "he" ? "הוסף חיסכון" : "Add Savings"}</h3>
              <input type="number" value={saveAmount} onChange={(e) => setSaveAmount(e.target.value)} placeholder="0"
                className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <button onClick={() => handleSave(showSaveModal)}
                className="w-full py-3 rounded-xl gold-gradient text-card font-semibold text-sm transition-all hover:shadow-lg active:scale-[0.98]">
                {language === "he" ? "שמור" : "Save"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Event Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()} className="glass-card-gold rounded-2xl p-6 w-full max-w-md space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">{language === "he" ? "אירוע חדש" : "New Event"}</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 rounded-md hover:bg-secondary"><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">{language === "he" ? "שם הילד" : "Child's Name"}</label>
                  <input type="text" value={formChildName} onChange={(e) => setFormChildName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">{language === "he" ? "סוג אירוע" : "Event Type"}</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(eventTypeConfig) as Array<keyof typeof eventTypeConfig>).map((type) => (
                      <button key={type} onClick={() => setFormEventType(type)}
                        className={`p-2 rounded-lg text-[10px] font-medium text-center transition-all ${formEventType === type ? "gold-gradient text-card shadow-md" : "bg-secondary text-muted-foreground"}`}>
                        {eventTypeConfig[type].label[language]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">{language === "he" ? "תאריך משוער" : "Estimated Date"}</label>
                  <input type="date" value={formEventDate} onChange={(e) => setFormEventDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">{language === "he" ? "תקציב יעד (₪)" : "Target Budget (₪)"}</label>
                  <input type="number" value={formTargetBudget} onChange={(e) => setFormTargetBudget(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <button onClick={handleAddEvent}
                className="w-full py-3 rounded-xl gold-gradient text-card font-semibold text-sm transition-all hover:shadow-lg active:scale-[0.98]">
                {language === "he" ? "צור אירוע" : "Create Event"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
