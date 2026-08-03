import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, Sparkles, MapPin, BookOpen, Phone, Copy, Check } from 'lucide-react';
import { useSynagogues } from '@/hooks/useSynagogues';
import Footer from '@/components/Footer';

const AllSynagoguesPage = () => {
  const { synagogues, loading } = useSynagogues();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/synagogue/${id}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  /** Get prayer time color */
  const getTimeClass = (timeStr: string) => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [h, m] = timeStr.split(':').map(Number);
    const prayerMinutes = h * 60 + m;
    if (prayerMinutes < currentMinutes) return 'text-muted-foreground';
    if (prayerMinutes - currentMinutes <= 60) return 'text-destructive font-black animate-pulse';
    return 'text-primary';
  };

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="flex items-center gap-2 text-primary font-bold hover:underline text-sm">
            <ArrowRight className="w-4 h-4" /> חזרה לדף הבית
          </Link>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-display font-black text-foreground mb-3">
            כל בתי הכנסת בחצור הגלילית
          </h1>
          <p className="text-muted-foreground text-sm">{synagogues.length} בתי כנסת — לחצו על כרטיסיה לפרטים מלאים</p>
          <div className="h-1 bg-gradient-gold max-w-24 mx-auto rounded-full mt-4" />
        </motion.div>

        {loading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground font-semibold">טוען בתי כנסת...</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {synagogues.map((syn, i) => {
              const weekday = syn.prayerTimes.filter(p => p.day === 'weekday' && !p.no_minyan);
              const shabbat = syn.prayerTimes.filter(p => p.day === 'shabbat' && !p.no_minyan);
              return (
                <motion.div key={syn.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-2xl shadow-card overflow-hidden border border-border/40 hover:shadow-elevated hover:border-primary/15 transition-all"
                  role="article"
                  aria-label={`בית הכנסת ${syn.name}`}
                >
                  <div className="pt-6 pb-3 flex flex-col items-center">
                    {syn.logo_url ? (
                      <div className="w-16 h-16 rounded-xl bg-card shadow-card ring-1 ring-border/50 flex items-center justify-center mb-3">
                        <img src={syn.logo_url} alt={syn.name} className="w-12 h-12 object-contain rounded-lg" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gradient-gold flex items-center justify-center text-foreground font-display font-black text-xl mb-3">
                        {syn.name.charAt(0)}
                      </div>
                    )}
                    <h2 className="text-base font-display font-black text-foreground px-4 text-center">{syn.name}</h2>
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{syn.neighborhood}</span>
                      <span className="font-bold px-2 py-0.5 rounded-full bg-primary/8 text-primary border border-primary/10 text-[10px]">{syn.nusach}</span>
                    </div>
                  </div>

                  <div className="px-4 pb-3 space-y-2">
                    {weekday.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1 mb-1.5">
                          <Clock className="w-3 h-3 text-primary" />
                          <span className="text-[10px] font-bold text-foreground">חול</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {weekday.map((p) => (
                            <div key={p.id} className="bg-muted/60 rounded-lg py-1 px-2 text-center border border-border/30">
                              <div className="text-[9px] text-muted-foreground font-semibold">{p.name}</div>
                              <div className={`text-[11px] font-mono font-black ${getTimeClass(p.time)}`}>{p.time}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {shabbat.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1 mb-1.5">
                          <Sparkles className="w-3 h-3 text-accent" />
                          <span className="text-[10px] font-bold text-foreground">שבת</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {shabbat.map((p) => (
                            <div key={p.id} className="bg-accent/5 rounded-lg py-1 px-2 text-center border border-accent/10">
                              <div className="text-[9px] text-muted-foreground font-semibold">{p.name}</div>
                              <div className="text-[11px] font-mono font-black text-accent">{p.time}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="px-4 pb-4 flex gap-2">
                    <Link to={`/synagogue/${syn.id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground font-bold py-2 rounded-xl text-xs hover:brightness-110 transition-all">
                      <BookOpen className="w-3.5 h-3.5" /> פרטים מלאים
                    </Link>
                    <button onClick={() => handleCopy(syn.id)} aria-label={`העתק קישור ל${syn.name}`}
                      className="flex items-center justify-center gap-1 bg-muted text-foreground font-bold py-2 px-3 rounded-xl text-xs hover:bg-muted/80 transition-colors">
                      {copiedId === syn.id ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default AllSynagoguesPage;
