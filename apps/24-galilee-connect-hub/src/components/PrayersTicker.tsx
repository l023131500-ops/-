import { motion } from 'framer-motion';
import { Clock, MapPin } from 'lucide-react';
import { useSynagogues } from '@/hooks/useSynagogues';

interface UpcomingPrayer {
  synagogueName: string;
  prayerName: string;
  time: string;
  minutes: number;
}

const PrayersTicker = () => {
  const { synagogues } = useSynagogues();
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const allPrayers: UpcomingPrayer[] = synagogues.flatMap(syn =>
    syn.prayerTimes
      .filter(p => p.day === 'weekday' && !p.no_minyan)
      .map(p => ({
        synagogueName: syn.name,
        prayerName: p.name,
        time: p.time,
        minutes: (() => { const [h, m] = p.time.split(':').map(Number); return h * 60 + m; })(),
      }))
  ).sort((a, b) => a.minutes - b.minutes);

  const isClosest = (prayer: UpcomingPrayer, i: number) => {
    const firstUpcomingIdx = allPrayers.findIndex(p => p.minutes > currentMinutes);
    return i === firstUpcomingIdx;
  };

  const items = [...allPrayers, ...allPrayers, ...allPrayers];

  return (
    <div className="bg-card rounded-lg shadow-card ornament-border overflow-hidden h-full flex flex-col">
      <div className="bg-gradient-hero px-3 py-3 text-center shrink-0">
        <h3 className="text-sm font-display font-bold text-primary-foreground flex items-center justify-center gap-1.5">
          <Clock className="w-4 h-4 text-gold-light" />
          תפילות קרובות
        </h3>
        <p className="text-[10px] text-primary-foreground/60 mt-0.5">כל בתי הכנסת</p>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-card to-transparent z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-card to-transparent z-10 pointer-events-none" />

        <motion.div
          animate={{ y: ['0%', '-66.66%'] }}
          transition={{ duration: 120, ease: 'linear', repeat: Infinity }}
          className="py-2"
        >
          {items.map((prayer, i) => {
            const origIndex = i % allPrayers.length;
            const closest = isClosest(prayer, origIndex);
            return (
              <div
                key={`${prayer.synagogueName}-${prayer.prayerName}-${i}`}
                className={`px-3 py-2 mx-1.5 my-1 rounded text-xs border transition-colors ${
                  closest
                    ? 'border-destructive/40 bg-destructive/5 animate-pulse-gentle'
                    : 'border-transparent hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`font-bold ${closest ? 'text-destructive' : 'text-foreground'}`}>
                    {prayer.prayerName}
                  </span>
                  <span className={`font-mono font-bold ${closest ? 'text-destructive' : 'text-accent'}`}>
                    {prayer.time}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground text-[10px]">
                  <MapPin className="w-2.5 h-2.5" />
                  {prayer.synagogueName}
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};

export default PrayersTicker;
