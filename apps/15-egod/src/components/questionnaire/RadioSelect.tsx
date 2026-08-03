import { motion } from "framer-motion";

interface RadioSelectProps {
  label: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
}

const RadioSelect = ({ label, options, selected, onSelect }: RadioSelectProps) => (
  <div>
    <label className="font-body text-sm font-semibold text-foreground mb-3 block flex items-center gap-2">
      <span className="w-1 h-4 rounded-full bg-gradient-gold" />{label}
    </label>
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isSelected = selected === opt;
        return (
          <motion.button
            key={opt} type="button"
            whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.96 }}
            onClick={() => onSelect(opt)}
            className={`px-4 py-2 rounded-full text-sm border transition-smooth ${
              isSelected
                ? "bg-gradient-navy border-transparent text-secondary font-bold shadow-elegant"
                : "bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-foreground hover:shadow-soft"
            }`}
          >
            {isSelected && "● "}{opt}
          </motion.button>
        );
      })}
    </div>
  </div>
);

export default RadioSelect;