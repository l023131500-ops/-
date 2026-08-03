import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Phone, MapPin, BookOpen, Droplets, Scale, Heart, Scroll,
  Users, Star, Info, ChevronDown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { KnowledgeItem } from '@/lib/knowledgeStore';
import logoHazor from '@/assets/logo-hazor.png';
import logoMechubarim from '@/assets/logo-mechubarim.png';
import Footer from '@/components/Footer';

const categoryIcons: Record<string, React.ReactNode> = {
  'סת"ם': <Scroll className="w-6 h-6" />,
  'כשרות': <Scale className="w-6 h-6" />,
  'מקוואות': <Droplets className="w-6 h-6" />,
  'גמ"חים': <Heart className="w-6 h-6" />,
  'נישואין': <Star className="w-6 h-6" />,
  'פטירה ואבלות': <Users className="w-6 h-6" />,
  'מידע כללי': <Info className="w-6 h-6" />,
  'בית דין': <Scale className="w-6 h-6" />,
  'ייעוץ נישואין': <Heart className="w-6 h-6" />,
};

const categoryColors: Record<string, string> = {
  'סת"ם': 'from-amber-600 to-amber-800',
  'כשרות': 'from-emerald-600 to-emerald-800',
  'מקוואות': 'from-sky-600 to-sky-800',
  'גמ"חים': 'from-rose-500 to-rose-700',
  'נישואין': 'from-violet-500 to-violet-700',
  'פטירה ואבלות': 'from-slate-600 to-slate-800',
  'מידע כללי': 'from-teal-600 to-teal-800',
  'בית דין': 'from-indigo-600 to-indigo-800',
  'ייעוץ נישואין': 'from-pink-500 to-pink-700',
};

const ReligiousInfoPage = () => {
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchKnowledge = async () => {
      const { data } = await supabase.from('knowledge_base').select('*').eq('is_active', true).order('category');
      if (data) setKnowledge(data.map(d => ({
        id: d.id, category: d.category, subcategory: d.subcategory || undefined,
        title: d.title, content: d.content, phone: d.phone || undefined,
        address: d.address || undefined, contact_name: d.contact_name || undefined,
        image_url: d.image_url || undefined,
      })));
      setLoading(false);
    };
    fetchKnowledge();
  }, []);

  const categories = [...new Set(knowledge.map(k => k.category))];
  const filteredItems = selectedCategory ? knowledge.filter(k => k.category === selectedCategory) : [];

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-hero py-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <div className="container flex items-center justify-between relative z-10">
          <Link to="/" className="flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors">
            <ArrowRight className="w-5 h-5" /><span className="font-display font-bold text-sm">חזרה לאתר</span>
          </Link>
          <div className="flex items-center gap-3">
            <img src={logoHazor} alt="חצור" className="h-12 rounded-lg" />
            <img src={logoMechubarim} alt="מחוברים" className="h-12 rounded-lg" />
          </div>
        </div>
        <div className="container text-center mt-6 relative z-10">
          <h1 className="text-3xl md:text-4xl font-display font-black text-primary-foreground mb-2">מידע דת וקהילה</h1>
          <p className="text-primary-foreground/70 text-sm">כל המידע הדתי והקהילתי של חצור הגלילית במקום אחד</p>
        </div>
      </header>

      <div className="container py-10">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-muted-foreground font-semibold text-sm">טוען מידע...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
              {categories.map(cat => (
                <motion.button key={cat} onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  className={`p-5 rounded-2xl border transition-all duration-300 text-right ${
                    selectedCategory === cat
                      ? 'border-primary bg-primary/10 shadow-elevated'
                      : 'border-border bg-card hover:border-primary/30 shadow-card'
                  }`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${categoryColors[cat] || 'from-primary to-primary'} text-white mb-3`}>
                    {categoryIcons[cat] || <BookOpen className="w-6 h-6" />}
                  </div>
                  <h3 className="font-display font-black text-foreground">{cat}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{knowledge.filter(k => k.category === cat).length} פריטים</p>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground mt-2 transition-transform ${selectedCategory === cat ? 'rotate-180' : ''}`} />
                </motion.button>
              ))}
            </div>

            {selectedCategory && filteredItems.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <h2 className="text-2xl font-display font-black text-foreground mb-4">{selectedCategory}</h2>
                {filteredItems.map((item, i) => (
                  <motion.div key={item.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-card rounded-2xl p-5 shadow-card border border-border hover:border-primary/20 transition-all">
                    <h3 className="font-display font-black text-foreground text-lg mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">{item.content}</p>
                    <div className="flex flex-wrap gap-3">
                      {item.phone && (
                        <a href={`tel:${item.phone}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:text-primary/80">
                          <Phone className="w-4 h-4" /> {item.phone}
                        </a>
                      )}
                      {item.address && (
                        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" /> {item.address}
                        </span>
                      )}
                      {item.contact_name && (
                        <span className="text-sm text-accent font-bold">{item.contact_name}</span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default ReligiousInfoPage;
