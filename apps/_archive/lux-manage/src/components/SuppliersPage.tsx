import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Star, Phone, Mail, Plus, X, CreditCard, CalendarDays, StickyNote } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useFinancial, Supplier } from "@/contexts/FinancialContext";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function SuppliersPage() {
  const { language } = useApp();
  const { suppliers, addSupplier, removeSupplier, familyEvents } = useFinancial();
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const handleAdd = () => {
    if (!formName) return;
    addSupplier({
      name: formName, category: formCategory, phone: formPhone, email: formEmail,
      rating: 3, linkedEventIds: [], totalPaid: 0, notes: formNotes,
    });
    setFormName(""); setFormCategory(""); setFormPhone(""); setFormEmail(""); setFormNotes("");
    setShowAddModal(false);
  };

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`w-3 h-3 ${s <= rating ? "fill-accent text-accent" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            <Users className="w-7 h-7 inline-block me-2 gold-text" />
            ניהול ספקים
          </h1>
          <p className="text-sm text-muted-foreground">ספקים, תשלומים וביצועים</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-accent/10 gold-text border border-border/50 transition-all hover:scale-[1.02] active:scale-[0.98]">
          <Plus className="w-4 h-4" /> ספק חדש
        </button>
      </motion.div>

      {/* Upcoming Payments Summary */}
      <motion.div variants={itemVariants} className="glass-card-gold rounded-xl p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
          <CreditCard className="w-4 h-4 gold-text" /> תשלומים קרובים לספקים
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {suppliers.filter(s => s.nextPaymentDate && s.nextPaymentAmount).map((s) => {
            const daysUntil = Math.ceil((new Date(s.nextPaymentDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return (
              <div key={s.id} className="shrink-0 p-3 rounded-lg bg-secondary/50 min-w-[180px]">
                <p className="text-xs font-semibold text-foreground truncate">{s.name}</p>
                <p className="text-lg font-bold gold-text">₪{s.nextPaymentAmount!.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">
                  {daysUntil <= 0 ? "היום!" : `בעוד ${daysUntil} ימים`}
                </p>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {suppliers.map((supplier) => (
          <motion.div key={supplier.id} variants={itemVariants}
            className="glass-card-gold rounded-xl p-5 group relative cursor-pointer transition-all hover:shadow-xl"
            onClick={() => setExpandedId(expandedId === supplier.id ? null : supplier.id)}>
            <button onClick={(e) => { e.stopPropagation(); removeSupplier(supplier.id); }}
              className="absolute top-3 end-3 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-secondary transition-all">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>

            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center shrink-0 shadow-md">
                <span className="text-sm font-bold text-card">{supplier.name.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-foreground truncate">{supplier.name}</h3>
                <p className="text-[10px] text-muted-foreground">{supplier.category}</p>
                {renderStars(supplier.rating)}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted-foreground">שולם עד כה</span>
              <span className="font-bold text-foreground">₪{supplier.totalPaid.toLocaleString()}</span>
            </div>

            {supplier.nextPaymentAmount && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">תשלום הבא</span>
                <span className="font-bold gold-text">₪{supplier.nextPaymentAmount.toLocaleString()}</span>
              </div>
            )}

            <AnimatePresence>
              {expandedId === supplier.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-3 pt-3 border-t border-border/50 space-y-2"
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="w-3 h-3" /> {supplier.phone}
                  </div>
                  {supplier.email && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="w-3 h-3" /> {supplier.email}
                    </div>
                  )}
                  {supplier.nextPaymentDate && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CalendarDays className="w-3 h-3" />
                      {new Date(supplier.nextPaymentDate).toLocaleDateString("he-IL")}
                    </div>
                  )}
                  {supplier.notes && (
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <StickyNote className="w-3 h-3 mt-0.5 shrink-0" /> {supplier.notes}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()} className="glass-card-gold rounded-2xl p-6 w-full max-w-md space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">ספק חדש</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 rounded-md hover:bg-secondary"><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <div className="space-y-3">
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="שם הספק"
                  className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <input type="text" value={formCategory} onChange={(e) => setFormCategory(e.target.value)} placeholder="קטגוריה (צלם, DJ, קייטרינג...)"
                  className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <input type="tel" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="טלפון"
                  className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="אימייל"
                  className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="הערות"
                  className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none h-20" />
              </div>
              <button onClick={handleAdd}
                className="w-full py-3 rounded-xl gold-gradient text-card font-semibold text-sm transition-all hover:shadow-lg active:scale-[0.98]">
                הוסף ספק
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
