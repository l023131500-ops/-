import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, MapPin, BookOpen, ChevronDown, User2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { KnowledgeItem } from '@/lib/knowledgeStore';

// Luxury SVG icons per topic
const IconSTAM = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
    <path d="M12 2L4 6v12l8 4 8-4V6l-8-4z" strokeLinejoin="round" />
    <path d="M8 10h8M8 14h5" strokeLinecap="round" />
  </svg>
);
const IconKashrut = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
    <circle cx="12" cy="12" r="9" /><path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconMikveh = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
    <path d="M3 17c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0" />
    <path d="M3 13c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0" />
    <path d="M12 3v7" strokeLinecap="round" /><circle cx="12" cy="8" r="2" />
  </svg>
);
const IconGemach = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);
const IconMarriage = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" strokeLinecap="round" />
    <circle cx="9" cy="10" r="1" fill="currentColor" /><circle cx="15" cy="10" r="1" fill="currentColor" />
  </svg>
);
const IconMourning = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
    <path d="M12 2v2M12 20v2M4 12H2M22 12h-2" strokeLinecap="round" />
    <circle cx="12" cy="12" r="5" /><path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconCourt = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
    <path d="M3 21h18M5 21V7l7-4 7 4v14" strokeLinejoin="round" />
    <path d="M9 21v-4h6v4M9 10h1M14 10h1M9 14h1M14 14h1" strokeLinecap="round" />
  </svg>
);
const IconCounseling = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
    <circle cx="9" cy="7" r="3" /><circle cx="15" cy="7" r="3" />
    <path d="M3 21v-2a4 4 0 014-4h2" strokeLinecap="round" />
    <path d="M21 21v-2a4 4 0 00-4-4h-2" strokeLinecap="round" />
    <path d="M12 13v3m0 0l-2 2m2-2l2 2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const topicCards = [
  { id: 'סת"ם', label: 'סת"ם', Icon: IconSTAM, desc: 'מזוזות, תפילין, ספרי תורה', gradient: 'from-amber-600 to-amber-800' },
  { id: 'כשרות', label: 'כשרות', Icon: IconKashrut, desc: 'השגחה, בדיקות, שאלות', gradient: 'from-emerald-600 to-emerald-800' },
  { id: 'מקוואות', label: 'מקוואות', Icon: IconMikveh, desc: 'שעות, מיקום, הנחיות', gradient: 'from-sky-600 to-sky-800' },
  { id: 'גמ"חים', label: 'גמ"חים', Icon: IconGemach, desc: 'ציוד, ביגוד, מזון, שמחות', gradient: 'from-rose-500 to-rose-700' },
  { id: 'נישואין', label: 'נישואין', Icon: IconMarriage, desc: 'רישום, הכנה, ייעוץ', gradient: 'from-pink-500 to-pink-700' },
  { id: 'פטירה ואבלות', label: 'פטירה ואבלות', Icon: IconMourning, desc: 'חברה קדישא, ליווי', gradient: 'from-slate-500 to-slate-700' },
  { id: 'בית דין', label: 'בית הדין', Icon: IconCourt, desc: 'ממונות, בוררות, דין תורה', gradient: 'from-indigo-600 to-indigo-800' },
  { id: 'ייעוץ נישואין', label: 'ייעוץ זוגי', Icon: IconCounseling, desc: 'ייעוץ משפחתי ותמיכה', gradient: 'from-teal-500 to-teal-700' },
];

