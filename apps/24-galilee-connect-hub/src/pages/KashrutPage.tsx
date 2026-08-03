import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Scale, Phone, MapPin, Clock, Shield, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useKashrut } from '@/hooks/useKashrut';
import Footer from '@/components/Footer';

const KashrutPage = () => {
  const { establishments, loading } = useKashrut();
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | 'mehadrin' | 'regular'>('all');

  const filtered = establishments.filter(e => {
    const matchSearch = e.name.includes(search) || e.category.includes(search) || e.address.includes(search);
    const matchLevel = levelFilter === 'all' || e.kashrut_level === levelFilter;
    return matchSearch && matchLevel;
  });

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container max-w-5xl py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-primary font-bold hover:underline text-sm mb-6">
          <ArrowRight className="w-4 h-4" /> חזרה לדף הבית
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Scale className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-black text-foreground mb-3">
            כשרות בחצור הגלילית
          </h1>
          <p className="text-muted-foreground text-sm">מדריך מוסדות הכשרות בעיר</p>
          <div className="h-1 bg-gradient-gold max-w-24 mx-auto rounded-full mt-4" />
        </motion.div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8" role="search" aria-label="חיפוש וסינון כשרות">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="חפש לפי שם, קטגוריה או כתובת..."
              className="pr-10 text-base"
              aria-label="חיפוש כשרות"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'mehadrin', 'regular'] as const).map(level => (
              <button
                key={level}
                onClick={() => setLevelFilter(level)}
                aria-pressed={levelFilter === level}
                className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  levelFilter === level
                    ? 'bg-primary text-primary-foreground shadow-card'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {level === 'all' ? 'הכל' : level === 'mehadrin' ? '🏅 מהדרין' : 'רגיל'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground font-semibold">טוען מידע...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Scale className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-semibold text-lg">לא נמצאו מוסדות כשרות</p>
            <p className="text-muted-foreground text-sm mt-2">המידע יתעדכן בקרוב על ידי מנהל המערכת</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((est, i) => (
              <motion.div
                key={est.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-2xl shadow-card p-6 border border-border/40 hover:shadow-elevated transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-display font-black text-foreground text-lg">{est.name}</h3>
                    <span className="text-sm text-muted-foreground">{est.category}</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-black ${
                    est.kashrut_level === 'mehadrin'
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {est.kashrut_level === 'mehadrin' ? '🏅 מהדרין' : 'רגיל'}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span>{est.address}</span>
                  </div>
                  {est.phone && (
                    <a href={`tel:${est.phone}`} className="flex items-center gap-2 text-primary font-bold hover:underline" dir="ltr" aria-label={`התקשר ל-${est.name}`}>
                      <Phone className="w-4 h-4 shrink-0" />
                      <span>{est.phone}</span>
                    </a>
                  )}
                  {est.opening_hours && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4 shrink-0" />
                      <span>{est.opening_hours}</span>
                    </div>
                  )}
                  {est.certifying_body && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Shield className="w-4 h-4 shrink-0" />
                      <span>גוף מכשיר: {est.certifying_body}</span>
                    </div>
                  )}
                  {est.mashgiach_name && (
                    <div className="bg-muted/50 rounded-xl p-3 mt-2">
                      <span className="text-xs font-bold text-foreground">משגיח: {est.mashgiach_name}</span>
                      {est.mashgiach_phone && (
                        <a href={`tel:${est.mashgiach_phone}`} className="block text-xs text-primary font-mono font-bold mt-1 hover:underline" dir="ltr" aria-label={`התקשר למשגיח ${est.mashgiach_name}`}>
                          📞 {est.mashgiach_phone}
                        </a>
                      )}
                    </div>
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

export default KashrutPage;
