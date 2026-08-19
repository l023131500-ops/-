import { motion, AnimatePresence } from "framer-motion";
import { SkipForward, ArrowRight } from "lucide-react";

interface ProgressiveFormStepProps {
  visible: boolean;
  children: React.ReactNode;
  onSkip?: () => void;
  onBack?: () => void;
  showSkip?: boolean;
  showBack?: boolean;
  stepIndex: number;
}

const ProgressiveFormStep = ({
  visible,
  children,
  onSkip,
  onBack,
  showSkip = true,
  showBack = false,
  stepIndex,
}: ProgressiveFormStepProps) => {
  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.div
          key={`step-${stepIndex}`}
          initial={{ opacity: 0, x: 60, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -60, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="p-6 rounded-2xl bg-gradient-to-br from-gold/8 to-secondary/5 border-2 border-gold/20 backdrop-blur-sm"
        >
          {children}
          <div className="flex items-center justify-between mt-5">
            <div>
              {showBack && onBack && (
                <motion.button
                  type="button"
                  onClick={onBack}
                  whileHover={{ scale: 1.08, x: 4 }}
                  whileTap={{ scale: 0.92 }}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-body font-semibold text-gold hover:text-secondary bg-gold/10 hover:bg-gold/20 border border-gold/30 hover:border-gold/50 transition-all shadow-sm hover:shadow-md"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  חזרה
                </motion.button>
              )}
            </div>
            <div>
              {showSkip && onSkip && (
                <motion.button
                  type="button"
                  onClick={onSkip}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-body font-semibold text-gold hover:text-secondary bg-gold/10 hover:bg-gold/20 border border-gold/30 hover:border-gold/50 transition-all shadow-sm hover:shadow-md"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  דילוג
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProgressiveFormStep;
