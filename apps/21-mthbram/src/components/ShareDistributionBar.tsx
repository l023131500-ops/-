import { motion } from "framer-motion";
import { Copy, Share2, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getPublicOrigin } from "@/lib/utils";

const ShareDistributionBar = () => {
  const url = typeof window !== "undefined" ? getPublicOrigin() : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "הקישור הועתק ללוח" });
    } catch {
      toast({ title: "לא הצלחנו להעתיק", variant: "destructive" });
    }
  };

  return (
    <section className="py-8">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-5 rounded-2xl border border-gold/20 bg-card/40 backdrop-blur-sm"
        >
          <div className="flex items-center gap-2 text-center sm:text-right">
            <Sparkles className="w-3.5 h-3.5 text-gold flex-shrink-0" />
            <p className="font-body text-xs text-muted-foreground">
              מוזמנים להפיץ תורה — שתפו את המאגר עם חברים ובני משפחה
            </p>
          </div>
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gold/30 text-gold hover:bg-gold/10 font-body text-xs font-bold transition-all flex-shrink-0"
          >
            <Copy className="w-3 h-3" />
            העתקת קישור
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default ShareDistributionBar;
