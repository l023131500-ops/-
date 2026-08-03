import { BrainCircuit } from "lucide-react";
import { motion } from "framer-motion";

interface AIIconProps {
  size?: number;
  variant?: "primary" | "secondary" | "subtle" | "navy";
  className?: string;
  animated?: boolean;
}

/**
 * Premium AI icon — BrainCircuit core with rotating conic gradient halo and glow.
 * Replaces generic Sparkles/Bot lucide icons across the app for a richer, more
 * "AI-grade" feel.
 */
const AIIcon = ({ size = 28, variant = "primary", className = "", animated = true }: AIIconProps) => {
  const colors = {
    primary: { ring: "from-gold via-teal to-gold", core: "text-navy", bg: "bg-gold", glow: "shadow-[0_0_20px_-2px_hsl(var(--gold)/0.6)]" },
    secondary: { ring: "from-teal via-gold to-teal", core: "text-primary-foreground", bg: "bg-teal", glow: "shadow-[0_0_20px_-2px_hsl(var(--teal)/0.6)]" },
    subtle: { ring: "from-gold/40 via-teal/40 to-gold/40", core: "text-foreground", bg: "bg-muted", glow: "" },
    navy: { ring: "from-gold via-teal to-gold", core: "text-gold", bg: "bg-navy", glow: "shadow-[0_0_18px_-2px_hsl(var(--gold)/0.5)]" },
  }[variant];

  const inner = Math.round(size * 0.62);

  return (
    <span
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* rotating conic halo */}
      <motion.span
        className="absolute inset-0 rounded-full opacity-90"
        style={{
          background: `conic-gradient(from 0deg, hsl(var(--gold)), hsl(var(--teal)), hsl(var(--gold)), hsl(var(--teal)), hsl(var(--gold)))`,
          filter: "blur(0.5px)",
        }}
        animate={animated ? { rotate: 360 } : {}}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />
      {/* solid core disc */}
      <span
        className={`relative rounded-full ${colors.bg} ${colors.glow} flex items-center justify-center`}
        style={{ width: size - 4, height: size - 4 }}
      >
        <motion.span
          animate={animated ? { scale: [1, 1.08, 1] } : {}}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="flex items-center justify-center"
        >
          <BrainCircuit className={colors.core} style={{ width: inner, height: inner }} strokeWidth={2.2} />
        </motion.span>
      </span>
      {/* outer pulse ring */}
      {animated && (
        <motion.span
          className="absolute inset-0 rounded-full border border-gold/40"
          animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
        />
      )}
    </span>
  );
};

export default AIIcon;
