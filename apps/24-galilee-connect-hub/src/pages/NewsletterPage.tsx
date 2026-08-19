import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, ArrowRight, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import Footer from '@/components/Footer';
import logoMechubarim from '@/assets/logo-mechubarim.png';

interface Newsletter {
  id: string;
  title: string;
  description: string | null;
  pdf_url: string;
  issue_date: string;
  created_at: string;
}

const NewsletterPage = () => {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('newsletters')
        .select('*')
        .eq('is_active', true)
        .order('issue_date', { ascending: false });
      if (data) setNewsletters(data);
      setLoading(false);
    };
    fetch();
  }, []);

  const latest = newsletters[0];

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-10 max-w-4xl" dir="rtl">
        <Link to="/" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-bold text-sm mb-6 transition-colors">
          <ArrowRight className="w-4 h-4" /> חזרה לדף הבית
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <img src={logoMechubarim} alt="מחוברים" className="h-20 mx-auto mb-4 rounded-xl shadow-card" />
          <h1 className="text-3xl md:text-4xl font-display font-black text-foreground mb-3">עלון "מחוברים"</h1>
          <p className="text-muted-foreground">העלון השבועי של הקהילה — יהדות, קהילה ואקטואליה</p>
          <div className="h-1 bg-gradient-gold max-w-24 mx-auto rounded-full mt-4" />
        </motion.div>

        {loading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground font-semibold">טוען...</p>
          </div>
        ) : newsletters.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl shadow-card">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-semibold text-lg">אין עלונים זמינים כרגע</p>
            <p className="text-muted-foreground text-sm mt-1">העלון הבא יעלה בקרוב</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Latest issue - featured */}
            {latest && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-2xl shadow-card ornament-border overflow-hidden">
                <div className="bg-gradient-hero p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center backdrop-blur-sm">
                        <FileText className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <div>
                        <h2 className="text-xl font-display font-black text-primary-foreground">גיליון אחרון</h2>
                        <p className="text-primary-foreground/70 text-sm font-semibold">
                          {new Date(latest.issue_date).toLocaleDateString('he-IL')}
                        </p>
                      </div>
                    </div>
                    <Button asChild className="bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground backdrop-blur-sm font-bold gap-2">
                      <a href={latest.pdf_url} target="_blank" rel="noopener noreferrer">
                        <Download className="w-4 h-4" /> הורד PDF
                      </a>
                    </Button>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-display font-black text-foreground mb-2">{latest.title}</h3>
                  {latest.description && (
                    <p className="text-foreground/80 leading-relaxed">{latest.description}</p>
                  )}
                  <div className="mt-4">
                    <iframe src={latest.pdf_url} className="w-full h-[500px] rounded-xl border border-border" title={latest.title} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Archive */}
            {newsletters.length > 1 && (
              <div>
                <h2 className="text-xl font-display font-black text-foreground mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-accent" /> ארכיון גיליונות
                </h2>
                <div className="grid gap-3">
                  {newsletters.slice(1).map((nl, i) => (
                    <motion.div key={nl.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-card rounded-xl p-4 shadow-card flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-display font-bold text-foreground text-sm">{nl.title}</h3>
                          <p className="text-xs text-muted-foreground">{new Date(nl.issue_date).toLocaleDateString('he-IL')}</p>
                        </div>
                      </div>
                      <Button asChild variant="outline" size="sm" className="gap-2 font-bold">
                        <a href={nl.pdf_url} target="_blank" rel="noopener noreferrer">
                          <Download className="w-4 h-4" /> הורד
                        </a>
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default NewsletterPage;
