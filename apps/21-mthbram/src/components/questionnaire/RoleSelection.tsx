import { motion } from "framer-motion";
import { Users, Mic, Sparkles, ArrowLeft } from "lucide-react";
import { UserRole } from "@/types/questionnaire";
import BrandLogo from "@/components/BrandLogo";

interface RoleSelectionProps {
  onSelect: (role: UserRole) => void;
}

const RoleSelection = ({ onSelect }: RoleSelectionProps) => {
  return (
    <div className="max-w-3xl mx-auto text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.8, type: "spring" }}
        className="flex justify-center mb-10"
      >
        <BrandLogo size="lg" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-teal/10 border border-teal/20 text-teal text-sm font-body mb-8">
          <Sparkles className="w-4 h-4" />
          מלאו את השאלון ונתאים לכם בדיוק
        </div>
        <h1 className="font-display text-5xl md:text-6xl font-black text-foreground mb-5">
          עבור מי אתם <span className="text-gradient-brand">ממלאים?</span>
        </h1>
        <p className="font-body text-lg text-muted-foreground mb-14 max-w-lg mx-auto">
          בחרו את התפקיד שלכם ונכוון אתכם להתאמה מושלמת
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <motion.button
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, type: "spring" }}
          whileHover={{ y: -10, scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect("teacher")}
          className="group relative bg-card rounded-3xl p-10 border-2 border-border hover:border-teal/50 transition-all duration-500 text-right overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-teal/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute -inset-0.5 rounded-3xl glow-teal opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10">
            <div className="w-18 h-18 w-[72px] h-[72px] rounded-2xl bg-gradient-teal flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
              <Mic className="w-9 h-9 text-background" />
            </div>
            <h3 className="font-display text-2xl font-bold text-card-foreground mb-3">
              מגיד שיעור
            </h3>
            <p className="font-body text-muted-foreground leading-relaxed mb-4">
              אני רב או מגיד שיעור ומעוניין להירשם כדי להגיע לקהל לומדים חדש
            </p>
            <span className="inline-flex items-center gap-2 text-teal font-body text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
              המשך <ArrowLeft className="w-4 h-4" />
            </span>
          </div>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, type: "spring" }}
          whileHover={{ y: -10, scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect("seeker")}
          className="group relative bg-card rounded-3xl p-10 border-2 border-border hover:border-magenta/50 transition-all duration-500 text-right overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-magenta/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute -inset-0.5 rounded-3xl glow-magenta opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10">
            <div className="w-[72px] h-[72px] rounded-2xl bg-gradient-magenta flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
              <Users className="w-9 h-9 text-background" />
            </div>
            <h3 className="font-display text-2xl font-bold text-card-foreground mb-3">
              מחפש מגיד שיעור
            </h3>
            <p className="font-body text-muted-foreground leading-relaxed mb-4">
              אני מחפש מגיד שיעור עבור עצמי, בית כנסת, קבוצה או בית אבלים
            </p>
            <span className="inline-flex items-center gap-2 text-magenta font-body text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
              המשך <ArrowLeft className="w-4 h-4" />
            </span>
          </div>
        </motion.button>
      </div>
    </div>
  );
};

export default RoleSelection;
