import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import logoMechubarim from '@/assets/logo-mechubarim.png';

const HeroSection = () => {
  return (
    <section className="relative min-h-[75vh] flex items-center justify-center overflow-hidden">
      {/* Hero background.
          There used to be a <video> here pulling an aerial Galilee clip from
          cdn.coverr.co. That URL now returns 404, so every visitor paid for a
          failed request and got nothing — and it was never really visible
          anyway: the overlay below sits at 85–92% opacity over it.
          Replaced with the gradient on its own. Same look, no dead request.
          A self-hosted clip would be the way back to motion here; a third-party
          CDN that can disappear is not. */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(200_50%_12%)] via-[hsl(210_45%_15%)] to-[hsl(200_40%_18%)]" />
      </div>

      {/* Subtle particles */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-hero-foreground/15"
          style={{ top: `${15 + i * 9}%`, right: `${8 + i * 10}%` }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.1, 0.4, 0.1],
          }}
          transition={{ duration: 5 + i * 0.8, repeat: Infinity, delay: i * 0.4 }}
        />
      ))}

      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/8 rounded-full blur-3xl z-[1]" />
      
      <div className="container relative z-10 text-center py-20 pt-28">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex items-center justify-center mb-10"
        >
          <motion.img
            src={logoMechubarim}
            alt="מחוברים יהדות וקהילה"
            className="h-28 md:h-36 drop-shadow-[0_10px_30px_rgba(0,0,0,0.4)] rounded-2xl animate-logo-pulse"
            whileHover={{ scale: 1.06 }}
            transition={{ type: 'spring', stiffness: 300 }}
          />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-5xl md:text-7xl font-display font-black text-hero-foreground mb-4 tracking-tight"
        >
          מחוברים — יהדות וקהילה
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-2xl md:text-3xl text-primary font-display font-bold mb-2"
        >
          חצור הגלילית
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="text-hero-foreground/60 text-lg md:text-xl max-w-2xl mx-auto mt-6 font-body leading-relaxed"
        >
          מרכזים את כל המידע התורני, בתי הכנסת, זמני התפילות והשיעורים במקום אחד
        </motion.p>

        {/* Separator */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.2, delay: 1 }}
          className="h-1 bg-gradient-gold max-w-sm mx-auto mt-10 rounded-full shadow-[0_0_20px_hsl(200_80%_50%/0.3)]"
        />

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: [0, 10, 0] }}
          transition={{ opacity: { delay: 1.5 }, y: { duration: 2, repeat: Infinity } }}
          className="mt-14 text-hero-foreground/25"
        >
          <ChevronDown className="w-7 h-7 mx-auto" aria-hidden="true" />
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
