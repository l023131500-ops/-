import { motion } from "framer-motion";
import { Circle, CheckCircle2 } from "lucide-react";

interface RadioSelectProps {
  label: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
}

const RadioSelect = ({ label, options, selected, onSelect }: RadioSelectProps) => {
  return (
    <div>
      <label className="font-display text-base font-bold text-card-foreground mb-4 block">
        {label}
      </label>
      <div className="flex flex-wrap gap-3">
        {options.map((option, i) => {
          const isSelected = selected === option;
          return (
            <motion.button
              key={option}
              type="button"
              onClick={() => onSelect(option)}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03, duration: 0.2 }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className={`relative px-5 py-3 rounded-xl font-body text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                isSelected
                  ? "bg-gold/15 text-gold border-2 border-gold shadow-[0_0_20px_-5px_hsl(var(--gold)/0.4)] font-semibold"
                  : "bg-muted/40 text-muted-foreground border-2 border-transparent hover:border-gold/20 hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              {isSelected ? (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <CheckCircle2 className="w-5 h-5 text-gold" />
                </motion.span>
              ) : (
                <Circle className="w-4 h-4 text-muted-foreground/40" />
              )}
              {option}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default RadioSelect;
