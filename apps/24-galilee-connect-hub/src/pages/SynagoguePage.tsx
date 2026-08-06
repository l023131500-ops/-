import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, Sparkles, BookOpen, Phone, MapPin, Heart, Megaphone, Send, Copy, Check, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSynagogue } from '@/hooks/useSynagogues';
import { supabase } from '@/integrations/supabase/client';
import { getDailyZmanim, BACKGROUND_PRESETS } from '@/data/synagogues';
import Footer from '@/components/Footer';

const SynagoguePage = () => {
  const { id } = useParams<{ id: string }>();
  const { synagogue, loading } = useSynagogue(id);
  const [copied, setCopied] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [sent, setSent] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!synagogue) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-center">
          <h1 className="text-2xl font-display font-black text-foreground mb-4">בית הכנסת לא נמצא</h1>
          <Link to="/" className="text-primary font-bold hover:underline">חזרה לדף הבית</Link>
        </div>
      </div>
    );
  }

  const weekday = synagogue.prayerTimes.filter(p => p.day === 'weekday' && !p.no_minyan);
  const shabbat = synagogue.prayerTimes.filter(p => p.day === 'shabbat' && !p.no_minyan);
  const preset = BACKGROUND_PRESETS.find(p => p.id === (synagogue.background_preset || 1)) || BACKGROUND_PRESETS[0];

  /** Get prayer time color */
  const getTimeStyle = (timeStr: string) => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [h, m] = timeStr.split(':').map(Number);
    const prayerMinutes = h * 60 + m;
    if (prayerMinutes < currentMinutes) return 'text-muted-foreground';
    if (prayerMinutes - currentMinutes <= 60) return 'text-destructive font-black animate-pulse';
    return 'text-primary';
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendContact = async () => {
    if (!contactName.trim() || !contactPhone.trim()) return;
    await supabase.from('community_leads').insert({
      name: contactName.trim(),
      phone: contactPhone.trim(),
      message: contactMessage.trim() || `פנייה מדף בית הכנסת ${synagogue.name}`,
      lead_type: 'synagogue',
      synagogue_id: synagogue.id,
    });
    setSent(true);
    setContactName('');
    setContactPhone('');
    setContactMessage('');
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container max-w-4xl py-8">
        <div className="flex items-center justify-between mb-8">
          <Link to="/#synagogues" className="flex items-center gap-2 text-primary font-bold hover:underline text-sm">
            <ArrowRight className="w-4 h-4" /> חזרה לכל בתי הכנסת
          </Link>
          <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-2 font-bold">
            {copied ? <><Check className="w-4 h-4 text-primary" /> הועתק!</> : <><Copy className="w-4 h-4" /> העתק קישור</>}
          </Button>
        </div>

        {/* Header with background preset */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl shadow-elevated overflow-hidden mb-8">
          <div className="p-8 flex flex-col items-center text-center" style={{ background: preset.gradient }}>
            {synagogue.logo_url && (
              <div className="w-24 h-24 rounded-2xl bg-card/95 p-3 shadow-elevated flex items-center justify-center mb-4 border border-primary-foreground/20">
                <img src={synagogue.logo_url} alt={synagogue.name} className="w-18 h-18 object-contain rounded-xl" />
              </div>
            )}
            <h1 className="text-3xl font-display font-black text-primary-foreground">{synagogue.name}</h1>
            {synagogue.rabbi && (
              <div className="flex items-center gap-2 mt-2 text-primary-foreground/80 text-sm">
                <User className="w-4 h-4" />
                <span className="font-bold">רב בית הכנסת: {synagogue.rabbi}</span>
              </div>
            )}
            <div className="flex items-center gap-3 mt-3 text-primary-foreground/70 text-sm">
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{synagogue.address}</span>
              <span className="bg-primary-foreground/15 text-primary-foreground px-3 py-0.5 rounded-full text-xs font-black">{synagogue.nusach}</span>
            </div>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Prayer Times */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-card rounded-2xl shadow-card p-6 space-y-5">
            <h2 className="text-lg font-display font-black text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> זמני תפילות
            </h2>
            {weekday.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-muted-foreground mb-3">ימי חול</h3>
                <div className="grid grid-cols-3 gap-2">
                  {weekday.map((p) => (
                    <div key={p.id} className="bg-muted/60 rounded-xl py-2.5 px-2 text-center border border-border/30">
                      <div className="text-[11px] text-muted-foreground font-semibold">{p.name}</div>
                      <div className={`text-lg font-mono font-black mt-0.5 ${getTimeStyle(p.time)}`}>{p.time}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {shabbat.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-accent" /> שבת
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {shabbat.map((p) => (
                    <div key={p.id} className="bg-accent/5 rounded-xl py-2.5 px-2 text-center border border-accent/10">
                      <div className="text-[11px] text-muted-foreground font-semibold">{p.name}</div>
                      <div className="text-lg font-mono font-black text-accent mt-0.5">{p.time}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Daily Zmanim */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-card rounded-2xl shadow-card p-6">
            <h2 className="text-lg font-display font-black text-foreground flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-accent" /> זמני היום
            </h2>
            <div className="space-y-2">
              {getDailyZmanim().map((z, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/40 border border-border/20">
                  <span className="text-sm font-semibold text-foreground">{z.name}</span>
                  <span className="font-mono font-black text-primary text-sm">{z.time}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Lessons */}
          {synagogue.lessons.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-card rounded-2xl shadow-card p-6">
              <h2 className="text-lg font-display font-black text-foreground flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-primary" /> שיעורים
              </h2>
              <div className="space-y-2">
                {synagogue.lessons.map((l) => (
                  <div key={l.id} className="bg-muted/40 rounded-xl p-3 flex items-center justify-between border border-border/30">
                    <span className="font-bold text-foreground text-sm">{l.subject} — {l.teacher}</span>
                    <span className="text-primary font-mono font-bold bg-primary/8 px-2.5 py-0.5 rounded-lg text-xs">{l.day} {l.time}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Announcements */}
          {synagogue.announcements.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className="bg-card rounded-2xl shadow-card p-6">
              <h2 className="text-lg font-display font-black text-foreground flex items-center gap-2 mb-4">
                <Megaphone className="w-5 h-5 text-accent" /> מודעות
              </h2>
              {synagogue.announcements.map((a) => (
                <div key={a.id}>
                  <div className="bg-accent/5 rounded-xl p-3 text-sm text-foreground border-r-2 border-accent font-semibold mb-2">
                    {a.content}
                  </div>
                  {a.image_url && (
                    <img src={a.image_url} alt="מודעה" className="w-full rounded-xl max-h-60 object-cover mb-2" />
                  )}
                </div>
              ))}
            </motion.div>
          )}

          {/* Gabaiim */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-card rounded-2xl shadow-card p-6">
            <h2 className="text-lg font-display font-black text-foreground flex items-center gap-2 mb-4">
              <Phone className="w-5 h-5 text-primary" /> גבאים
            </h2>
            {synagogue.gabaiim.map((g) => (
              <div key={g.id} className="bg-muted/40 rounded-xl p-3 flex items-center justify-between border border-border/30 mb-2">
                <span className="font-bold text-foreground">{g.name}</span>
                <a href={`tel:${g.phone}`} className="text-primary font-mono font-bold hover:underline" dir="ltr" aria-label={`התקשר ל${g.name}`}>{g.phone}</a>
              </div>
            ))}
          </motion.div>

          {/* Contact Form */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="bg-card rounded-2xl shadow-card p-6 md:col-span-2">
            <h2 className="text-lg font-display font-black text-foreground flex items-center gap-2 mb-4">
              <Send className="w-5 h-5 text-primary" /> שלח פנייה לגבאי
            </h2>
            {sent ? (
              <div className="text-center py-6">
                <Check className="w-10 h-10 text-primary mx-auto mb-2" />
                <p className="font-bold text-foreground">הפנייה נשלחה בהצלחה!</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="שם מלא *" aria-label="שם מלא" aria-required="true" />
                  <Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="טלפון *" dir="ltr" aria-label="טלפון" aria-required="true" />
                </div>
                <textarea
                  value={contactMessage}
                  onChange={e => setContactMessage(e.target.value)}
                  placeholder="הודעה (אופציונלי)"
                  aria-label="הודעה"
                  className="w-full bg-muted/60 rounded-xl p-3 border border-border/50 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <Button onClick={handleSendContact} className="w-full gap-2 font-bold">
                  <Send className="w-4 h-4" /> שלח פנייה
                </Button>
              </div>
            )}
          </motion.div>
        </div>

        {/* Donation */}
        {synagogue.donation_link && (
          <motion.a href={synagogue.donation_link} target="_blank" rel="noreferrer"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="flex items-center justify-center gap-2.5 bg-gradient-gold text-primary-foreground font-black py-4 rounded-2xl mt-8 hover:brightness-110 transition-all text-base">
            <Heart className="w-5 h-5" /> תרומה דיגיטלית מאובטחת
          </motion.a>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default SynagoguePage;
