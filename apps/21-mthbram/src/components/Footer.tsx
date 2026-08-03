import { motion } from "framer-motion";
import { Heart, ExternalLink } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

const NEDARIM_URL = "https://www.matara.pro/nedarimplus/online/?mosad=7013027";

const Footer = () => {
  return (
    <footer className="relative bg-navy text-primary-foreground pt-12 pb-6 overflow-hidden border-t border-gold/20">
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-gold/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="relative z-10 container mx-auto px-4 md:px-6">
        {/* Partnership CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-gold/10 border border-gold/30">
            <Heart className="w-3 h-3 text-gold fill-gold" />
            <span className="font-body text-[11px] font-bold text-gold-cream">שותפים בהפצת התורה</span>
          </div>
          <h3 className="font-display text-xl md:text-2xl font-bold text-gold-cream mb-2">
            מעוניינים להיות שותפים בהפצת התורה?
          </h3>
          <p className="font-body text-sm text-gold-cream/70 mb-5">
            תרומתכם מאפשרת לנו להמשיך ולחבר בין לומדים ומלמדים בכל רחבי העולם
          </p>
          <a
            href={NEDARIM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-gold text-navy font-body text-sm font-bold hover:opacity-90 transition-all shadow-gold-ring"
          >
            <Heart className="w-4 h-4" />
            תרומה דרך נדרים פלוס
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </motion.div>

        {/* Bottom bar */}
        <div className="border-t border-gold/15 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <BrandLogo size="sm" />
          <p className="font-body text-xs text-primary-foreground/40 text-center">
            © {new Date().getFullYear()} איגוד השיעורים — מחברים בין לומדים ומלמדים
          </p>
          <a href="tel:0231330600" className="inline-block py-1 font-body text-xs text-gold-cream/60 hover:text-gold transition-colors">
            023-133-0600
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
