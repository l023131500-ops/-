import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Copy, Check, Sparkles, ArrowLeft, Share2 } from "lucide-react";
import { toast } from "sonner";
import { getPublicOrigin } from "@/lib/utils";

const BULK_TOKEN = "main";

const BulkUploadBanner = () => {
  const [copied, setCopied] = useState(false);

  const link = `${getPublicOrigin()}/bulk-upload/${BULK_TOKEN}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("הקישור הועתק! שתפו אותו עם החברים 💫");
      setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error("לא הצלחנו להעתיק");
    }
  };

  return (
    <section className="relative py-16 overflow-hidden">
      {/* Soft gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gold/8 via-teal/5 to-magenta/8" />
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-gold/10 rounded-full blur-[140px]" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-teal/10 rounded-full blur-[140px]" />

      <div className="relative z-10 container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <div className="relative bg-card/70 backdrop-blur-md rounded-3xl border-2 border-gold/20 shadow-elegant p-8 md:p-10 overflow-hidden">
            {/* Floating sparkle */}
            <motion.div
              animate={{ rotate: [0, 12, -8, 0], scale: [1, 1.08, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-5 left-5 text-gold/60"
            >
              <Sparkles className="w-7 h-7" />
            </motion.div>

            <div className="text-center mb-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gold/15 border border-gold/30 text-gold text-xs font-body font-bold mb-5"
              >
                <Share2 className="w-3.5 h-3.5" />
                שיתוף קהילתי
              </motion.div>

              <h3 className="font-display text-2xl md:text-3xl font-black text-foreground mb-3">
                מוזמנים לשתף את הסביבה שלכם
                <br />
                <span className="text-gradient-brand">בהפצת התורה</span>
              </h3>
              <p className="font-body text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
                על ידי הוספת שיעורי תורה למאגר — וגם אפשרות להעתיק את הקישור ולשלוח אותו לחברים שיוסיפו גם הם
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
              {/* Primary CTA */}
              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1"
              >
                <Link
                  to={`/bulk-upload/${BULK_TOKEN}`}
                  className="group flex items-center justify-center gap-2 w-full px-6 py-4 rounded-2xl bg-gradient-to-l from-gold/90 to-gold-light/90 text-navy font-body font-bold text-base shadow-lg hover:shadow-gold/30 hover:shadow-xl transition-all"
                >
                  <span>הוספת שיעורים למאגר</span>
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                </Link>
              </motion.div>

              {/* Copy link button - animated */}
              <motion.button
                onClick={handleCopy}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                animate={
                  copied
                    ? {}
                    : {
                        boxShadow: [
                          "0 0 0 0 hsl(var(--gold) / 0.25)",
                          "0 0 0 12px hsl(var(--gold) / 0)",
                        ],
                      }
                }
                transition={{ duration: 1.8, repeat: Infinity }}
                className={`flex items-center justify-center gap-2 px-6 py-4 rounded-2xl border-2 font-body font-bold text-sm transition-all ${
                  copied
                    ? "bg-teal/15 border-teal/40 text-teal"
                    : "bg-background/60 border-gold/30 text-foreground hover:border-gold/60 hover:bg-gold/5"
                }`}
              >
                <motion.span
                  key={copied ? "check" : "copy"}
                  initial={{ scale: 0.6, opacity: 0, rotate: -90 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 18 }}
                  className="flex items-center"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </motion.span>
                <span>{copied ? "הועתק!" : "העתק קישור לשיתוף"}</span>
              </motion.button>
            </div>

            {/* Tiny link preview */}
            <div className="mt-4 text-center">
              <span className="font-body text-[11px] text-muted-foreground/70 ltr inline-block dir-ltr" dir="ltr">
                {link}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default BulkUploadBanner;
