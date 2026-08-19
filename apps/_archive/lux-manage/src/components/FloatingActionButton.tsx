import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export default function FloatingActionButton() {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);

  return (
    <div className="fixed bottom-24 start-6 z-40">
      <motion.button
        onClick={() => navigate("/quick-entry")}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="btn-clay w-14 h-14 rounded-2xl gold-gradient flex items-center justify-center text-primary-foreground"
        style={{ boxShadow: "0 8px 32px hsl(38 92% 50% / 0.2), inset 0 2px 4px hsl(0 0% 0% / 0.15)" }}
      >
        <Plus className="w-6 h-6" />
      </motion.button>
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="absolute start-16 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl glass-card text-foreground text-xs font-bold whitespace-nowrap"
          >
            הזנה מהירה
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
