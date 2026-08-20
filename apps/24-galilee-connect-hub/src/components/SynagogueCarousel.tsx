import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Clock, Sparkles, BookOpen, Phone, ChevronLeft, ChevronRight, Heart, Megaphone, MapPin, Copy, Check, Send, ExternalLink, List, User } from 'lucide-react';
import type { SynagogueDB } from '@/hooks/useSynagogues';
import { getPublicOrigin } from '@/lib/utils';
import LessonsTicker from './LessonsTicker';

const VISIBLE_COUNT = 3;
const ROTATE_INTERVAL = 5000;

/** Get prayer time color based on current time */
const getPrayerTimeColor = (timeStr: string) => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [h, m] = timeStr.split(':').map(Number);
  const prayerMinutes = h * 60 + m;

  if (prayerMinutes < currentMinutes) return 'past'; // dark gray
  if (prayerMinutes - currentMinutes <= 60 && prayerMinutes > currentMinutes) return 'next'; // red bold
  return 'future'; // standard
};

/* ---- Modern Card ---- */
const SynagogueCard = ({
  synagogue,
  isExpanded,
  onToggle,
}: {
  synagogue: SynagogueDB;
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  const weekday = synagogue.prayerTimes.filter(p => p.day === 'weekday' && !p.no_minyan);
  const shabbat = synagogue.prayerTimes.filter(p => p.day === 'shabbat' && !p.no_minyan);
  const [copied, setCopied] = useState(false);

  const shareLink = `${getPublicOrigin()}/synagogue/${synagogue.id}`;
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const PrayerTimeCell = ({ name, time, isShabbat }: { name: string; time: string; isShabbat?: boolean }) => {
    const status = getPrayerTimeColor(time);
    return (
      <div className={`rounded-xl py-1.5 px-1 text-center border transition-colors ${
        isShabbat ? 'bg-accent/5 border-accent/10 hover:border-accent/25' : 'bg-muted/60 border-border/30 hover:border-primary/20'
      }`}>
        <div className="text-[9px] text-muted-foreground font-semibold leading-tight">{name}</div>
        <div className={`text-xs font-mono font-black mt-0.5 ${
          status === 'next' ? 'text-destructive animate-pulse' :
          status === 'past' ? 'text-muted-foreground' :
          isShabbat ? 'text-accent' : 'text-primary'
        }`} aria-label={`${name} בשעה ${time}`}>
          {time}
        </div>
      </div>
    );
  };

  return (
    <motion.div
      layout
      onClick={onToggle}
      className="relative rounded-3xl overflow-visible cursor-pointer group"
      transition={{ layout: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }}
      role="article"
      aria-label={`בית הכנסת ${synagogue.name}`}
    >
      <div className={`relative rounded-3xl overflow-hidden transition-all duration-400 ${
        isExpanded
          ? 'bg-card shadow-elevated ring-2 ring-primary/25 scale-[1.02]'
          : 'bg-card/90 shadow-card hover:shadow-elevated ring-1 ring-border/40 hover:ring-primary/20 hover:scale-[1.01]'
      }`}>
        <div className="absolute inset-0 bg-gradient-to-b from-primary/3 via-transparent to-transparent pointer-events-none rounded-3xl" />

        {/* Logo */}
        <div className="relative pt-7 pb-3 flex flex-col items-center">
          <motion.div
            animate={isExpanded ? { scale: 1.1, y: -3 } : { scale: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-400 ${
              isExpanded
                ? 'bg-card shadow-elevated ring-2 ring-primary/30'
                : 'bg-card shadow-card ring-1 ring-border/50 group-hover:ring-primary/20 group-hover:shadow-elevated'
            }`}
          >
            {synagogue.logo_url ? (
              <img src={synagogue.logo_url} alt={synagogue.name} className="w-14 h-14 object-contain rounded-xl" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gradient-gold flex items-center justify-center text-primary-foreground font-display font-black text-xl">
                {synagogue.name.charAt(0)}
              </div>
            )}
          </motion.div>

          <h3 className="text-base font-display font-black text-foreground mt-3 px-4 text-center leading-tight">
            {synagogue.name}
          </h3>
          {synagogue.rabbi && (
            <span className="text-[10px] text-muted-foreground font-medium mt-0.5 flex items-center gap-1">
              <User className="w-2.5 h-2.5" /> {synagogue.rabbi}
            </span>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
              <MapPin className="w-3 h-3" />{synagogue.neighborhood}
            </span>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary/8 text-primary border border-primary/10">
              {synagogue.nusach}
            </span>
          </div>
        </div>

        {/* Prayer times */}
        <div className="px-4 pb-4 space-y-2.5">
          {weekday.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] font-bold text-foreground">תפילות חול</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {weekday.map((p) => <PrayerTimeCell key={p.id} name={p.name} time={p.time} />)}
              </div>
            </div>
          )}
          {shabbat.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span className="text-[11px] font-bold text-foreground">תפילות שבת</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {shabbat.map((p) => <PrayerTimeCell key={p.id} name={p.name} time={p.time} isShabbat />)}
              </div>
            </div>
          )}
        </div>

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-5 space-y-3">
                <div className="h-px bg-gradient-to-l from-transparent via-border to-transparent" />

                {/* Lessons */}
                {synagogue.lessons.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <BookOpen className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[11px] font-bold text-foreground">שיעורים</span>
                    </div>
                    <div className="space-y-1.5">
                      {synagogue.lessons.map((l) => (
                        <div key={l.id} className="bg-muted/40 rounded-xl p-2.5 flex items-center justify-between text-[11px] border border-border/30">
                          <span className="font-bold text-foreground">{l.subject} — {l.teacher}</span>
                          <span className="text-primary font-mono font-bold bg-primary/8 px-2 py-0.5 rounded-lg text-[10px]">{l.day} {l.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Announcements */}
                {synagogue.announcements.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Megaphone className="w-3.5 h-3.5 text-accent" />
                      <span className="text-[11px] font-bold text-foreground">מודעות</span>
                    </div>
                    {synagogue.announcements.map((a) => (
                      <div key={a.id}>
                        <div className="bg-accent/5 rounded-xl p-2.5 text-[11px] text-foreground border-r-2 border-accent font-semibold mb-1.5">
                          {a.content}
                        </div>
                        {a.image_url && (
                          <img src={a.image_url} alt="מודעה" className="w-full rounded-xl mt-1 max-h-48 object-cover" />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Gabaiim */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Phone className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[11px] font-bold text-foreground">גבאים</span>
                  </div>
                  {synagogue.gabaiim.map((g) => (
                    <div key={g.id} className="bg-muted/40 rounded-xl p-2.5 flex items-center justify-between text-[11px] border border-border/30 mb-1.5">
                      <span className="font-bold text-foreground">{g.name}</span>
                      <a href={`tel:${g.phone}`} onClick={e => e.stopPropagation()} className="text-primary font-mono font-bold hover:underline" dir="ltr" aria-label={`התקשר ל${g.name}`}>{g.phone}</a>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  {synagogue.donation_link && (
                    <a href={synagogue.donation_link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-gold text-primary-foreground font-bold py-2.5 rounded-xl hover:brightness-110 transition-all text-[11px]">
                      <Heart className="w-3.5 h-3.5" /> תרומה
                    </a>
                  )}
                  <button onClick={handleCopy}
                    className="flex items-center justify-center gap-1.5 bg-primary/10 text-primary font-bold py-2.5 px-3 rounded-xl hover:bg-primary/15 transition-colors text-[11px]">
                    {copied ? <><Check className="w-3.5 h-3.5" /> הועתק</> : <><Copy className="w-3.5 h-3.5" /> העתק קישור</>}
                  </button>
                  <Link to={`/synagogue/${synagogue.id}`} onClick={e => e.stopPropagation()}
                    className="flex items-center justify-center gap-1.5 bg-muted text-foreground font-bold py-2.5 px-3 rounded-xl hover:bg-muted/80 transition-colors text-[11px]">
                    <ExternalLink className="w-3.5 h-3.5" /> דף מלא
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

/* ---- Carousel ---- */
const SynagogueCarousel = ({ synagogues }: { synagogues: SynagogueDB[] }) => {
  const [startIndex, setStartIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const totalSynagogues = synagogues.length;
  const visibleCount = Math.min(VISIBLE_COUNT, totalSynagogues);

  const getVisible = useCallback(() => {
    const result: SynagogueDB[] = [];
    for (let i = 0; i < visibleCount; i++) {
      result.push(synagogues[(startIndex + i) % totalSynagogues]);
    }
    return result;
  }, [startIndex, synagogues, totalSynagogues, visibleCount]);

  const next = useCallback(() => {
    setStartIndex(prev => (prev + 1) % totalSynagogues);
  }, [totalSynagogues]);

  const prev = useCallback(() => {
    setStartIndex(prev => (prev - 1 + totalSynagogues) % totalSynagogues);
  }, [totalSynagogues]);

  useEffect(() => {
    if (paused || expandedId || totalSynagogues <= visibleCount) return;
    const timer = setInterval(next, ROTATE_INTERVAL);
    return () => clearInterval(timer);
  }, [paused, expandedId, next, totalSynagogues, visibleCount]);

  const visible = getVisible();

  /* המקטע הזה הוא כל תוכן העמוד — כותרת המקטע נשארה על המסך גם כשאין ולו
     בית כנסת אחד, והקרוסלה החזירה null. התוצאה בייצור הייתה שטח לבן ריק
     בגובה שני מסכים מתחת ל"לחצו על בית כנסת לפרטים מלאים", בלי מילה אחת
     שמסבירה אותו — נראה כאילו העמוד נשבר בטעינה. אין להמציא בתי כנסת, ולכן
     מה שנאמר כאן הוא המצב עצמו ומה שפותח אותו. */
  if (totalSynagogues === 0) {
    return (
      <div
        className="rounded-3xl bg-card/90 shadow-card ring-1 ring-border/40 px-6 py-12 text-center"
        role="status"
      >
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15 flex items-center justify-center mx-auto mb-4">
          <MapPin className="w-6 h-6" />
        </div>
        <h3 className="font-display font-black text-foreground text-lg">
          עדיין לא נרשם כאן אף בית כנסת
        </h3>
        <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto leading-relaxed">
          כל בית כנסת מופיע כאן ברגע שהגבאי שלו ממלא את הטופס — זמני התפילות,
          השיעורים, הפעילות ופרטי הקשר.
        </p>
        <Link
          to="/gabai"
          className="inline-flex items-center gap-2 mt-6 bg-primary text-primary-foreground px-5 py-2.5 rounded-2xl font-display font-bold text-sm hover:shadow-elevated transition-shadow"
        >
          <Send className="w-4 h-4" /> כניסה לפורטל גבאים
        </Link>
      </div>
    );
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => { setPaused(false); setExpandedId(null); }}
      role="region"
      aria-label="קרוסלת בתי כנסת"
    >
      {totalSynagogues > visibleCount && (
        <>
          <button onClick={next} aria-label="בית כנסת הבא"
            className="absolute -right-4 top-1/3 z-20 w-10 h-10 rounded-full bg-card shadow-elevated ring-1 ring-border/50 flex items-center justify-center hover:ring-primary/30 hover:shadow-card transition-all text-foreground">
            <ChevronRight className="w-5 h-5" />
          </button>
          <button onClick={prev} aria-label="בית כנסת הקודם"
            className="absolute -left-4 top-1/3 z-20 w-10 h-10 rounded-full bg-card shadow-elevated ring-1 ring-border/50 flex items-center justify-center hover:ring-primary/30 hover:shadow-card transition-all text-foreground">
            <ChevronLeft className="w-5 h-5" />
          </button>
        </>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        <AnimatePresence mode="popLayout">
          {visible.map((syn) => (
            <motion.div
              key={syn.id}
              initial={{ opacity: 0, x: -40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <SynagogueCard
                synagogue={syn}
                isExpanded={expandedId === syn.id}
                onToggle={() => setExpandedId(prev => prev === syn.id ? null : syn.id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="mt-6">
        <LessonsTicker />
      </div>

      <div className="flex flex-col items-center gap-3 mt-6">
        {totalSynagogues > visibleCount && (
          <>
            <p className="text-[11px] text-muted-foreground font-medium">
              {startIndex + 1}–{Math.min(startIndex + visibleCount, totalSynagogues)} מתוך {totalSynagogues}
            </p>
            <div className="flex justify-center gap-1.5">
              {Array.from({ length: totalSynagogues }).map((_, i) => {
                const isActive = (() => {
                  for (let v = 0; v < visibleCount; v++) {
                    if ((startIndex + v) % totalSynagogues === i) return true;
                  }
                  return false;
                })();
                return (
                  <button key={i} onClick={() => setStartIndex(i)} aria-label={`עבור לבית כנסת ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-400 ${
                      isActive ? 'bg-primary w-5' : 'bg-border w-1.5 hover:bg-muted-foreground'
                    }`} />
                );
              })}
            </div>
          </>
        )}

        <Link to="/synagogues"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold py-3 px-8 rounded-2xl hover:brightness-110 transition-all text-sm shadow-card hover:shadow-elevated">
          <List className="w-4 h-4" /> צפה בכל בתי הכנסת
        </Link>
      </div>
    </div>
  );
};

export default SynagogueCarousel;
