import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, Play, Volume2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Tip = {
  id: string;
  title: string;
  body: string;
  category: string | null;
  video_url: string | null;
  audio_url: string | null;
  display_order: number;
};

const TipsSection = () => {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("tips")
        .select("id, title, body, category, video_url, audio_url, display_order")
        .eq("is_published", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (data) setTips(data as Tip[]);
      setLoading(false);
    };
    load();
  }, []);

  if (loading || tips.length === 0) return null;

  const categories = Array.from(new Set(tips.map(t => t.category).filter(Boolean) as string[]));
  const filtered = activeCategory === "all" ? tips : tips.filter(t => t.category === activeCategory);

  return (
    <section className="py-20 bg-gradient-to-br from-secondary/5 via-background to-primary/5">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-1.5 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-primary">הטיפים שלנו למיצוי זכויות</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-foreground mb-3">
            💡 טיפים מקצועיים מהשטח
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            אספנו לכם את המידע במדויק שיהיה לכם יותר קל
          </p>
        </motion.div>

        {categories.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            <button
              onClick={() => setActiveCategory("all")}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                activeCategory === "all"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-card border border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              כל הטיפים
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-card border border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-5">
          <AnimatePresence mode="popLayout">
            {filtered.map((tip, i) => (
              <motion.div
                key={tip.id}
                layout
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                whileHover={{ y: -4, scale: 1.01 }}
                className="bg-card rounded-2xl border-2 border-border hover:border-primary/40 p-6 shadow-md hover:shadow-xl transition-all"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0 shadow-md">
                    <Lightbulb className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {tip.category && (
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wide text-primary bg-primary/10 rounded-full px-2 py-0.5 mb-1">
                        {tip.category}
                      </span>
                    )}
                    <h3 className="text-lg font-bold text-foreground leading-tight">{tip.title}</h3>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap mb-3">
                  {tip.body}
                </p>
                {tip.video_url && (
                  <div className="mt-3 rounded-lg overflow-hidden bg-muted">
                    <video src={tip.video_url} controls className="w-full" preload="metadata">
                      <track kind="captions" />
                    </video>
                  </div>
                )}
                {tip.audio_url && (
                  <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-muted">
                    <Volume2 className="w-4 h-4 text-primary shrink-0" />
                    <audio src={tip.audio_url} controls className="w-full h-8" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default TipsSection;
