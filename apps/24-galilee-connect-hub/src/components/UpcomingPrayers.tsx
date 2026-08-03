import { motion } from 'framer-motion';
import { Clock, MapPin } from 'lucide-react';
import { useSynagogues } from '@/hooks/useSynagogues';

interface UpcomingPrayer {
  synagogueName: string;
  prayerName: string;
  time: string;
  minutes: number;
}

const UpcomingPrayers = () => {
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
  );

  const upcoming = allPrayers
    .filter(p => p.minutes > currentMinutes)
    .sort((a, b) => a.minutes - b.minutes)
    .slice(0, 8);

  const isFirst = (i: number) => i === 0;

  return (
    <div className="bg-card rounded-lg shadow-card ornament-border p-5" role="region" aria-label="תפילות קרובות">
      <h3 className="text-lg font-display font-bold text-primary mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-accent" />
        תפילות קרובות
      </h3>
      <div className="space-y-2">
        {upcoming.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-4">אין תפילות קרובות היום</p>
        )}
        {upcoming.map((prayer, i) => (
          <motion.div
            key={`${prayer.synagogueName}-${prayer.prayerName}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
            className={`p-3 rounded-md border transition-all ${
              isFirst(i)
                ? 'border-destructive/40 bg-destructive/5 animate-pulse-gentle'
                : 'border-border hover:border-accent/40 hover:bg-muted/50'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`font-bold text-sm ${isFirst(i) ? 'text-destructive' : 'text-foreground'}`}>
                {prayer.prayerName}
              </span>
              <span className={`font-mono font-bold ${isFirst(i) ? 'text-destructive' : 'text-accent'}`}>
                {prayer.time}
              </span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <MapPin className="w-3 h-3" />
              {prayer.synagogueName}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default UpcomingPrayers;
