import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Calendar, Star, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface Halacha {
  id: string;
  title: string;
  content: string;
  hebrew_date: string | null;
  category: string;
  is_seasonal: boolean;
  display_date: string;
  created_at: string;
}

const HalachaPage = () => {
  const [halachot, setHalachot] = useState<Halacha[]>([]);
  const [seasonal, setSeasonal] = useState<Halacha[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('daily_halacha')
        .select('*')
        .eq('is_active', true)
        .order('display_date', { ascending: false });

      if (data) {
        setHalachot(data.filter(h => !h.is_seasonal));
        setSeasonal(data.filter(h => h.is_seasonal));
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const todayHalacha = halachot[0];

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-10 max-w-4xl" dir="rtl">
        <Link to="/" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-bold text-sm mb-6 transition-colors">
          <ArrowRight className="w-4 h-4" /> חזרה לדף הבית
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-bold mb-4">
            <BookOpen className="w-4 h-4" /> הלכה יומית
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-black text-foreground mb-3">הלכה יומית והוראות עונתיות</h1>
          <p className="text-muted-foreground">תוכן הלכתי יומי מעודכן מהרב שליט"א</p>
          <div className="h-1 bg-gradient-gold max-w-24 mx-auto rounded-full mt-4" />
        </motion.div>

        {loading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground font-semibold">טוען...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Today's Halacha - Featured */}
            {todayHalacha && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-2xl shadow-card ornament-border overflow-hidden">
                <div className="bg-gradient-hero p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center backdrop-blur-sm">
                      <Star className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h2 className="text-xl font-display font-black text-primary-foreground">הלכה להיום</h2>
                      {todayHalacha.hebrew_date && (
                        <p className="text-primary-foreground/70 text-sm font-semibold">{todayHalacha.hebrew_date}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-display font-black text-foreground mb-3">{todayHalacha.title}</h3>
                  <p className="text-foreground/80 leading-relaxed whitespace-pre-line">{todayHalacha.content}</p>
                </div>
              </motion.div>
            )}

            {/* Seasonal Instructions */}
            {seasonal.length > 0 && (
              <div>
                <h2 className="text-xl font-display font-black text-foreground mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-accent" /> הוראות עונתיות מהרב
                </h2>
                <div className="space-y-3">
                  {seasonal.map((item, i) => (
                    <motion.div key={item.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-card rounded-xl p-5 shadow-card border-r-4 border-accent">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-display font-black text-foreground">{item.title}</h3>
                        {item.hebrew_date && (
                          <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-full font-bold">{item.hebrew_date}</span>
                        )}
                      </div>
                      <p className="text-foreground/80 text-sm leading-relaxed whitespace-pre-line">{item.content}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Past Halachot */}
            {halachot.length > 1 && (
              <div>
                <h2 className="text-xl font-display font-black text-foreground mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" /> הלכות קודמות
                </h2>
                <div className="space-y-3">
                  {halachot.slice(1).map((item, i) => (
                    <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-card rounded-xl p-5 shadow-card">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-display font-bold text-foreground">{item.title}</h3>
                        <span className="text-xs text-muted-foreground font-mono">
                          {new Date(item.display_date).toLocaleDateString('he-IL')}
                        </span>
                      </div>
                      <p className="text-foreground/80 text-sm leading-relaxed whitespace-pre-line">{item.content}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {halachot.length === 0 && seasonal.length === 0 && (
              <div className="text-center py-16 bg-card rounded-2xl shadow-card">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground font-semibold text-lg">אין תוכן הלכתי כרגע</p>
                <p className="text-muted-foreground text-sm mt-1">התוכן יתעדכן בקרוב על ידי הרב</p>
              </div>
            )}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default HalachaPage;
