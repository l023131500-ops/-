import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Copy, Check, ArrowLeft, Building2 } from "lucide-react";
import { toast } from "sonner";
import { getPublicOrigin } from "@/lib/utils";

const BULK_TOKEN = "main";

const SynagogueBanner = () => {
  const [copied, setCopied] = useState(false);
  const link = `${getPublicOrigin()}/bulk-upload/${BULK_TOKEN}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("הקישור הועתק! שתפו עם בתי כנסת נוספים");
      setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error("לא הצלחנו להעתיק");
    }
  };

  return (
    <section className="relative py-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-gold/5" />

      <div className="relative z-10 container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto"
        >
          <div className="relative bg-card/60 backdrop-blur-sm rounded-2xl border border-primary/20 shadow-md p-6 md:p-7 overflow-hidden">
            <div className="flex flex-col md:flex-row items-center gap-5">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary" />
              </div>

              <div className="flex-1 text-center md:text-right">
                <h3 className="font-display text-lg md:text-xl font-bold text-foreground mb-1">
                  בתי כנסת, מוזמנים לצרף שיעורי תורה
                </h3>
                <p className="font-body text-sm text-muted-foreground">
                  הוסיפו את שיעורי התורה של בית הכנסת למאגר — ומי שמחפש שיעור באזור ימצא אתכם
                </p>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    to={`/bulk-upload/${BULK_TOKEN}`}
                    className="group flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary/90 hover:bg-primary text-primary-foreground font-body font-bold text-sm shadow transition-all"
                  >
                    <span>הוספת שיעורים</span>
                    <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                  </Link>
                </motion.div>

                <motion.button
                  onClick={handleCopy}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 font-body font-bold text-sm transition-all ${
                    copied
                      ? "bg-teal/15 border-teal/40 text-teal"
                      : "bg-background/60 border-primary/30 text-foreground hover:border-primary/60 hover:bg-primary/5"
                  }`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span className="hidden sm:inline">{copied ? "הועתק!" : "העתק"}</span>
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default SynagogueBanner;
