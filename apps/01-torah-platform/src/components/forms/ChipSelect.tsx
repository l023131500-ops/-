import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Edit3 } from "lucide-react";

interface ChipSelectProps {
  label: string;
  options: string[];
  selected: string | string[];
  onSelect: (value: string) => void;
  multi?: boolean;
  required?: boolean;
  icon?: React.ReactNode;
  colorClass?: string;
}

const ChipSelect = ({ label, options, selected, onSelect, multi = false, required = false, icon }: ChipSelectProps) => {
  const [otherText, setOtherText] = useState("");
  const [showOtherInput, setShowOtherInput] = useState(false);

  const isSelected = (opt: string) =>
    multi ? (selected as string[]).includes(opt) : selected === opt;

  const handleSelect = (opt: string) => {
    if (opt === "אחר" || opt === "אחר - פרט") {
      setShowOtherInput(true);
      return;
    }
    setShowOtherInput(false);
    onSelect(opt);
  };

  const handleOtherSubmit = () => {
    if (otherText.trim()) {
      onSelect(otherText.trim());
      setShowOtherInput(false);
    }
  };

  return (
    <div>
      <label className="font-display text-sm font-bold text-card-foreground mb-3 flex items-center gap-2">
        {icon}
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt, i) => {
          const active = isSelected(opt);
          return (
            <motion.button
              key={opt}
              type="button"
              onClick={() => handleSelect(opt)}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.025, duration: 0.2 }}
              whileHover={{
                scale: 1.08,
                y: -3,
                boxShadow: active
                  ? "0 0 25px -4px hsl(var(--gold) / 0.7), 0 0 50px -8px hsl(var(--gold) / 0.3)"
                  : "0 6px 25px -6px hsl(var(--gold) / 0.4), 0 0 15px -5px hsl(var(--gold) / 0.2)",
              }}
              whileTap={{ scale: 0.92 }}
              className={`relative px-5 py-3 rounded-xl font-body text-sm font-semibold transition-all duration-300 flex items-center gap-2 border-2 ${
                active
                  ? "bg-gradient-to-r from-gold/25 to-secondary/20 text-secondary border-gold/60 shadow-[0_0_25px_-5px_hsl(var(--gold)/0.6)] font-bold"
                  : "bg-muted/40 text-muted-foreground border-gold/20 hover:border-gold/50 hover:bg-gold/10 hover:text-foreground"
              }`}
            >
              {active && (
                <motion.span
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="w-5 h-5 rounded-full bg-gradient-gold flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_hsl(var(--gold)/0.5)]"
                >
                  <Check className="w-3 h-3 text-primary-foreground" />
                </motion.span>
              )}
              {opt}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {showOtherInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 flex gap-2"
          >
            <div className="flex-1 relative">
              <Edit3 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                autoFocus
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleOtherSubmit()}
                placeholder="אחר - פרט..."
                className="w-full bg-muted/40 rounded-xl pr-10 pl-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground border-2 border-gold/30 focus:border-gold/60 focus:ring-2 focus:ring-gold/20 outline-none transition-all"
              />
            </div>
            <motion.button
              type="button"
              onClick={handleOtherSubmit}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-5 py-2.5 rounded-xl bg-gradient-gold text-primary-foreground font-body text-sm font-bold hover:opacity-90 transition-all shadow-lg"
            >
              אישור
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChipSelect;