const InfoCard = ({ item }: { item: KnowledgeItem }) => (
  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
    className="bg-card rounded-2xl shadow-card border border-border overflow-hidden hover:shadow-elevated transition-all duration-300 group">
    {item.image_url && (
      <div className="h-36 overflow-hidden">
        <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      </div>
    )}
    <div className="p-4">
      {item.subcategory && (
        <span className="inline-block bg-accent/10 text-accent text-[10px] font-bold px-2 py-0.5 rounded-full mb-2">{item.subcategory}</span>
      )}
      <h3 className="font-display font-black text-foreground text-sm mb-1.5">{item.title}</h3>
      <p className="text-muted-foreground text-xs leading-relaxed mb-3">{item.content}</p>
      <div className="space-y-1.5">
        {item.contact_name && (
          <div className="flex items-center gap-1.5 text-xs text-foreground">
            <User2 className="w-3 h-3 text-primary" />
            <span className="font-bold">{item.contact_name}</span>
          </div>
        )}
        {item.phone && (
          <a href={`tel:${item.phone}`} className="flex items-center gap-1.5 text-xs text-primary font-mono font-bold hover:text-teal-dark transition-colors" dir="ltr">
            <Phone className="w-3 h-3" /> {item.phone}
          </a>
        )}
        {item.address && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" /> {item.address}
          </div>
        )}
      </div>
    </div>
  </motion.div>
);

const ReligiousInfoStrip = () => {
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [activeSubcat, setActiveSubcat] = useState<string | null>(null);

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

  const activeItems = activeTopic
    ? knowledge.filter(k => k.category === activeTopic && (!activeSubcat || k.subcategory === activeSubcat))
    : [];

  const subcategories = activeTopic
    ? [...new Set(knowledge.filter(k => k.category === activeTopic && k.subcategory).map(k => k.subcategory!))]
    : [];

  return (
    <section className="py-14" id="religious-info">
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-display font-black text-foreground mb-3 tracking-tight">מידע דת וקהילה</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">כל השירותים הדתיים והקהילתיים בחצור הגלילית</p>
          <div className="h-1 bg-gradient-gold max-w-24 mx-auto rounded-full mt-4" />
        </motion.div>

        {loading ? (
          <div className="text-center py-8">
            <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
              {topicCards.map((topic, i) => {
                const isActive = activeTopic === topic.id;
                return (
                  <motion.button key={topic.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }} transition={{ delay: i * 0.05, type: 'spring', bounce: 0.3 }}
                    whileHover={{ y: -4, scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => { setActiveTopic(isActive ? null : topic.id); setActiveSubcat(null); }}
                    className={`relative p-3 rounded-2xl text-center transition-all duration-300 border ${
                      isActive ? 'bg-card shadow-elevated border-primary/30 ring-2 ring-primary/20' : 'bg-card shadow-card border-border hover:shadow-elevated hover:border-primary/15'
                    }`}>
                    <div className={`mx-auto mb-2 w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${topic.gradient} text-white shadow-sm`}>
                      <topic.Icon />
                    </div>
                    <div className="font-display font-black text-foreground text-xs leading-tight">{topic.label}</div>
                    <div className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{topic.desc}</div>
                    {isActive && <motion.div layoutId="topic-indicator" className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-1 bg-primary rounded-full" />}
                  </motion.button>
                );
              })}
            </div>

            <AnimatePresence>
              {activeTopic && subcategories.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap justify-center gap-2 mb-6">
                  <button onClick={() => setActiveSubcat(null)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${!activeSubcat ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/30'}`}>
                    הכל
                  </button>
                  {subcategories.map(sub => (
                    <button key={sub} onClick={() => setActiveSubcat(activeSubcat === sub ? null : sub)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${activeSubcat === sub ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/30'}`}>
                      {sub}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {activeTopic && (
                <motion.div key={activeTopic + (activeSubcat || '')} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }} className="overflow-hidden">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pb-4">
                    {activeItems.length > 0 ? activeItems.map((item, i) => (
                      <motion.div key={item.id} transition={{ delay: i * 0.05 }}><InfoCard item={item} /></motion.div>
                    )) : (
                      <div className="col-span-full text-center py-8">
                        <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground text-sm">אין מידע זמין בקטגוריה זו.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!activeTopic && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {knowledge.slice(0, 9).map((item, i) => (
                  <motion.div key={item.id} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                    <InfoCard item={item} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default ReligiousInfoStrip;
