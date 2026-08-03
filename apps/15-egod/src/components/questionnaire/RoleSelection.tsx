import { motion } from "framer-motion";
import { BookOpen, Search } from "lucide-react";
import { UserRole } from "@/types/questionnaire";

interface RoleSelectionProps {
  onSelect: (role: UserRole) => void;
}

const RoleSelection = ({ onSelect }: RoleSelectionProps) => (
  <div className="max-w-4xl mx-auto text-center">
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/10 border border-secondary/20 mb-6">
      <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
      <span className="text-xs font-semibold text-secondary tracking-wide">איגוד מגידי השיעורים</span>
    </motion.div>
    <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
      className="font-heading text-4xl md:text-6xl font-bold text-foreground mb-5 tracking-tight leading-tight">
      ברוכים הבאים<br />
      <span className="text-gradient-gold">לאיגוד השיעורים</span>
    </motion.h1>
    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
      className="text-muted-foreground text-lg mb-12 max-w-xl mx-auto leading-relaxed">בחרו את סוג הפנייה שלכם ונתחיל</motion.p>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <motion.button
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        whileHover={{ scale: 1.02, y: -6 }} whileTap={{ scale: 0.98 }}
        onClick={() => onSelect("teacher")}
        className="group relative bg-card rounded-3xl border border-border p-10 text-center transition-smooth shadow-soft hover:shadow-elegant overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-gold opacity-0 group-hover:opacity-5 transition-smooth" />
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-gold flex items-center justify-center mx-auto mb-5 shadow-gold group-hover:scale-110 transition-smooth">
            <BookOpen className="w-10 h-10 text-primary" />
          </div>
          <h3 className="font-heading text-2xl font-bold text-foreground mb-2">אני מגיד שיעור</h3>
          <p className="text-muted-foreground leading-relaxed">רישום למגיד / ארגון / בית כנסת ברשת איגוד השיעורים</p>
        </div>
      </motion.button>

      <motion.button
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        whileHover={{ scale: 1.02, y: -6 }} whileTap={{ scale: 0.98 }}
        onClick={() => onSelect("seeker")}
        className="group relative bg-card rounded-3xl border border-border p-10 text-center transition-smooth shadow-soft hover:shadow-elegant overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-navy opacity-0 group-hover:opacity-5 transition-smooth" />
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-navy flex items-center justify-center mx-auto mb-5 shadow-elegant group-hover:scale-110 transition-smooth">
            <Search className="w-10 h-10 text-secondary" />
          </div>
          <h3 className="font-heading text-2xl font-bold text-foreground mb-2">אני מחפש שיעור</h3>
          <p className="text-muted-foreground leading-relaxed">בקשת מגיד שיעור לקבוצה, בית כנסת או לימוד פרטי</p>
        </div>
      </motion.button>
    </div>
  </div>
);

export default RoleSelection;