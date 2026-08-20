import { useId } from "react";
import { motion } from "framer-motion";

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
      <label id={labelId} className="font-body text-sm font-semibold text-foreground mb-3 block flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-gradient-gold" />{label}
      </label>
      <div role="group" aria-labelledby={labelId} className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isSelected = selected.includes(opt);
          return (
            <motion.button
              key={opt} type="button"
              whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.96 }}
              onClick={() => onToggle(opt)}
              className={`px-4 py-2 rounded-full text-sm border transition-smooth ${
                isSelected
                  ? "bg-gradient-gold border-transparent text-primary font-bold shadow-gold"
                  : "bg-card border-border text-muted-foreground hover:border-secondary/50 hover:text-foreground hover:shadow-soft"
              }`}
            >
              {isSelected && "✓ "}{opt}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default MultiSelect;