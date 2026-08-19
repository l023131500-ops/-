import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, ArrowLeft } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useNavigate } from "react-router-dom";
import { loadFromStorage, saveToStorage } from "@/lib/localStorage";

const REMINDER_INTERVAL = 60 * 60 * 1000; // 1 hour

export default function ProfileCompletePrompt() {
  const { profile, userId } = useApp();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!userId || !profile || profile.profileComplete) return;

    const showPrompt = () => {
      const lastDismissed = loadFromStorage<number>(`profile_prompt_time_${userId}`, 0);
      const now = Date.now();
      if (now - lastDismissed >= REMINDER_INTERVAL) {
        setShow(true);
      }
    };

    // Show after 2 seconds on first load
    const timer = setTimeout(showPrompt, 2000);

    // Then check every minute if an hour has passed
    intervalRef.current = setInterval(showPrompt, 60 * 1000);

    return () => {
      clearTimeout(timer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [userId, profile?.profileComplete]);

  const dismiss = () => {
    setShow(false);
    if (userId) saveToStorage(`profile_prompt_time_${userId}`, Date.now());
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className="fixed bottom-6 start-6 z-50 w-80"
        >
          <div className="glass-card rounded-bento p-5 border border-accent/20 shadow-2xl">
            <button onClick={dismiss} className="absolute top-3 end-3 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">השלם את הפרופיל שלך</h3>
                <p className="text-[10px] text-muted-foreground">חובה להזין נתונים ראשוניים</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              הגדר נתונים כמו הכנסות, הוצאות, דיור וביטוחים — ונמצא לך זכויות והטבות שמגיעות לך!
            </p>
            <button
              onClick={() => { dismiss(); navigate("/profile"); }}
              className="btn-clay-gold w-full text-xs py-2.5 rounded-xl flex items-center justify-center gap-2"
            >
              עדכן פרופיל
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
