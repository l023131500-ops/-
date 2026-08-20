import { useId } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface MultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}

const MultiSelect = ({ label, options, selected, onToggle }: MultiSelectProps) => {
  const labelId = useId();
  return (
    <div>
      <label id={labelId} className="font-display text-base font-bold text-card-foreground mb-4 block">
        {label}
      </label>
      <div role="group" aria-labelledby={labelId} className="flex flex-wrap gap-3">
        {options.map((option, i) => {
          const isSelected = selected.includes(option);
          return (
            <motion.button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              aria-pressed={isSelected}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03, duration: 0.2 }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className={`relative px-5 py-3 rounded-xl font-body text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                isSelected
                  ? "bg-teal/15 text-teal border-2 border-teal shadow-[0_0_20px_-5px_hsl(var(--teal)/0.4)] font-semibold"
                  : "bg-muted/40 text-muted-foreground border-2 border-transparent hover:border-teal/20 hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              {isSelected && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-5 h-5 rounded-full bg-teal flex items-center justify-center flex-shrink-0"
                >
                  <Check className="w-3 h-3 text-background" />
                </motion.span>
              )}
              {option}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default MultiSelect;
