import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, ChevronRight, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Tip = { id: string; title: string; content: string };

const fallbackTips: Tip[] = [
  { id: "f1", title: "התחל בסיפור קצר", content: "פתיחה עם סיפור או משל מחבר את הקהל מיד לשיעור ומגביר קשב." },
  { id: "f2", title: "תן לכל אחד להרגיש שייך", content: "פנה בשם, שאל שאלות, וצור אווירה שכל משתתף ירגיש בה חשוב." },
  { id: "f3", title: "הספק לימודי קבוע", content: "קביעת קצב לימודי ברור עוזרת לשמור על מחויבות לאורך זמן." },
  { id: "f4", title: "השתמש בכלים שיווקיים", content: "פלייר מעוצב או הודעת וואטסאפ מקצועית מביאים יותר משתתפים חדשים." },
];

const TipsSection = () => {
  const [tips, setTips] = useState<Tip[]>(fallbackTips);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    supabase.from("tips").select("id,title,content").eq("is_active", true).order("display_date", { ascending: false }).limit(20).then(({ data }) => {
      if (data && data.length > 0) setTips(data);
    });
  }, []);

  useEffect(() => {
    const t = setInterval(() => setIndex(i => (i + 1) % tips.length), 6000);
    return () => clearInterval(t);
  }, [tips.length]);

  if (tips.length === 0) return null;
  const current = tips[index];
  const dotCount = Math.min(tips.length, 8);
  const activeDot = Math.floor((index * dotCount) / tips.length);

  return (
    <section className="py-20 bg-gradient-to-br from-secondary/5 via-background to-secondary/10">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          {/* This band drew Lightbulb twice: here, and again on the card below.
              The chip's own words open with "טיפים", so its glyph repeated the
              label beside it. The card's tile keeps its lightbulb — a rotating
              card shows a tip's title and body and nothing on it says the word
              "tip", so there the mark carries what the text does not. */}
          <div className="inline-flex items-center bg-secondary/10 text-secondary rounded-full px-4 py-1.5 mb-4 text-sm font-medium">
            טיפים וכלים למגיד השיעור
          </div>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
            תובנה קצרה ליום, לשימוש בשיעור עצמו
          </h2>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          <div className="bg-card rounded-3xl p-8 md:p-10 border border-border shadow-lg relative overflow-hidden min-h-[220px]">
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-secondary/10 rounded-full blur-3xl" />
            <AnimatePresence mode="wait">
              <motion.div key={current.id}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4 }}
                className="relative">
                <div className="w-12 h-12 rounded-2xl bg-secondary/15 flex items-center justify-center mb-4">
                  <Lightbulb className="w-6 h-6 text-secondary" />
                </div>
                <h3 className="font-heading text-2xl font-bold text-foreground mb-3">{current.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-base">{current.content}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-between mt-5">
            <button
              onClick={() => setIndex(i => (i - 1 + tips.length) % tips.length)}
              aria-label="הטיפ הקודם"
              className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:border-secondary transition">
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* The dot is the decoration; the button is the target.
                These were 6x6px with no accessible name — eighteen of them, the
                worst touch-target failure on the platform. A 6px dot is fine to
                look at and impossible to hit with a thumb, so the button now
                carries a 24px minimum hit area (the WCAG floor) with the small
                dot centred inside it: visually identical, actually tappable.
                Without a label these also read as eighteen unnamed buttons to a
                screen reader, so each says which tip it goes to. */}
            <div className="flex gap-0.5" role="tablist" aria-label="ניווט בין טיפים">
              {Array.from({ length: dotCount }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(Math.floor((i * tips.length) / dotCount))}
                  role="tab"
                  aria-label={`טיפ ${i + 1} מתוך ${dotCount}`}
                  aria-selected={i === activeDot}
                  className="min-w-6 min-h-6 flex items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary"
                >
                  <span
                    aria-hidden="true"
                    className={`block h-1.5 rounded-full transition-all ${
                      i === activeDot ? "w-6 bg-secondary" : "w-1.5 bg-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
            </div>

            <button
              onClick={() => setIndex(i => (i + 1) % tips.length)}
              aria-label="הטיפ הבא"
              className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:border-secondary transition">
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TipsSection;
