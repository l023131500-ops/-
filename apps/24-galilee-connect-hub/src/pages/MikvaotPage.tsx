import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Droplets, Phone, MapPin, Clock, Users, Heart } from 'lucide-react';
import { useMikvaot } from '@/hooks/useMikvaot';
import Footer from '@/components/Footer';

const MikvaotPage = () => {
  const { mikvaot, loading } = useMikvaot();
  const [typeFilter, setTypeFilter] = useState<'all' | 'men' | 'women'>('all');

  const filtered = typeFilter === 'all' ? mikvaot : mikvaot.filter(m => m.type === typeFilter);

  const ContactButton = ({ phone, label }: { phone: string; label: string }) => (
    <a
      href={`tel:${phone}`}
      className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold py-2.5 px-4 rounded-xl text-sm hover:brightness-110 transition-all"
      dir="ltr"
      aria-label={`התקשר ל${label}`}
    >
      <Phone className="w-4 h-4" />
      {phone}
    </a>
  );

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container max-w-5xl py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-primary font-bold hover:underline text-sm mb-6">
          <ArrowRight className="w-4 h-4" aria-hidden="true" /> חזרה לדף הבית
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Droplets className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-black text-foreground mb-3">
            מקוואות בחצור הגלילית
          </h1>
          <p className="text-muted-foreground text-sm">מידע מלא על שירותי המקוואות בעיר</p>
          <div className="h-1 bg-gradient-gold max-w-24 mx-auto rounded-full mt-4" />
        </motion.div>

        {/* Filter */}
        <div className="flex gap-2 justify-center mb-8" role="group" aria-label="סינון לפי סוג">
          {([
            { value: 'all', label: 'הכל' },
            { value: 'men', label: '🧔 גברים' },
            { value: 'women', label: '👩 נשים' },
          ] as const).map(opt => (
            <button
              key={opt.value}
              onClick={() => setTypeFilter(opt.value)}
              aria-pressed={typeFilter === opt.value}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                typeFilter === opt.value
                  ? 'bg-primary text-primary-foreground shadow-card'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground font-semibold">טוען מידע...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Droplets className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-semibold text-lg">לא נמצאו מקוואות</p>
            <p className="text-muted-foreground text-sm mt-2">המידע יתעדכן בקרוב על ידי מנהל המערכת</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {filtered.map((mik, i) => (
              <motion.div
                key={mik.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-card rounded-2xl shadow-card overflow-hidden border border-border/40 hover:shadow-elevated transition-all"
              >
                {/* Header */}
                <div className={`p-5 ${mik.type === 'women' ? 'bg-accent/5' : 'bg-primary/5'}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-black text-foreground text-xl">{mik.name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-black ${
                      mik.type === 'women'
                        ? 'bg-accent/10 text-accent border border-accent/20'
                        : 'bg-primary/10 text-primary border border-primary/20'
                    }`}>
                      {mik.type === 'women' ? '👩 נשים' : '🧔 גברים'}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 shrink-0 text-primary" />
                    <span>{mik.address}</span>
                  </div>

                  {mik.opening_hours && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 shrink-0 text-primary" />
                      <span>{mik.opening_hours}</span>
                    </div>
                  )}

                  {/* Contact cards */}
                  <div className="space-y-2 mt-4">
                    {mik.manager_name && (
                      <div className="bg-muted/50 rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-muted-foreground">מנהל/ת</span>
                          <p className="font-bold text-foreground text-sm">{mik.manager_name}</p>
                        </div>
                        {mik.manager_phone && <ContactButton phone={mik.manager_phone} label={`מנהל ${mik.name}`} />}
                      </div>
                    )}

                    {mik.rabbi_tahara_name && (
                      <div className="bg-muted/50 rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-muted-foreground">רב טהרה</span>
                          <p className="font-bold text-foreground text-sm">{mik.rabbi_tahara_name}</p>
                        </div>
                        {mik.rabbi_tahara_phone && <ContactButton phone={mik.rabbi_tahara_phone} label={`רב טהרה ${mik.rabbi_tahara_name}`} />}
                      </div>
                    )}

                    {mik.bride_groom_counselor_name && (
                      <div className="bg-accent/5 rounded-xl p-3 flex items-center justify-between border border-accent/10">
                        <div>
                          <span className="text-xs font-bold text-accent flex items-center gap-1">
                            <Heart className="w-3 h-3" /> יועץ/ת כלה/חתן
                          </span>
                          <p className="font-bold text-foreground text-sm">{mik.bride_groom_counselor_name}</p>
                        </div>
                        {mik.bride_groom_counselor_phone && <ContactButton phone={mik.bride_groom_counselor_phone} label="יועץ כלה/חתן" />}
                      </div>
                    )}
                  </div>

                  {mik.phone && (
                    <div className="pt-2">
                      <a
                        href={`tel:${mik.phone}`}
                        className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground font-black py-3 rounded-xl text-base hover:brightness-110 transition-all"
                        dir="ltr"
                        aria-label={`התקשר למקווה ${mik.name}`}
                      >
                        <Phone className="w-5 h-5" />
                        חייגו עכשיו: {mik.phone}
                      </a>
                    </div>
                  )}

                  {mik.notes && (
                    <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2 mt-2">{mik.notes}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default MikvaotPage;
