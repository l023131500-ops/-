import { motion } from 'framer-motion';
import { Sun, Sunrise, Sunset, Moon, Clock } from 'lucide-react';
import { getDailyZmanim } from '@/data/synagogues';

const iconMap: Record<string, React.ReactNode> = {
  'עלות השחר': <Moon className="w-3.5 h-3.5" />,
  'הנץ החמה': <Sunrise className="w-3.5 h-3.5" />,
  'שקיעה': <Sunset className="w-3.5 h-3.5" />,
  'צאת הכוכבים': <Moon className="w-3.5 h-3.5" />,
  'חצות היום': <Sun className="w-3.5 h-3.5" />,
};

const ZmanimTicker = () => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const dailyZmanim = getDailyZmanim(now);
  const getMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };
  const nextZmanIndex = dailyZmanim.findIndex(z => getMinutes(z.time) > currentMinutes);

  // Double the list for infinite scroll effect
  const items = [...dailyZmanim, ...dailyZmanim, ...dailyZmanim];

  return (
    <div className="bg-card rounded-lg shadow-card ornament-border overflow-hidden h-full flex flex-col">
      <div className="bg-gradient-hero px-3 py-3 text-center shrink-0">
        <h3 className="text-sm font-display font-bold text-primary-foreground flex items-center justify-center gap-1.5">
          <Sun className="w-4 h-4 text-gold-light" />
          זמני היום
        </h3>
        <p className="text-[10px] text-primary-foreground/60 mt-0.5">חצור הגלילית</p>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {/* Fade edges */}
        <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-card to-transparent z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-card to-transparent z-10 pointer-events-none" />

        <motion.div
          animate={{ y: ['0%', '-66.66%'] }}
          transition={{ duration: 40, ease: 'linear', repeat: Infinity }}
          className="py-2"
        >
          {items.map((zman, i) => {
            const origIndex = i % dailyZmanim.length;
            const isNext = origIndex === nextZmanIndex;
            return (
              <div
                key={`${zman.name}-${i}`}
                className={`flex items-center justify-between px-3 py-2 mx-1.5 my-1 rounded text-xs transition-colors ${
                  isNext
                    ? 'bg-destructive/10 text-destructive font-bold animate-pulse-gentle'
                    : 'hover:bg-muted'
                }`}
              >
                <span className="flex items-center gap-1.5 truncate">
                  {iconMap[zman.name] || <Clock className="w-3.5 h-3.5 text-muted-foreground" />}
                  <span className="truncate">{zman.name}</span>
                </span>
                <span className="font-mono font-semibold mr-1">{zman.time}</span>
              </div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};

export default ZmanimTicker;
