import { motion } from 'framer-motion';
import { Sun, Sunrise, Sunset, Moon, Clock } from 'lucide-react';
import { getDailyZmanim } from '@/data/synagogues';

const iconMap: Record<string, React.ReactNode> = {
  'עלות השחר': <Moon className="w-4 h-4" />,
  'הנץ החמה': <Sunrise className="w-4 h-4" />,
  'שקיעה': <Sunset className="w-4 h-4" />,
  'צאת הכוכבים': <Moon className="w-4 h-4" />,
  'חצות היום': <Sun className="w-4 h-4" />,
};

const ZmanimSidebar = () => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const dailyZmanim = getDailyZmanim(now);

  const getMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  // Find the next zman
  const nextZmanIndex = dailyZmanim.findIndex(z => getMinutes(z.time) > currentMinutes);

  return (
    <div className="bg-card rounded-lg shadow-card ornament-border p-5">
      <h3 className="text-lg font-display font-bold text-primary mb-4 flex items-center gap-2">
        <Sun className="w-5 h-5 text-accent" />
        זמני היום — חצור הגלילית
      </h3>
      <div className="space-y-2">
        {dailyZmanim.map((zman, i) => {
          const isNext = i === nextZmanIndex;
          return (
            <motion.div
              key={zman.name}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-center justify-between py-1.5 px-3 rounded-md text-sm transition-colors ${
                isNext
                  ? 'bg-destructive/10 text-destructive font-bold animate-pulse-gentle'
                  : 'hover:bg-muted'
              }`}
            >
              <span className="flex items-center gap-2">
                {iconMap[zman.name] || <Clock className="w-4 h-4 text-muted-foreground" />}
                {zman.name}
              </span>
              <span className="font-mono font-semibold">{zman.time}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ZmanimSidebar;
